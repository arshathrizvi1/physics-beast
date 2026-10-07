import sys
import os
import requests
import yt_dlp
import time

LIBRARY_ID = "764707"
API_KEY = "9b83437e-bb35-4393-ada4af55c302-f1da-47cd"

def download_video(url):
    print(f"Downloading video from {url}...")
    output_template = "video_%(id)s.%(ext)s"
    ydl_opts = {
        
        
        'cookiefile': 'cookies.txt',
        'extractor_args': {'youtube': ['player_client=web_creator,ios,tv,web']}, 'http_headers': {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'},
        'format': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
        'outtmpl': output_template,
        'merge_output_format': 'mp4',
        'restrictfilenames': True,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        if not filename.endswith('.mp4'):
            filename = filename.rsplit('.', 1)[0] + '.mp4'
        title = info.get('title', 'Untitled Video')
        return filename, title

def create_bunny_video(title):
    print(f"Creating video entry in BunnyCDN for: {title}")
    url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos"
    headers = {
        "AccessKey": API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json"
    }
    payload = {"title": title}
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()['guid']

def upload_to_bunny(video_id, filename):
    print(f"Uploading {filename} to BunnyCDN (Video ID: {video_id})...")
    url = f"https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{video_id}"
    headers = {
        "AccessKey": API_KEY,
        "accept": "application/json"
    }
    with open(filename, 'rb') as f:
        response = requests.put(url, headers=headers, data=f)
    response.raise_for_status()
    print("Upload complete!")

def main():
    if len(sys.argv) < 2:
        print("Usage: python oracle_uploader.py <VIDEO_URL>")
        sys.exit(1)
        
    url = sys.argv[1]
    
    try:
        filename, title = download_video(url)
        bunny_video_id = create_bunny_video(title)
        
        upload_to_bunny(bunny_video_id, filename)
        
        print(f"Cleaning up local file: {filename}")
        if os.path.exists(filename):
            os.remove(filename)
            
        print("="*40)
        print("SUCCESS! Video is now processing on BunnyCDN.")
        print(f"Video ID: {bunny_video_id}")
        print("="*40)
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()
