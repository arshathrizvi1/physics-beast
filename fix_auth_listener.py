import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'(const docRef = doc\(db, \'users\', firebaseUser\.uid\);)'
repl = r'// Intercept unverified users immediately so they don\'t get routed to the dashboard\n          if (!firebaseUser.emailVerified && firebaseUser.email !== "admin@brilliantacademy.com" && firebaseUser.email !== "arshathrizvi1010@gmail.com") {\n            // Allow Google Sign-In users through because Google verifies them. But Google accounts have emailVerified = true anyway.\n            // We just let it silently ignore them and clear local state until they verify.\n            setUser(null);\n            return;\n          }\n\n          \1'

if 'Intercept unverified users immediately' not in content:
    content = re.sub(target, repl, content, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected intercept in onAuthStateChanged")
else:
    print("Already intercepted!")
