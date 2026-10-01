import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\firebase.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'authDomain: "physics-beastsl.firebaseapp.com"'
repl = 'authDomain: "auth.brillliantacademy.site"'

if target in content:
    content = content.replace(target, repl)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated authDomain to auth.brillliantacademy.site")
else:
    print("Could not find authDomain target")
