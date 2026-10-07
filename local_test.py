import sys
import os
import requests
import subprocess
import json

LIBRARY_ID = '764707'
API_KEY = '9b83437e-bb35-4393-ada4af55c302-f1da-47cd'

def download_video(url):
    print(f'Downloading video from {url}...')
    output_template = 'video_%(id)s.%(ext)s'
    
    cmd = [
        'python', '-m', 'yt_dlp',
        '--extractor-args', 'youtube:player_client=android',
        '--format', '18/best',
        
        '--restrict-filenames',
        '--no-warnings',
        '--print', '%(filename)s|%(title)s',
        '-o', output_template,
        url
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error downloading video: {result.stderr}")
        sys.exit(1)
        
    output = result.stdout.strip().split('\n')[-1]
    filename, title = output.split('|', 1)
    
    if not filename.endswith('.mp4'):
        filename = filename.rsplit('.', 1)[0] + '.mp4'
        
    return filename, title

def create_bunny_video(title):
    print(f'Creating video entry in BunnyCDN for: {title}')
    url = f'https://video.bunnycdn.com/library/{LIBRARY_ID}/videos'
    headers = {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    }
    payload = {'title': title}
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()['guid']

def upload_to_bunny(video_id, filename):
    print(f'Uploading {filename} to BunnyCDN (Video ID: {video_id})...')
    url = f'https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{video_id}'
    headers = {
        'AccessKey': API_KEY,
        'accept': 'application/json'
    }
    with open(filename, 'rb') as f:
        response = requests.put(url, headers=headers, data=f)
    response.raise_for_status()
    print('Upload complete!')

if __name__ == '__main__':
    url = sys.argv[1]
    filename, title = download_video(url)
    bunny_video_id = create_bunny_video(title)
    upload_to_bunny(bunny_video_id, filename)
    print(f'SUCCESS! Video ID: {bunny_video_id}')
