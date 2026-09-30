import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\components\FooterContent.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'([^\n]*?\{new Date\(\)\.getFullYear\(\)\}\s*Brilliant Academy\.\s*All rights reserved\.)'
replacement = r'&copy; {new Date().getFullYear()} Brilliant Academy. All rights reserved. </div><div className="flex flex-wrap items-center justify-center gap-4 text-xs mt-2"><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link><Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link><Link href="/return-policy" className="hover:text-primary transition-colors">Return Policy</Link>'

content = re.sub(pattern, replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced with regex!")
