#!/usr/bin/env python3
"""
Multi-Quality HLS Generator for Brilliant Academy
Converts an input MP4 video into adaptive multi-variant HLS:
- 720p (High Quality)
- 480p (Standard Quality)
- 360p (Data Saver / Mobile)
Generates master.m3u8 and ts segments for Cloudflare R2 / S3 storage.
"""

import sys
import os
import subprocess
import shutil

def run_command(cmd, desc):
    print(f"[HLS] >> Running: {desc}...")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"[HLS] ⚠️ {desc} failed (code {result.returncode}): {result.stderr[-300:]}")
        return False
    print(f"[HLS] ✅ {desc} finished successfully.")
    return True

def generate_hls(input_path, output_dir):
    if not os.path.exists(input_path):
        print(f"[HLS] ❌ Error: Input file '{input_path}' not found.")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)
    
    stream_720 = os.path.join(output_dir, "stream_720p.m3u8")
    stream_480 = os.path.join(output_dir, "stream_480p.m3u8")
    stream_360 = os.path.join(output_dir, "stream_360p.m3u8")
    master_m3u8 = os.path.join(output_dir, "master.m3u8")

    # 1. 720p Stream (Try fast stream copy first, fallback to ultrafast libx264)
    hls_720_fast = [
        "ffmpeg", "-y", "-i", input_path,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "128k", "-ac", "2",
        "-f", "hls",
        "-hls_time", "10",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
        "-hls_segment_filename", os.path.join(output_dir, "segment_720p_%04d.ts"),
        stream_720
    ]
    
    success_720 = run_command(hls_720_fast, "720p fast copy")
    if not success_720 or not os.path.exists(stream_720):
        print("[HLS] Attempting 720p transcode fallback...")
        hls_720_transcode = [
            "ffmpeg", "-y", "-i", input_path,
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-ac", "2",
            "-f", "hls",
            "-hls_time", "10",
            "-hls_playlist_type", "vod",
            "-hls_flags", "independent_segments",
            "-hls_segment_filename", os.path.join(output_dir, "segment_720p_%04d.ts"),
            stream_720
        ]
        run_command(hls_720_transcode, "720p transcode fallback")

    # 2. 480p Stream (Downscaled)
    hls_480 = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", "scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-ac", "2",
        "-f", "hls",
        "-hls_time", "10",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
        "-hls_segment_filename", os.path.join(output_dir, "segment_480p_%04d.ts"),
        stream_480
    ]
    run_command(hls_480, "480p stream generation")

    # 3. 360p Stream (Downscaled for mobile / low bandwidth)
    hls_360 = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", "scale=w=640:h=360:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "64k", "-ac", "2",
        "-f", "hls",
        "-hls_time", "10",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
        "-hls_segment_filename", os.path.join(output_dir, "segment_360p_%04d.ts"),
        stream_360
    ]
    run_command(hls_360, "360p stream generation")

    # 4. Master Playlist Generation
    variants = []
    if os.path.exists(stream_720):
        variants.append('#EXT-X-STREAM-INF:BANDWIDTH=2200000,RESOLUTION=1280x720,NAME="720p"\nstream_720p.m3u8')
    if os.path.exists(stream_480):
        variants.append('#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,NAME="480p"\nstream_480p.m3u8')
    if os.path.exists(stream_360):
        variants.append('#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360,NAME="360p"\nstream_360p.m3u8')

    if not variants:
        print("[HLS] ❌ Error: No HLS streams were produced.")
        sys.exit(1)

    master_content = "#EXTM3U\n#EXT-X-VERSION:3\n" + "\n".join(variants) + "\n"
    with open(master_m3u8, "w", encoding="utf-8") as f:
        f.write(master_content)

    file_count = len(os.listdir(output_dir))
    print(f"[HLS] 🎉 Master playlist generated with {len(variants)} quality levels ({file_count} total files).")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_hls.py <input_mp4> <output_dir>")
        sys.exit(1)
    
    generate_hls(sys.argv[1], sys.argv[2])
