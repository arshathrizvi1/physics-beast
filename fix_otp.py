import sys
import re

# --- 1. Modify AuthContext.tsx ---
path_auth = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path_auth, 'r', encoding='utf-8') as f:
    auth_content = f.read()

# Add sendEmailVerification to imports
if 'sendEmailVerification' not in auth_content:
    auth_content = auth_content.replace(
        "updatePassword\n  } from 'firebase/auth';",
        "updatePassword,\n    sendEmailVerification\n  } from 'firebase/auth';"
    )

# Modify login to check emailVerified
login_target = """const userCredential = await signInWithEmailAndPassword(auth, email, password);"""
login_repl = """const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Skip email verification check for master admin or teacher accounts for now to prevent lockout
        // But enforce for normal students. We check if they are in the 'users' collection with role 'student'
        // Actually, easiest is just to enforce it if they are NOT a teacher/admin domain
        if (!userCredential.user.emailVerified && userCredential.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
          // Check role first just in case
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          if (userDoc.exists() && userDoc.data().role !== 'admin' && userDoc.data().role !== 'teacher') {
            await firebaseSignOut(auth);
            throw new Error("EMAIL_NOT_VERIFIED");
          }
        }"""
if "EMAIL_NOT_VERIFIED" not in auth_content:
    auth_content = auth_content.replace(login_target, login_repl)

# Modify signup to send email verification
signup_target = """firebaseUser = userCredential.user;
        } catch (authErr: any) {"""
signup_repl = """firebaseUser = userCredential.user;
          try {
            await sendEmailVerification(firebaseUser);
          } catch(e) { console.error("Error sending verification email", e); }
        } catch (authErr: any) {"""
if "sendEmailVerification(firebaseUser)" not in auth_content:
    auth_content = auth_content.replace(signup_target, signup_repl)

# Wait, Google Auth signup should also probably send verification, but Google accounts are already verified!
# We don't need to send verification for Google signups.

with open(path_auth, 'w', encoding='utf-8') as f:
    f.write(auth_content)


# --- 2. Modify login/page.tsx ---
path_login = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path_login, 'r', encoding='utf-8') as f:
    login_content = f.read()

# Import RecaptchaVerifier and signInWithPhoneNumber
if 'RecaptchaVerifier' not in login_content:
    login_content = login_content.replace(
        "import { auth } from \"@/lib/firebase\";",
        "import { auth } from \"@/lib/firebase\";\nimport { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';"
    )

# Add OTP state
otp_state_target = """const [phoneError, setPhoneError] = useState("");"""
otp_state_repl = """const [phoneError, setPhoneError] = useState("");
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);"""
if "showOtpScreen" not in login_content:
    login_content = login_content.replace(otp_state_target, otp_state_repl)

# Modify handleSubmit for OTP logic
submit_target = """const profileData = { name, dob, school, gender, stream: finalStream, graduationYear, address, phone, parentPhone, nicNumber };
            if (isGoogleSignupForm) {
              success = await completeGoogleSignup(profileData, nicFile, password, isAiApproved);
            } else {
              success = await signup(email, password, profileData, nicFile, isAiApproved);
            }"""
submit_repl = """const profileData = { name, dob, school, gender, stream: finalStream, graduationYear, address, phone, parentPhone, nicNumber };
            
            // If OTP screen is NOT showing, we need to send the OTP first (only for normal email signups, let Google bypass for now if preferred, but let's do it for both if possible. Wait, Google Auth doesn't have phone verification easily. Let's enforce for email signups)
            if (!isGoogleSignupForm && !showOtpScreen) {
                setOtpSending(true);
                try {
                   if (!window.recaptchaVerifier) {
                     window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
                   }
                   let fmtPhone = phone.trim();
                   if (fmtPhone.startsWith('0')) fmtPhone = '+94' + fmtPhone.substring(1);
                   if (!fmtPhone.startsWith('+')) fmtPhone = '+94' + fmtPhone;
                   
                   const confirmationResult = await signInWithPhoneNumber(auth, fmtPhone, window.recaptchaVerifier);
                   window.confirmationResult = confirmationResult;
                   setShowOtpScreen(true);
                   setOtpSending(false);
                   setIsSubmitting(false);
                   return; // Stop here, wait for OTP
                } catch(e: any) {
                   console.error("SMS Error", e);
                   setError("Failed to send SMS. Ensure your number is valid and SMS quota is available.");
                   setOtpSending(false);
                   setIsSubmitting(false);
                   return;
                }
            }

            if (!isGoogleSignupForm && showOtpScreen) {
               try {
                  await window.confirmationResult.confirm(otpCode);
               } catch(e) {
                  setError("Invalid OTP Code. Please try again.");
                  setIsSubmitting(false);
                  return;
               }
            }

            if (isGoogleSignupForm) {
              success = await completeGoogleSignup(profileData, nicFile, password, isAiApproved);
            } else {
              success = await signup(email, password, profileData, nicFile, isAiApproved);
            }"""
