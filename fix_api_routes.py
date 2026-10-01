import sys
import os

target = "https://brilliantacademy.vercel.app"
replacement = "https://brillliantacademy.site"

files_to_update = [
    r"C:\Projects\Brilliant Academy\physics-beast\src\app\api\bunny\aws-download\route.ts",
    r"C:\Projects\Brilliant Academy\physics-beast\src\app\api\zoom\webhook\route.ts",
    r"C:\Projects\Brilliant Academy\physics-beast\src\app\api\apify\webhook\route.ts"
]

for path in files_to_update:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if target in content:
            new_content = content.replace(target, replacement)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {os.path.basename(path)}")
