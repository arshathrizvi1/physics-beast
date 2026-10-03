import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\SecureVideoActivity.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the strict Google Play Store installation requirement
installer_check_pattern = r'try\s*\{\s*String\s*installer.*?return\s*true;\s*\}\s*\}\s*catch\s*\(Exception\s*e\)\s*\{\s*\}'
content = re.sub(installer_check_pattern, '', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\MainActivity.java'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

# MainActivity might have the same check inside a JavascriptInterface
content2 = re.sub(installer_check_pattern, '', content2, flags=re.DOTALL)
with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

print("Removed Google Play Store strict requirement from Anti-Cracking system!")
