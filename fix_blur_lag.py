import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Strip all backdrop-blur-* classes
content = re.sub(r'backdrop-blur(?:-\w+)?', '', content)

# 2. Strip all massive blur-[...] and blur-xl/2xl etc classes
content = re.sub(r'blur-\[\d+px\]', '', content)
content = re.sub(r'blur(?:-(?:sm|md|lg|xl|2xl|3xl))?', '', content)

# 3. Strip mix-blend-screen (which is terrible for mobile GPU rendering)
content = content.replace('mix-blend-screen', '')

# Remove double spaces left over by replacements
content = re.sub(r' {2,}', ' ', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Aggressively stripped laggy CSS blurs from Homepage!")
