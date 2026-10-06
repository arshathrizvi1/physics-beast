import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\gradle.properties'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Increase RAM to 4GB
content = content.replace('org.gradle.jvmargs=-Xmx1536m', 'org.gradle.jvmargs=-Xmx4096m -Dkotlin.daemon.jvm.options="-Xmx2048M"')

# Prevent AAPT2 from dying silently
content += "\nandroid.aapt2.systemPathOverride=\n"

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Allocated 4GB RAM to Android Studio Compiler!")
