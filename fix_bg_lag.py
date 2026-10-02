import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the extremely expensive grid background
content = re.sub(r'<div className="absolute inset-0\s+bg-\[linear-gradient.*?pointer-events-none" />', '', content, flags=re.DOTALL)

# 2. Remove the heavy radial gradient
content = re.sub(r'<div className="absolute inset-0\s+bg-\[radial-gradient.*?pointer-events-none" />', '', content, flags=re.DOTALL)

# 3. Clean up the massive blur glows that I might have missed (bg-[#d4af37]/5 blur-[80px])
content = re.sub(r'<div className="absolute top-1/2 left-1/2.*?bg-\[#d4af37\]/5 rounded-full.*?/>', '', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed laggy background gradients!")
