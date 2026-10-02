import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

viewport_code = """
import { Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};
"""

if "export const viewport" not in content:
    # insert after the imports
    content = content.replace('import { PushNotificationSetup } from "@/components/PushNotificationSetup";', 
                              'import { PushNotificationSetup } from "@/components/PushNotificationSetup";\n' + viewport_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected Viewport Cover into Next.js layout!")
