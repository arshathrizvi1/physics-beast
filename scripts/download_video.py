#!/usr/bin/env python3
"""
Universal Resilient Video Downloader for Brilliant Academy
Handles YouTube bot-detection, Zoom cloud recordings (with passcodes & Playwright fallback), and direct video streams.
"""

import sys
import os
import subprocess
import json
import urllib.request

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

def try_direct_curl(url, headers=None, desc="Direct Download"):
    print(f"\n[Downloader] >> Attempting direct download: {desc}...")
    cmd = ["curl", "-L", "-sS", "-o", "/tmp/video.mp4"]
    if headers:
        for k, v in headers.items():
            cmd.extend(["-H", f"{k}: {v}"])
    cmd.append(url)
    res = subprocess.run(cmd)
    if res.returncode == 0 and os.path.exists("/tmp/video.mp4") and os.path.getsize("/tmp/video.mp4") > 1000:
        size_mb = os.path.getsize("/tmp/video.mp4") / 1024 / 1024
        print(f"[Downloader] ✅ Success with {desc}! File size: {size_mb:.1f} MB")
        return True
    if os.path.exists("/tmp/video.mp4"):
        try: os.remove("/tmp/video.mp4")
        except: pass
    return False

def handle_zoom(url, password):
    print(f"\n[Downloader] 🎥 Zoom URL detected: {url}")
    if password:
        print("[Downloader] 🔑 Using provided passcode for Zoom extraction.")

    # 1. If it's a direct token URL from Zoom Webhook (e.g. download_token or access_token)
    if "access_token=" in url or "download_token=" in url:
        print("[Downloader] ⚡ Direct Zoom webhook download token detected.")
        if try_direct_curl(url, desc="Zoom Cloud Recording Direct Stream"):
            return True

    # 2. First attempt: yt-dlp Zoom extractor with --video-password
    pw_args = ["--video-password", password] if password else []
    zoom_strat1 = [
        "yt-dlp",
        "--no-playlist",
        "-S", "res:720,ext:mp4:m4a",
        "--merge-output-format", "mp4",
        "--retries", "5",
        "--fragment-retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(zoom_strat1, "Zoom yt-dlp extractor"):
        return True

    # 3. Second attempt: Run Playwright Zoom Extractor
    script_dir = os.path.dirname(os.path.abspath(__file__))
    zoom_extractor = os.path.join(script_dir, "zoom_extractor.js")
    if os.path.exists(zoom_extractor):
        print("[Downloader] 🔍 Running Playwright Headless Browser for Zoom...")
        try:
            res = subprocess.run(
                ["node", zoom_extractor, url, password or ""],
                capture_output=True,
                text=True,
                timeout=60
            )
            stdout = res.stdout.strip()
            lines = stdout.splitlines()
            if lines:
                last_line = lines[-1].strip()
                try:
                    data = json.loads(last_line)
                    media_url = data.get("url")
                    if media_url and media_url.startswith("http"):
                        print("[Downloader] ✅ Zoom Extractor succeeded! Direct stream located.")
                        headers = {}
                        if data.get("userAgent"):
                            headers["User-Agent"] = data["userAgent"]
                        if data.get("cookies"):
                            headers["Cookie"] = data["cookies"]
                        headers["Referer"] = "https://zoom.us/"

                        # Try yt-dlp with extracted headers
                        ext_cmd = [
                            "yt-dlp",
                            "-S", "res:720,ext:mp4:m4a",
                            "--merge-output-format", "mp4",
                            "--retries", "5",
                            "-o", "/tmp/video.mp4"
                        ]
                        for k, v in headers.items():
                            ext_cmd.extend(["--add-header", f"{k}: {v}"])
                        ext_cmd.append(media_url)

                        if try_download(ext_cmd, "Extracted Zoom Stream via yt-dlp"):
                            return True

                        # Try direct curl with extracted headers
                        if try_direct_curl(media_url, headers, "Extracted Zoom Stream via curl"):
                            return True
                except json.JSONDecodeError:
                    print(f"[Downloader] ⚠️ Extractor output was not valid JSON: {stdout}")
        except Exception as e:
            print(f"[Downloader] ⚠️ Playwright extractor error: {e}")

    # 4. Third attempt: Fallback generic yt-dlp
    fallback_cmd = [
        "yt-dlp",
        "--no-playlist",
        "--format", "best[ext=mp4]/best",
        "--retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(fallback_cmd, "Zoom Generic Fallback"):
        return True

    return False

def handle_youtube(url, password):
    cookies_file = "/tmp/cookies.txt"
    has_cookies = os.path.exists(cookies_file) and os.path.getsize(cookies_file) > 10
    pw_args = ["--video-password", password] if password else []

    # ── Strategy 1: iOS Mobile Client (Bypasses Datacenter IP Bot Checks) ──
    strat1 = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=ios",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--retries", "5",
        "--fragment-retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(strat1, "iOS Client (No Botguard / Datacenter Lock)"):
        return True

    # ── Strategy 2: Mobile Web (mweb) Client ──
    strat2 = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=mweb",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--retries", "5",
        "--fragment-retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(strat2, "Mobile Web (mweb) Client"):
        return True

    # ── Strategy 3: TV Embedded Client ──
    strat3 = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=tv_embedded,tv",
        "-f", "best[height<=720]/best",
        "--merge-output-format", "mp4",
        "--retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(strat3, "TV Embedded Client"):
        return True

    # ── Strategy 4: Web/Android with PO Token Provider (if running) ──
    strat4 = [
        "yt-dlp",
        "--no-playlist",
        "--extractor-args", "youtube:player_client=web,android",
        "-S", "res:720,vcodec:h264,ext:mp4:m4a",
        "--merge-output-format", "mp4",
        "--retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(strat4, "Web/Android Client via PO Token Provider"):
        return True

    # ── Strategy 5: With Cookies (if available) ──
    if has_cookies:
        strat5 = [
            "yt-dlp",
            "--no-playlist",
            "--cookies", cookies_file,
            "--extractor-args", "youtube:player_client=web,mweb",
            "-S", "res:720,vcodec:h264,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "--retries", "5",
            "-o", "/tmp/video.mp4"
        ] + pw_args + [url]
        if try_download(strat5, "Web Client with Cookies"):
            return True

    # ── Strategy 6: Universal Any Client Fallback ──
    strat6 = [
        "yt-dlp",
        "--no-playlist",
        "--format", "best[ext=mp4]/best",
        "--retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(strat6, "Universal Generic Fallback"):
        return True

    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python download_video.py <URL> [PASSWORD]")
        sys.exit(1)

    url = sys.argv[1].strip()
    password = sys.argv[2].strip() if len(sys.argv) > 2 and sys.argv[2] else ""

    print(f"[Downloader] 🚀 Starting download for: {url}")

    # Determine platform
    is_zoom = "zoom.us" in url
    is_youtube = "youtube.com" in url or "youtu.be" in url

    if is_zoom:
        success = handle_zoom(url, password)
    elif is_youtube:
        success = handle_youtube(url, password)
    else:
        # Generic direct link or MP4
        print("[Downloader] 🌐 Generic video link detected, attempting direct download...")
        success = try_download([
            "yt-dlp",
            "--no-playlist",
            "-S", "res:720,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "--retries", "5",
            "-o", "/tmp/video.mp4",
            url
        ], "Generic yt-dlp")
        if not success:
            success = try_direct_curl(url, desc="Generic Direct Curl")

    if success:
        print("\n[Downloader] 🎉 Download successfully finished!")
        sys.exit(0)
    else:
        print(f"\n[Downloader] ❌ All download strategies failed for: {url}")
        sys.exit(1)

if __name__ == "__main__":
    main()
