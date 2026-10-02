import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\SecureVideoActivity.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Uncomment the FLAG_SECURE
content = content.replace(
    '// getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);',
    'getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);'
)

# Update the Vercel domain to the new live domain
content = content.replace(
    '"https://brilliantacademy.vercel.app/api/bunny/sign',
    '"https://www.brillliantacademy.site/api/bunny/sign'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Enabled Anti-Screen Recording and updated DRM URL!")
