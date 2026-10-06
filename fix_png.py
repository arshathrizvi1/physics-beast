import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\build.gradle'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add aaptOptions { cruncherEnabled = false } inside the android {} block
if 'aaptOptions' not in content:
    content = content.replace('android {', "android {\n    aaptOptions {\n        cruncherEnabled = false\n    }")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Disabled AAPT2 PNG Compression!")
