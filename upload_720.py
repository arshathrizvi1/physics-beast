import requests, os
LIBRARY_ID = '764707'
API_KEY = '9b83437e-bb35-4393-ada4af55c302-f1da-47cd'
filename = 'test_video_720.mp4'
title = 'Oracle WARP 720p Bypass Test'

res = requests.post(f'https://video.bunnycdn.com/library/{LIBRARY_ID}/videos', 
                    json={'title': title}, 
                    headers={'AccessKey': API_KEY, 'accept': 'application/json', 'Content-Type': 'application/json'})
vid = res.json()['guid']
print(f'Created video ID: {vid}')

sz = str(os.path.getsize(filename))
with open(filename, 'rb') as f:
    requests.put(f'https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/{vid}', 
                 headers={'AccessKey': API_KEY, 'accept': 'application/json', 'Content-Type': 'application/octet-stream', 'Content-Length': sz}, 
                 data=f)
print('SUCCESS')
