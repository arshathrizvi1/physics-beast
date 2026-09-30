import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\components\FooterContent.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<div className="text-center text-sm text-muted-foreground">\s*Ac \{new Date\(\)\.getFullYear\(\)\} Brilliant Academy\. All rights reserved\.\s*</div>'

new_copyright = '''        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex-1 text-center md:text-left">
            &copy; {new Date().getFullYear()} Brilliant Academy. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            <Link href="/return-policy" className="hover:text-primary transition-colors">Return Policy</Link>
          </div>
        </div>'''

content = re.sub(pattern, new_copyright, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Footer updated using regex successfully!")
