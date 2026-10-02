import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the sharp solid background circles with hardware-accelerated radial gradients
# that naturally fade to 0 opacity without using the laggy blur filter.
replacement = """
  <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full mix-blend-screen" 
       style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0) 70%)' }} />
  <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full mix-blend-screen"
       style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, rgba(212,175,55,0) 70%)' }} />
"""

content = re.sub(
    r'<div className="absolute top-\[-10%\] left-\[-10%\].*?/>\s*<div className="absolute bottom-\[-10%\].*?/>',
    replacement.strip(),
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced sharp blobs with ultra-fast glowing radial gradients!")
