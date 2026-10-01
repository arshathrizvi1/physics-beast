import sys
import os

path = r'C:\Projects\Brilliant Academy\physics-beast\src\components\ZoomSettingsModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "https://brilliantacademy.vercel.app"
replacement = "https://brillliantacademy.site"

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated ZoomSettingsModal.tsx")
