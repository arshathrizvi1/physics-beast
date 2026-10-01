import sys
import re

path_admin = r'C:\Projects\Brilliant Academy\physics-beast\src\app\admin\live\page.tsx'
with open(path_admin, 'r', encoding='utf-8') as f:
    content_admin = f.read()

# Replace first description
content_admin = re.sub(
    r'\{allowDirectJoin \s*\?\s*"Enabled: Students see the \'JOIN ZOOM MEETING\' 1-click button\." \s*:\s*"Disabled: 1-Click button hidden\. Students cannot enter your Zoom room directly\."\}',
    """{allowDirectJoin ? "Enabled: Embeds Zoom Player directly inside the website." : "Disabled: Forces students to open the native Zoom App on their device."}""",
    content_admin
)

# Replace second description
content_admin = re.sub(
    r'\{editAllowDirectJoin \s*\?\s*"Students see the \'JOIN ZOOM MEETING\' 1-click button\." \s*:\s*"1-Click button hidden\. Students cannot enter your Zoom room directly\."\}',
    """{editAllowDirectJoin ? "Enabled: Embeds Zoom Player directly inside the website." : "Disabled: Forces students to open the native Zoom App on their device."}""",
    content_admin
)

# Replace the emoji button text
content_admin = re.sub(
    r'\{cls\.allowDirectJoin !== false \? ".*? Direct Zoom Join: Enabled" : ".*? Direct Zoom Join: Disabled"\}',
    """{cls.allowDirectJoin !== false ? "✅ Embedded Zoom: Enabled" : "❌ Embedded Zoom: Disabled"}""",
    content_admin
)


with open(path_admin, 'w', encoding='utf-8') as f:
    f.write(content_admin)
