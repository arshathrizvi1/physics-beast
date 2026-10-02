import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken string in description
content = content.replace('Expert \nteaching', 'Expert teaching')
content = content.replace('Expert \r\nteaching', 'Expert teaching')

# Also fix the opengraph description just in case
content = content.replace('online classes \ntoday.', 'online classes today.')
content = content.replace('online classes \r\ntoday.', 'online classes today.')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed syntax error in layout.tsx!")
