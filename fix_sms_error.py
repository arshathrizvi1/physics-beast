import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'\} catch\(e: any\) \{\s*console\.error\("SMS Error", e\);\s*setPhoneError\("Failed to send SMS\. Check your number or wait a bit\."\);\s*setOtpSending\(false\);\s*\}'

repl = r"""} catch(e: any) {
        console.error("SMS Error", e);
        
        let errorMessage = "Failed to send SMS.";
        if (e.code === 'auth/invalid-phone-number') {
          errorMessage = "Invalid phone format.";
        } else if (e.code === 'auth/too-many-requests') {
          errorMessage = "Quota exceeded or spam block. Use test number.";
        } else if (e.message) {
          errorMessage = `Firebase says: ${e.message}`;
        }
        
        setPhoneError(errorMessage);
        setOtpSending(false);
      }"""

content = re.sub(target, repl, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated catch block successfully via regex.")
