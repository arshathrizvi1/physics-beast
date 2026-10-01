import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update description
desc_target = '"Join Brilliant Academy for the best Advanced Level (A/L) Physics and Science online classes in Sri Lanka. Expert teachers, live sessions, and comprehensive study materials."'
desc_repl = '"Join Brilliant Academy Rakwana for the best Advanced Level (A/L) Physics and Science classes in Sri Lanka. Expert teachers, live sessions, and comprehensive study materials."'
content = content.replace(desc_target, desc_repl)

# Update keywords
key_target = '["A/L Physics", "Online Classes Sri Lanka", "Brilliant Academy", "Advanced Level", "LMS", "Online Education", "Physics Tuition", "Sri Lanka"]'
key_repl = '["A/L Physics", "Brilliant Academy", "Brilliant Academy Rakwana", "Rakwana", "Online Classes Sri Lanka", "Advanced Level", "Physics Tuition Rakwana", "Sri Lanka"]'
content = content.replace(key_target, key_repl)

# Update OpenGraph description
og_target = '"Master Advanced Level Physics with Sri Lanka\'s leading online educational platform. Join thousands of students today."'
og_repl = '"Master Advanced Level Physics with Brilliant Academy Rakwana, Sri Lanka\'s leading educational platform. Join our classes today."'
content = content.replace(og_target, og_repl)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated SEO keywords for Rakwana")
