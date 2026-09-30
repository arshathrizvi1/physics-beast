import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "const presenceRef = doc(db, 'presence', _);"
new_str = "const presenceRef = doc(db, 'presence', \${currentVideo.id}_\);"

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed template literal")
else:
    print("Could not find the butchered string")
