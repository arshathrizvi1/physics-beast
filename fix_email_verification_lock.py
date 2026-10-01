import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'(const userCred = await signInWithEmailAndPassword\(auth, email, password\);)'
repl = r'\1\n\n      // Enforce Email Verification for standard users\n      if (!userCred.user.emailVerified) {\n        // Allow master admin or legacy admin to bypass\n        if (userCred.user.email !== "admin@brilliantacademy.com" && userCred.user.email !== "arshathrizvi1010@gmail.com") {\n          await firebaseSignOut(auth);\n          throw new Error("EMAIL_NOT_VERIFIED");\n        }\n      }'

if 'throw new Error("EMAIL_NOT_VERIFIED");' not in content:
    content = re.sub(target, repl, content, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected EMAIL_NOT_VERIFIED block")
else:
    print("EMAIL_NOT_VERIFIED already exists!")
