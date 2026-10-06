import sys

with open('src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'IMPORTANT: If you do not see the email in your Inbox within a few minutes' in line:
        lines[i] = '        alert(`Password reset link sent to ${res.email}!\\n\\nPlease check your Inbox.\\n\\n⚠️ IMPORTANT: If you do not see the email in your Inbox within a few minutes, please check your Spam / Junk mail folder!`);\n'
    if 'IMPORTANT: Please check your Spam or Junk folder' in line:
        lines[i] = '                    ⚠️ IMPORTANT: Please check your Spam or Junk folder if you do not see it in your Inbox!\n'
    if 'Your Verification Code is:' in line and 'message:' in line:
        lines[i] = '        message: `*Brilliant Academy 🎓*\\n\\nYour Verification Code is: *${otp}*\\n\\nPlease enter this code to verify your account.\\n\\n_Do not share this code with anyone._`,\n'

with open('src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done!')
