import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\live\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("user.displayName", "(user as any).displayName")
content = content.replace("user.phoneNumber", "(user as any).phoneNumber")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("live/page.tsx fixed!")
