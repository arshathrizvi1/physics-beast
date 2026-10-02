import re

# 1. Fix capacitor.config.json
cap_path = r'C:\Projects\Brilliant Academy\physics-beast\capacitor.config.json'
with open(cap_path, 'r', encoding='utf-8') as f:
    cap_content = f.read()

cap_content = cap_content.replace('"url": "https://brillliantacademy.site",', '"url": "https://www.brillliantacademy.site",')
cap_content = cap_content.replace('"origin": "https://brillliantacademy.site"', '"origin": "https://www.brillliantacademy.site"')

with open(cap_path, 'w', encoding='utf-8') as f:
    f.write(cap_content)

# 2. Fix AndroidManifest.xml
man_path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\AndroidManifest.xml'
with open(man_path, 'r', encoding='utf-8') as f:
    man_content = f.read()

man_content = man_content.replace('android:host="brilliantacademy.vercel.app"', 'android:host="www.brillliantacademy.site"')

with open(man_path, 'w', encoding='utf-8') as f:
    f.write(man_content)

print("Fixed Android Configuration for the new domain!")
