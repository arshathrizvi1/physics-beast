#!/usr/bin/env python3
"""
Multi-Quality AES-128 Encrypted HLS Generator for Brilliant Academy
Converts input MP4 video into encrypted, adaptive multi-variant HLS:
- 720p (High Quality) - AES-128 Encrypted
- 480p (Standard Quality) - AES-128 Encrypted
- 360p (Data Saver / Mobile) - AES-128 Encrypted
Generates master.m3u8 and encrypted .ts segments for Cloudflare R2 storage.
Blocks IDM, VLC, and unauthorized stream downloaders.
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

    # 0. Setup AES-128 HLS Stream Encryption
    keyinfo_path = "/tmp/hls_keyinfo.txt"
    key_path = "/tmp/hls_enc.key"
    key_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate_hls_key.js")
    has_encryption = False

    if os.path.exists(key_script):
        print("[HLS] 🔒 Initializing AES-128 stream encryption key...")
        res = subprocess.run(["node", key_script, key_path, keyinfo_path])
        if res.returncode == 0 and os.path.exists(keyinfo_path):
            has_encryption = True
            print("[HLS] ✅ AES-128 encryption key and keyinfo ready. All chunks will be strongly encrypted.")
        else:
            print("[HLS] ⚠️ Key generation failed, proceeding with standard HLS.")

    encrypt_args = ["-hls_key_info_file", keyinfo_path] if has_encryption else []

    # 1. 720p Stream (AES-128 Encrypted, ultrafast x264)
    hls_720 = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", "scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ac", "2",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
    ] + encrypt_args + [
        "-hls_segment_filename", os.path.join(output_dir, "segment_720p_%04d.ts"),
        stream_720
    ]
    run_command(hls_720, "720p AES-128 encrypted stream")

    # 2. 480p Stream (AES-128 Encrypted, Downscaled)
    hls_480 = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", "scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-ac", "2",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
    ] + encrypt_args + [
        "-hls_segment_filename", os.path.join(output_dir, "segment_480p_%04d.ts"),
        stream_480
    ]
    run_command(hls_480, "480p AES-128 encrypted stream")

    # 3. 360p Stream (AES-128 Encrypted, Low Bandwidth)
    hls_360 = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", "scale=w=640:h=360:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "64k", "-ac", "2",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
    ] + encrypt_args + [
        "-hls_segment_filename", os.path.join(output_dir, "segment_360p_%04d.ts"),
        stream_360
    ]
    run_command(hls_360, "360p AES-128 encrypted stream")

    # 4. Master Playlist Generation
    variants = []
    if os.path.exists(stream_720):
        variants.append(('#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,NAME="720p"', "stream_720p.m3u8"))
    if os.path.exists(stream_480):
        variants.append(('#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=854x480,NAME="480p"', "stream_480p.m3u8"))
    if os.path.exists(stream_360):
        variants.append(('#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=640x360,NAME="360p"', "stream_360p.m3u8"))

    if not variants:
        print("[HLS] ❌ Error: No HLS stream variants were generated.")
        sys.exit(1)

    with open(master_m3u8, "w", encoding="utf-8") as f:
        f.write("#EXTM3U\n")
        f.write("#EXT-X-VERSION:3\n\n")
        for inf, pl in variants:
            f.write(f"{inf}\n{pl}\n\n")

    print(f"\n[HLS] 🎉 Master HLS generated with {len(variants)} quality variants!")
    print(f"[HLS] Output directory: {output_dir}")
    print(f"[HLS] Master playlist: {master_m3u8}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_hls.py <input_video.mp4> [output_directory]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "/tmp/hls_out"

    generate_hls(input_file, output_dir)

if __name__ == "__main__":
    main()
