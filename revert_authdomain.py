import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\firebase.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'authDomain: "auth.brillliantacademy.site"'
repl = 'authDomain: "physics-beastsl.firebaseapp.com"'

if target in content:
    content = content.replace(target, repl)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Reverted authDomain to default to prevent email delivery issues while SSL is pending.")
else:
    print("Could not find authDomain target")
