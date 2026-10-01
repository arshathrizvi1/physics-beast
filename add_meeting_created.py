import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\api\zoom\webhook\route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "if (body.event === 'meeting.started') {"
replacement = "if (body.event === 'meeting.started' || body.event === 'meeting.created') {"

if "|| body.event === 'meeting.created'" not in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated route.ts successfully!")
else:
    print("Already updated.")
