import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\cpp\secure-player-lib.cpp'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Generate the encrypted array for the new Release Signature using XOR 42
new_sig = "2D:5A:49:71:E4:A2:72:20:52:91:C4:EC:4F:28:53:5F:C6:7F:D5:61:4E:06:CE:58:85:68:36:7E:62:F4:66:C4"
xor_key = 42

encrypted_array = []
for char in new_sig:
    encrypted_array.append(str(ord(char) ^ xor_key))

array_str = ", ".join(encrypted_array)
array_definition = f"const std::vector<int> ENC_OFFICIAL_SIG = {{\n    {array_str}\n}};"

# Replace the old array block
pattern_array = r'const std::vector<int> ENC_OFFICIAL_SIG = \{.*?\};'
content = re.sub(pattern_array, array_definition, content, flags=re.DOTALL)

# 2. Update the Installer Check logic to use the Smart Whitelist instead of just com.android.vending
smart_installer_logic = """
    // 2. Smart Installer Check (Allow Web Browsers & My Files)
    if (!sInst.empty()) {
        if (sInst != "com.android.vending" && 
            sInst != "com.android.chrome" && 
            sInst != "com.sec.android.app.sbrowser" && 
            sInst != "com.google.android.packageinstaller" && 
            sInst != "com.samsung.android.packageinstaller" &&
            sInst != "com.miui.packageinstaller" &&
            sInst != "com.coloros.safecenter") {
            
            LOGE("SECURITY ALERT: Application was sidelined by PIRATE STORE: %s", sInst.c_str());
            isCracked = true;
        }
    }
"""

pattern_installer = r'// 2\. Installer Check.*?if \(!sInst\.empty\(\) && sInst != "com\.android\.vending"\) \{.*?isCracked = true;\n\s*\}'
content = re.sub(pattern_installer, smart_installer_logic.strip(), content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("C++ Security Layer Updated Successfully!")
