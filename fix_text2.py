import sys

with open('src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'Email verified successfully!' in line:
        lines[i] = '          alert("✅ Email verified successfully! You can now log in.");\n'
    elif 'Verification link is invalid or expired' in line:
        lines[i] = '          alert("❌ Verification link is invalid or expired. " + err.message);\n'
    elif 'Password successfully reset!' in line:
        lines[i] = '      alert("✅ Password successfully reset! You can now log in.");\n'

with open('src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done!')
