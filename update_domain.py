import sys
import re
import os

target = "https://brilliantacademy.vercel.app"
replacement = "https://brillliantacademy.site"

files_to_update = [
    r"C:\Projects\Brilliant Academy\physics-beast\src\app\sitemap.ts",
    r"C:\Projects\Brilliant Academy\physics-beast\src\app\robots.ts",
    r"C:\Projects\Brilliant Academy\physics-beast\src\app\layout.tsx"
]

for path in files_to_update:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if target in content:
            new_content = content.replace(target, replacement)
            # Also replace the comment just for cleanliness in sitemap/robots
            new_content = new_content.replace("// Replace with your custom domain later", "")
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {os.path.basename(path)}")
        else:
            print(f"Target not found in {os.path.basename(path)}")

