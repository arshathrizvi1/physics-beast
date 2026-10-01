import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'(if \(phone\.trim\(\) === parentPhone\.trim\(\)\) \{.*?return;\s*\})'
repl = r'\1\n\n        if (!isGoogleSignupForm && !isPhoneVerified) {\n          setError("Please verify your phone number before creating an account.");\n          setIsSubmitting(false);\n          return;\n        }'

content = re.sub(target, repl, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected isPhoneVerified check")
