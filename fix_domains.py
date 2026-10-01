import sys

# 1. Fix the hardcoded vercel fetch URL
path_course = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path_course, 'r', encoding='utf-8') as f:
    content_course = f.read()

content_course = content_course.replace(
    '`https://brilliantacademy.vercel.app/api/bunny/sign?',
    '`/api/bunny/sign?'
)

with open(path_course, 'w', encoding='utf-8') as f:
    f.write(content_course)

# 2. Add brillliantacademy.site to passkey origins
path_passkey = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\passkey-config.ts'
with open(path_passkey, 'r', encoding='utf-8') as f:
    content_passkey = f.read()

if 'brillliantacademy.site' not in content_passkey:
    content_passkey = content_passkey.replace(
        "'https://brilliantacademy.vercel.app'",
        "'https://brilliantacademy.vercel.app',\n  'https://brillliantacademy.site',\n  'https://www.brillliantacademy.site'"
    )
    content_passkey = content_passkey.replace(
        "'brilliantacademy.vercel.app'",
        "'brillliantacademy.site'"
    )

with open(path_passkey, 'w', encoding='utf-8') as f:
    f.write(content_passkey)

print("Fixed hardcoded domains")
