import sys
path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\live\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if "useSearchParams" not in content[:1000]:
    content = content.replace('import { useRouter } from "next/navigation";', 'import { useRouter, useSearchParams } from "next/navigation";')
    content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter, useSearchParams } from 'next/navigation';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
