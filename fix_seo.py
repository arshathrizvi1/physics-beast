import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'applicationName: "Brilliant Academy LMS",'
repl = """applicationName: "Brilliant Academy LMS",
  verification: {
    google: "mL8cyyAyZ9u1E2t781IfntHrU5PGtz7VgQG3q2q4rAU",
  },"""

content = content.replace(target, repl)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Google Verification Code")
