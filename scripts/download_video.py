#!/usr/bin/env python3
"""
Robust Video Downloader for Brilliant Academy
Handles YouTube bot-detection, cookie rotation, and client fallbacks automatically.
"""

import sys
import os
import subprocess

def try_download(cmd, desc):
    print(f"\n[Downloader] >> Attempting: {desc}...")
    res = subprocess.run(cmd)
    if res.returncode == 0 and os.path.exists("/tmp/video.mp4") and os.path.getsize("/tmp/video.mp4") > 1000:
        size_mb = os.path.getsize("/tmp/video.mp4") / 1024 / 1024
        print(f"[Downloader] ✅ Success with {desc}! File size: {size_mb:.1f} MB")
        return True
    print(f"[Downloader] ⚠️ Failed attempt: {desc}")
    if os.path.exists("/tmp/video.mp4"):
        try: os.remove("/tmp/video.mp4")
        except: pass
    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python download_video.py <URL> [PASSWORD]")
        sys.exit(1)

    url = sys.argv[1]
    password = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else ""
    cookies_file = "/tmp/cookies.txt"
    has_cookies = os.path.exists(cookies_file) and os.path.getsize(cookies_file) > 10

    pw_args = ["--video-password", password] if password else []
    
    # ── Strategy 1: Android Client (No SABR lock, works without cookies) ──
    strat1 = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=android,web",
        "-S", "res:720,vcodec:h264,ext:mp4:m4a",
        "--merge-output-format", "mp4",
        "--retries", "5",
        "--fragment-retries", "5",
        "--add-header", "Accept-Language:en-US,en;q=0.9",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(strat1, "Android/Web Player Client (Clean)"):
        sys.exit(0)

    # ── Strategy 2: With Cookies (if available) ──
    if has_cookies:
        strat2 = [
            "yt-dlp",
            "--no-playlist",
            "--cookies", cookies_file,
            "--extractor-args", "youtube:player_client=web,mweb",
            "-S", "res:720,vcodec:h264,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "--retries", "5",
            "-o", "/tmp/video.mp4"
        ] + pw_args + [url]
        if try_download(strat2, "Web Client with Cookies"):
            sys.exit(0)

    # ── Strategy 3: Best Available Format (Universal Fallback) ──
    strat3 = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=tv,android",
        "--format", "best[height<=720]/best",
        "--merge-output-format", "mp4",
        "--retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(strat3, "Universal TV/Android Fallback"):
        sys.exit(0)

    print("\n[Downloader] ❌ All download strategies failed for:", url)
    sys.exit(1)

if __name__ == "__main__":
    main()
