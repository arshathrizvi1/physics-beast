import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\live\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """<Button type="submit" className="w-full" disabled={isSubmitting}>"""
repl = """<Button type="submit" className="flex-1" disabled={isSubmitting}>"""

content = content.replace(target, repl)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
