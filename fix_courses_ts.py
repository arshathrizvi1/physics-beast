import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\courses\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("user.courseAccess", "(user as any).courseAccess")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("courses/page.tsx fixed!")
