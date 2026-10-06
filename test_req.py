import urllib.request
import urllib.error

url = "https://www.brillliantacademy.site/loaderio-9c16305eee6db90b2415983ab899b6d5.txt"
try:
    response = urllib.request.urlopen(url)
    print("Status:", response.status)
    print("Content:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
except Exception as e:
    print("Error:", e)
