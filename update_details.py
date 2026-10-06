import os

files_to_update = [
    'src/components/FooterContent.tsx',
    'src/app/about/page.tsx',
    'src/app/terms/page.tsx',
    'src/app/return-policy/page.tsx',
    'src/app/privacy-policy/page.tsx'
]

old_email = 'arshathrizvicoding@gmail.com'
new_email = 'arshathrizvi1010@gmail.com'

old_phone = '+94 77 000 0000'
new_phone = '0757391416'

old_address = '123 Main Street, Colombo 00100, Sri Lanka'
new_address = 'No:19 VTG Karunarathna Mawatha, Rakwana'

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the placeholders with real details
        new_content = content.replace(old_email, new_email)
        new_content = new_content.replace(old_phone, new_phone)
        new_content = new_content.replace(old_address, new_address)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")

print("All contact details updated successfully.")
