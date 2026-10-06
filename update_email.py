import os

files_to_update = [
    'src/components/FooterContent.tsx',
    'src/app/about/page.tsx',
    'src/app/terms/page.tsx',
    'src/app/return-policy/page.tsx',
    'src/app/privacy-policy/page.tsx'
]

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the old email with the new one
        new_content = content.replace('arshathrizvicoding@gmail.com', 'arshathrizvi1010@gmail.com')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")

print("Email update complete.")
