import requests
import os

LIBRARY_ID = '764707'
API_KEY = '9b83437e-bb35-4393-ada4af55c302-f1da-47cd'

def create_bunny_video(title):
    url = f'https://video.bunnycdn.com/library/{LIBRARY_ID}/videos'
    headers = {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    }
    payload = {'title': title}
    response = requests.post(url, json=payload, headers=headers)
    return response.json()['guid']

def upload_to_bunny(video_id, filename):
    url = f'https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{video_id}'
    file_size = str(os.path.getsize(filename))
    headers = {
        'AccessKey': API_KEY,
        'accept': 'application/json',
        'Content-Type': 'application/octet-stream',
        'Content-Length': file_size
    }
    with open(filename, 'rb') as f:
        requests.put(url, headers=headers, data=f)

if __name__ == '__main__':
    bunny_video_id = create_bunny_video('Oracle 1-Second Upload Test')
    upload_to_bunny(bunny_video_id, 'sample.mp4')
    print('SUCCESS')
