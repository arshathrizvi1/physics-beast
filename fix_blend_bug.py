import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove mix-blend-screen which causes the bounding box rendering bug on Android WebViews
content = content.replace('mix-blend-screen', '')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed mix-blend-screen rendering bug!")
