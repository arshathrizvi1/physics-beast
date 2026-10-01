import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\api\zoom\webhook\route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'let secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "f7GsL3bNQS2T9x4U45Zltw";'
replacement = 'let secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "5QPmp_3gSyWDinZnR2I3lQ";'

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated secret token fallback!")
