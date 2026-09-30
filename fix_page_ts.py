import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const stopWheel = (e: WheelEvent) => {", "const stopWheel = (e: Event) => {")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("page.tsx stopWheel type fixed!")
