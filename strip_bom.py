import os

files = [
    r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx',
    r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx',
    r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx',
    r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\page.tsx'
]

for path in files:
    if os.path.exists(path):
        with open(path, 'rb') as f:
            content = f.read()
        if content.startswith(b'\xef\xbb\xbf'):
            print(f"Stripping BOM from {path}")
            with open(path, 'wb') as f:
                f.write(content[3:])
        else:
            print(f"No BOM in {path}")
