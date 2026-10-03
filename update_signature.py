import re

# 1. Update SecureVideoActivity
path1 = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\SecureVideoActivity.java'
with open(path1, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the old debug signature with the new official Release signature
old_sig = '05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34'
new_sig = '2D:5A:49:71:E4:A2:72:20:52:91:C4:EC:4F:28:53:5F:C6:7F:D5:61:4E:06:CE:58:85:68:36:7E:62:F4:66:C4'

content = content.replace(old_sig, new_sig)

with open(path1, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update assetlinks.json
path2 = r'C:\Projects\Brilliant Academy\physics-beast\public\.well-known\assetlinks.json'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace(old_sig, new_sig)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

print("Successfully injected the new Release Signature into the app and assetlinks!")
