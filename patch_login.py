import re

with open('src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'if \(!nicNumber\.trim\(\)\) missingFields\.push\("NIC Number"\);\s*if \(!nicFile\) missingFields\.push\("NIC Image"\);',
    r'const selectedBatch = batches.find(b => b.year === graduationYear || b.id === graduationYear);\n          const isALBatch = selectedBatch?.isAL === true;\n          if (isALBatch && !nicNumber.trim()) missingFields.push("NIC Number");\n          if (isALBatch && !nicFile) missingFields.push("NIC Image");',
    content
)

ai_block = r'''
          const selectedBatch = batches.find(b => b.year === graduationYear || b.id === graduationYear);
          const isALBatch = selectedBatch?.isAL === true;
          let isAiApproved = false;
          if (isALBatch && nicFile && nicNumber.trim()) {
             try {
                const base64Str = await new Promise((resolve, reject) => {
                   const reader = new FileReader();
                   reader.readAsDataURL(nicFile);
                   reader.onload = () => resolve(reader.result);
                   reader.onerror = error => reject(error);
                });
                const res = await fetch('/api/verify-nic', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ imageBase64: base64Str, name: name, nicNumber: nicNumber.trim() })
                });
                const data = await res.json();
                if (!data.success) {
                   setError(ID Verification Failed: . Please try again with a clearer photo or contact support.);
                   setIsSubmitting(false);
                   return;
                }
                isAiApproved = true;
             } catch (err) {
                console.error(err);
                setError("There was an error connecting to the verification server. Please try again.");
                setIsSubmitting(false);
                return;
             }
          }
          const profileData = { name, dob, school, gender, stream, graduationYear, address, phone, parentPhone, nicNumber };
          if (isGoogleSignupForm) {
            success = await completeGoogleSignup(profileData, nicFile, password, isAiApproved);
          } else {
            success = await signup(email, password, profileData, nicFile, isAiApproved);
          }
'''

content = re.sub(
    r'const profileData = \{ name, dob, school, gender, stream, graduationYear, address, phone, parentPhone, nicNumber \};\s*if \(isGoogleSignupForm\) \{\s*success = await completeGoogleSignup\(profileData, nicFile, password\);\s*\} else \{\s*success = await signup\(email, password, profileData, nicFile\);\s*\}',
    ai_block,
    content
)

with open('src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
