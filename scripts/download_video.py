#!/usr/bin/env python3
"""
Universal Resilient Video Downloader for Brilliant Academy
Handles YouTube bot-detection with Proof-of-Origin (PO) Token provider,
Zoom cloud recordings (with passcodes & Playwright fallback), and direct video streams.
"""

import sys
import os
import subprocess
import json
import urllib.request
import socket

def get_ytdlp_base_cmd():
    """
    Prefer 'python3 -m yt_dlp' so that all pip-installed plugins (such as bgutil-ytdlp-pot-provider)
    are loaded natively into the extractor lifecycle. Fallback to 'yt-dlp' binary if needed.
    """
    try:
        res = subprocess.run([sys.executable, "-m", "yt_dlp", "--version"], capture_output=True, text=True)
        if res.returncode == 0:
            return [sys.executable, "-m", "yt_dlp"]
    except Exception:
        pass
    return ["yt-dlp"]

def is_port_open(port, timeout=0.4):
    """Check if a local port is listening."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect(('127.0.0.1', port))
        s.close()
        return True
    except Exception:
        return False

def try_download(cmd, desc):
    print(f"\n[Downloader] >> Attempting: {desc}...")
    try:
        res = subprocess.run(cmd)
        if res.returncode == 0 and os.path.exists("/tmp/video.mp4") and os.path.getsize("/tmp/video.mp4") > 1000:
            size_mb = os.path.getsize("/tmp/video.mp4") / 1024 / 1024
            print(f"[Downloader] ✅ Success with {desc}! File size: {size_mb:.1f} MB")
            return True
    except Exception as e:
        print(f"[Downloader] Command error during {desc}: {e}")

    print(f"[Downloader] ⚠️ Failed attempt: {desc}")
    if os.path.exists("/tmp/video.mp4"):
        try: os.remove("/tmp/video.mp4")
        except Exception: pass
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
        except Exception: pass
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

    base_cmd = get_ytdlp_base_cmd()
    pw_args = ["--video-password", password] if password else []

    # 2. First attempt: yt-dlp Zoom extractor with --video-password
    zoom_strat1 = base_cmd + [
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
                        ext_cmd = base_cmd + [
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
    fallback_cmd = base_cmd + [
        "--no-playlist",
        "--format", "best[ext=mp4]/best",
        "--retries", "5",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]

    if try_download(fallback_cmd, "Zoom Generic Fallback"):
        return True

    return False

def handle_youtube(url, password):
    base_cmd = get_ytdlp_base_cmd()
    cookies_file = "/tmp/cookies.txt"
    has_cookies = os.path.exists(cookies_file) and os.path.getsize(cookies_file) > 10
    pw_args = ["--video-password", password] if password else []

    # Check for Proof-of-Origin Token Server (bgutil-pot)
    has_pot = is_port_open(4416)
    if has_pot:
        print("[Downloader] 🔑 BotGuard PO-Token Provider active on port 4416.")
    pot_args = ["--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"] if has_pot else []

    # Check for Deno JS engine
    has_deno = False
    try:
        if subprocess.run(["deno", "--version"], capture_output=True).returncode == 0:
            has_deno = True
            print("[Downloader] ⚡ Deno JS challenge runtime active.")
    except Exception:
        pass
    deno_args = ["--js-runtimes", "deno"] if has_deno else []

    # Check for Cloudflare WARP proxy
    has_warp = is_port_open(40000)
    warp_args = ["--proxy", "socks5://127.0.0.1:40000"] if has_warp else []

    # ── Strategy 1: Direct Clean IP + PO-Token Provider + Android/Web Client ──
    if has_pot:
        strat1 = base_cmd + [
            "--no-playlist",
            "--extractor-args", "youtube:player_client=web,android",
        ] + pot_args + deno_args + [
            "-S", "res:720,vcodec:h264,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "--retries", "3",
            "--fragment-retries", "3",
            "-o", "/tmp/video.mp4"
        ] + pw_args + [url]
        if try_download(strat1, "Direct IP + PO-Token Provider (Web/Android Client)"):
            return True

    # ── Strategy 2: Direct Clean IP + PO-Token Provider + Web Creator Client ──
    if has_pot:
        strat2 = base_cmd + [
            "--no-playlist",
            "--extractor-args", "youtube:player_client=web_creator",
        ] + pot_args + deno_args + [
            "-S", "res:720,vcodec:h264,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "--retries", "3",
            "-o", "/tmp/video.mp4"
        ] + pw_args + [url]
        if try_download(strat2, "Direct IP + PO-Token Provider (Web Creator Studio Client)"):
            return True

    # ── Strategy 3: Direct Clean IP + iOS/MWeb Client (Deno JS runtime) ──
    strat3 = base_cmd + [
        "--no-playlist",
        "--extractor-args", "youtube:player_client=ios,mweb",
    ] + deno_args + [
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--retries", "3",
        "--fragment-retries", "3",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]
    if try_download(strat3, "Direct Clean IP (iOS/MWeb Client + Deno JS)"):
        return True

    # ── Strategy 4: TV & Embedded Player Client (Bypasses BotGuard on Many Streams) ──
    strat4 = base_cmd + [
        "--no-playlist",
        "--extractor-args", "youtube:player_client=tv_embedded,tv",
        "-f", "best[height<=720]/best",
        "--merge-output-format", "mp4",
        "--retries", "3",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]
    if try_download(strat4, "TV / Embedded Client (Direct Clean IP)"):
        return True

    # ── Strategy 5: WARP Proxy + PO-Token Provider (If runner IP is rate limited) ──
    if has_warp and has_pot:
        strat5 = base_cmd + [
            "--no-playlist",
            "--extractor-args", "youtube:player_client=web,android",
        ] + pot_args + warp_args + deno_args + [
            "-S", "res:720,vcodec:h264,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "--retries", "3",
            "-o", "/tmp/video.mp4"
        ] + pw_args + [url]
        if try_download(strat5, "WARP Proxy + PO-Token Provider (Web/Android Client)"):
            return True

    # ── Strategy 6: WARP Proxy + iOS/MWeb Client ──
    if has_warp:
        strat6 = base_cmd + [
            "--no-playlist",
            "--extractor-args", "youtube:player_client=ios,mweb",
        ] + warp_args + deno_args + [
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "--retries", "3",
            "-o", "/tmp/video.mp4"
        ] + pw_args + [url]
        if try_download(strat6, "WARP Proxy (iOS/MWeb Client)"):
            return True

    # ── Strategy 7: Account Cookies (If configured and non-empty) ──
    if has_cookies:
        strat7 = base_cmd + [
            "--no-playlist",
            "--cookies", cookies_file,
            "--extractor-args", "youtube:player_client=web,mweb",
            "-S", "res:720,vcodec:h264,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "--retries", "3",
            "-o", "/tmp/video.mp4"
        ] + pw_args + [url]
        if try_download(strat7, "Web Client with Account Cookies"):
            return True

    # ── Strategy 8: Universal Generic Fallback ──
    strat8 = base_cmd + [
        "--no-playlist",
        "--format", "best[ext=mp4]/best",
        "--retries", "3",
        "-o", "/tmp/video.mp4"
    ] + pw_args + [url]
    if try_download(strat8, "Universal Generic Fallback"):
        return True

    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python download_video.py <URL> [PASSWORD]")
        sys.exit(1)

    url = sys.argv[1].strip()
    password = sys.argv[2].strip() if len(sys.argv) > 2 and sys.argv[2] else ""

    print(f"[Downloader] 🚀 Starting download for: {url}")

    is_zoom = "zoom.us" in url
    is_youtube = "youtube.com" in url or "youtu.be" in url

    if is_zoom:
        success = handle_zoom(url, password)
    elif is_youtube:
        success = handle_youtube(url, password)
    else:
        print("[Downloader] 🌐 Generic video link detected, attempting direct download...")
        base_cmd = get_ytdlp_base_cmd()
        success = try_download(base_cmd + [
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
