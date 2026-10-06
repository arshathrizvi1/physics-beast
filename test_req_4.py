import urllib.request
import urllib.error

url = "http://brillliantacademy.site/loaderio-9c16305eee6db90b2415983ab899b6d5.txt"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    print("Status:", response.status)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
except Exception as e:
    print("Error:", e)
