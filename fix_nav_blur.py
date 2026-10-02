import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\components\PremiumNavbar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'backdrop-blur(?:-\w+)?', 'bg-zinc-950/95', content)
content = re.sub(r'blur(?:-(?:sm|md|lg|xl|2xl|3xl|\[.*?\]))?', '', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Stripped laggy blurs from PremiumNavbar!")
