import requests

LIBRARY_ID = '764707'
API_KEY = '9b83437e-bb35-4393-ada4af55c302-f1da-47cd'

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
    bunny_video_id = create_bunny_video('Test Oracle Upload')
    upload_to_bunny(bunny_video_id, 'test_video.mp4')
    print(f'SUCCESS! Video ID: {bunny_video_id}')
