import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\api\zoom\webhook\route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "adminDb.FieldValue.serverTimestamp()"
replacement = "Date.now()"

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched route.ts successfully!")
else:
    print("Already patched.")
