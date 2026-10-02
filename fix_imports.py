import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_str = """import { db, auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";"""

if "RecaptchaVerifier" not in content[:1000]:
    content = content.replace('import { db } from "@/lib/firebase";', import_str)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added RecaptchaVerifier and auth imports.")
else:
    print("Already imported.")
