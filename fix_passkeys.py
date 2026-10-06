import re

files = [
    r'C:\Projects\Brilliant Academy\physics-beast\src\app\api\passkey\verify-auth\route.ts',
    r'C:\Projects\Brilliant Academy\physics-beast\src\app\api\passkey\verify-registration\route.ts'
]

new_origin = "      'android:apk-key-hash:LVpJceSiciBSkcTsTyhTX8Z_1WFOBs5YhWg2fmL0ZsQ',"

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the expectedOrigins array and inject the new origin inside it
    if "const expectedOrigins = [" in content:
        content = content.replace("const expectedOrigins = [", f"const expectedOrigins = [\n{new_origin}")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Injected!")
