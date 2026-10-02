import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\next.config.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if "images: {" not in content:
    repl = """  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers()"""
    content = content.replace("async headers()", repl)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added images config to next.config.ts")
else:
    print("images config already exists")
