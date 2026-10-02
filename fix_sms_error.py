import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """      } catch(e: any) {
        console.error("SMS Error", e);
        setPhoneError("Failed to send SMS. Check your number or wait a bit.");
        setOtpSending(false);
      }"""

repl = """      } catch(e: any) {
        console.error("SMS Error", e);
        
        let errorMessage = "Failed to send SMS.";
        if (e.code === 'auth/invalid-phone-number') {
          errorMessage = "Invalid phone format.";
        } else if (e.code === 'auth/too-many-requests') {
          errorMessage = "Quota exceeded or spam block. Use test number.";
        } else if (e.message) {
          errorMessage = `Error: ${e.message}`;
        }
        
        setPhoneError(errorMessage);
        setOtpSending(false);
      }"""

if target in content:
    content = content.replace(target, repl)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated catch block successfully.")
else:
    print("Could not find catch block target.")
