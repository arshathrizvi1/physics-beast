import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\SecureVideoActivity.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to inject a smart installer whitelist into isAppCracked()
whitelist_logic = """
        try {
            String installer = getPackageManager().getInstallerPackageName(getPackageName());
            
            // If installer is null, it usually means it was installed via ADB or a raw file manager
            if (installer != null && !installer.isEmpty()) {
                // List of allowed installers (Play Store, Chrome, Samsung Browser, WhatsApp, Default Package Installers)
                boolean isAllowed = installer.equals("com.android.vending") || // Google Play
                                    installer.equals("com.android.chrome") || // Google Chrome
                                    installer.equals("com.sec.android.app.sbrowser") || // Samsung Internet
                                    installer.equals("com.opera.browser") || // Opera
                                    installer.equals("org.mozilla.firefox") || // Firefox
                                    installer.equals("com.whatsapp") || // WhatsApp
                                    installer.equals("com.google.android.packageinstaller") || // Default Android Installer
                                    installer.equals("com.samsung.android.packageinstaller") || // Samsung Installer
                                    installer.equals("com.miui.packageinstaller") || // Xiaomi Installer
                                    installer.equals("com.coloros.safecenter"); // Oppo/Vivo Installer
                                    
                // If it was installed by a custom app store like APKPure or Aptoide, block it!
                if (!isAllowed) {
                    return true;
                }
            }
        } catch (Exception e) { }
        return false;
"""

# Replace the end of isAppCracked where it just returns false
content = content.replace(
    '} catch (Exception e) { return true; }\n        return false;',
    '} catch (Exception e) { return true; }\n' + whitelist_logic
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Smart Installer Whitelist!")