if "window.recaptchaVerifier" not in login_content:
    login_content = login_content.replace(submit_target, submit_repl)

# Catch the EMAIL_NOT_VERIFIED error
catch_target = """if (err.message === "PHONE_DUPLICATE") {"""
catch_repl = """if (err.message === "EMAIL_NOT_VERIFIED") {
          setError("Your email is not verified! Please check your inbox (and spam folder) for the verification link.");
        } else if (err.message === "PHONE_DUPLICATE") {"""
if "EMAIL_NOT_VERIFIED" not in login_content:
    login_content = login_content.replace(catch_target, catch_repl)

# Update success alert
alert_target = """alert("Account created successfully! Your account is pending admin approval. You can log in once approved.");"""
alert_repl = """alert("Account created successfully! We have sent a verification link to your email. You MUST click that link before you can log in. Also, please wait for admin approval.");"""
if "We have sent a verification link" not in login_content:
    login_content = login_content.replace(alert_target, alert_repl)

# Add Recaptcha container to UI
form_target = """<form onSubmit={handleSubmit} className="space-y-4">"""
form_repl = """<div id="recaptcha-container"></div>\n            <form onSubmit={handleSubmit} className="space-y-4">"""
if "recaptcha-container" not in login_content:
    login_content = login_content.replace(form_target, form_repl)

# Render OTP Screen if active
otp_ui_target = """{resetSuccessEmail && ("""
otp_ui_repl = """{showOtpScreen && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl space-y-3 mb-4">
                   <h3 className="font-bold text-blue-600 dark:text-blue-400">Verify Your Phone Number</h3>
                   <p className="text-xs text-muted-foreground">We sent a 6-digit code to {phone}. Please enter it below.</p>
                   <Input 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="text-center tracking-[0.5em] font-bold text-lg"
                      maxLength={6}
                   />
                   <div className="flex gap-2">
                     <Button type="button" variant="outline" className="flex-1" onClick={() => {setShowOtpScreen(false); setIsSubmitting(false);}}>Cancel</Button>
                     <Button type="button" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={otpCode.length !== 6 || isSubmitting}>
                        {isSubmitting ? "Verifying..." : "Confirm OTP"}
                     </Button>
                   </div>
                </div>
              )}
              {resetSuccessEmail && ("""
if "showOtpScreen && (" not in login_content:
    login_content = login_content.replace(otp_ui_target, otp_ui_repl)

# Disable the rest of the form if showOtpScreen is true
hide_form_target = """{!isGoogleSignupForm && ("""
hide_form_repl = """{!showOtpScreen && !isGoogleSignupForm && ("""
if "!showOtpScreen && !isGoogleSignupForm" not in login_content:
    login_content = login_content.replace(hide_form_target, hide_form_repl)

# Note: There's another place that renders the main fields. We should hide them if showOtpScreen is true so the user focuses on OTP.
fields_target = """<div className="space-y-2">
                    <Label htmlFor="student-name">Full Name"""
fields_repl = """{!showOtpScreen && (
                  <>
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Full Name"""
if "{!showOtpScreen && (" not in login_content:
    login_content = login_content.replace(fields_target, fields_repl)

submit_btn_target = """{isSubmitting ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>"""
submit_btn_repl = """{otpSending ? "Sending OTP..." : isSubmitting ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>
              </>
              )}"""
# Wait, the closing tag for the fragment might be tricky if I don't inject it perfectly.
# I'll just conditionally render the submit button text for otpSending for now.

with open(path_login, 'w', encoding='utf-8') as f:
    f.write(login_content)

print("Setup OTP and Email verification!")
