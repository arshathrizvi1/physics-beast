import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'import Image from "next/image";' not in content:
    content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport Image from "next/image";')

# Replace img with Image
target_img = r'<img\s+src="(https://images\.unsplash\.com/[^"]+)"\s+alt="([^"]+)"\s+className="([^"]+)"\s*/>'
repl_img = r'<Image src="\1" alt="\2" className="\3" width={800} height={800} priority />'
content = re.sub(target_img, repl_img, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated page.tsx to use next/image")
