import sys
import re

# 1. Fix AuthContext (Email Verification)
path_auth = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\AuthContext.tsx'
with open(path_auth, 'r', encoding='utf-8') as f:
    auth_content = f.read()

target_auth = """      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } catch (authErr: any) {"""
repl_auth = """      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        try {
          await sendEmailVerification(firebaseUser);
        } catch(e) { console.error("Email verification failed to send", e); }
      } catch (authErr: any) {"""
if "await sendEmailVerification(firebaseUser);" not in auth_content:
    auth_content = auth_content.replace(target_auth, repl_auth)

with open(path_auth, 'w', encoding='utf-8') as f:
    f.write(auth_content)


# 2. Refactor login/page.tsx (In-line Phone Verification)
path_login = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path_login, 'r', encoding='utf-8') as f:
    login_content = f.read()

# Replace the giant OTP screen block
otp_ui_target = """{showOtpScreen && (
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
              )}"""
login_content = login_content.replace(otp_ui_target, "")

# Remove the hide_form tags
login_content = login_content.replace("{!showOtpScreen && !isGoogleSignupForm && (", "{!isGoogleSignupForm && (")
login_content = login_content.replace("{!showOtpScreen && (", "{true && (")

# Revert handleSubmit to NOT trigger Phone Verification (we'll do it inline)
submit_target = """// If OTP screen is NOT showing, we need to send the OTP first (only for normal email signups, let Google bypass for now if preferred, but let's do it for both if possible. Wait, Google Auth doesn't have phone verification easily. Let's enforce for email signups)
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
            }"""
login_content = login_content.replace(submit_target, """if (!isGoogleSignupForm && !isPhoneVerified) {
               setError("Please verify your phone number before creating an account.");
               setIsSubmitting(false);
               return;
            }""")

# Add isPhoneVerified state
state_target = """const [otpSending, setOtpSending] = useState(false);"""
state_repl = """const [otpSending, setOtpSending] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);"""
if "isPhoneVerified" not in login_content:
    login_content = login_content.replace(state_target, state_repl)

# Inject Inline Phone Verification Handlers
inline_funcs = """
  const handleSendInlineOtp = async () => {
    if (!phone.trim()) {
      setPhoneError("Please enter your phone number first.");
      return;
    }
    setOtpSending(true);
    setPhoneError("");
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      let fmtPhone = phone.trim();
      if (fmtPhone.startsWith('0')) fmtPhone = '+94' + fmtPhone.substring(1);
      if (!fmtPhone.startsWith('+')) fmtPhone = '+94' + fmtPhone;
      
      const confResult = await signInWithPhoneNumber(auth, fmtPhone, window.recaptchaVerifier);
      window.confirmationResult = confResult;
      setShowOtpScreen(true); // Reusing this variable to mean "OTP Sent"
      setOtpSending(false);
    } catch(e: any) {
      console.error("SMS Error", e);
      setPhoneError("Failed to send SMS. Check your number or wait a bit.");
      setOtpSending(false);
    }
  };

  const handleVerifyInlineOtp = async () => {
    if (!otpCode || otpCode.length !== 6) return;
    setOtpSending(true);
    try {
      await window.confirmationResult.confirm(otpCode);
      setIsPhoneVerified(true);
      setShowOtpScreen(false);
      setOtpSending(false);
      setPhoneError("");
    } catch(e) {
      setPhoneError("Invalid OTP Code.");
      setOtpSending(false);
    }
  };
"""
login_content = login_content.replace("const handleSubmit = async (e: React.FormEvent) => {", inline_funcs + "\n  const handleSubmit = async (e: React.FormEvent) => {")

# Modify Phone UI
phone_ui_target = """<Label htmlFor="student-phone">Your Phone <span className="text-red-500">*</span></Label>
                      <Input 
                        id="student-phone" 
                        type="number"
                        placeholder="077..." 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required 
                      />
                      {phoneError && (
                        <p className="text-xs text-destructive font-semibold">{phoneError}</p>
                      )}"""
phone_ui_repl = """<Label htmlFor="student-phone">Your Phone <span className="text-red-500">*</span></Label>
                      <div className="flex gap-2 items-center">
                        <Input 
                          id="student-phone" 
                          type="number"
                          placeholder="077..." 
                          value={phone}
                          onChange={(e) => {setPhone(e.target.value); setIsPhoneVerified(false); setShowOtpScreen(false);}}
                          required 
                          disabled={isPhoneVerified}
                          className="flex-1"
                        />
                        {!isLogin && !isPhoneVerified && !showOtpScreen && (
                           <Button type="button" variant="secondary" onClick={handleSendInlineOtp} disabled={otpSending || !phone}>
                             {otpSending ? "..." : "Verify"}
                           </Button>
                        )}
                        {!isLogin && isPhoneVerified && (
                           <div className="flex items-center text-green-600 bg-green-500/10 px-3 h-10 rounded-md">
                              <CheckCircle2 className="w-5 h-5" />
                           </div>
                        )}
                      </div>
                      {!isLogin && showOtpScreen && !isPhoneVerified && (
                         <div className="flex gap-2 mt-2">
                            <Input 
                               value={otpCode}
                               onChange={(e) => setOtpCode(e.target.value)}
                               placeholder="6-digit OTP"
                               maxLength={6}
                               className="flex-1 text-center tracking-widest font-bold"
                            />
                            <Button type="button" onClick={handleVerifyInlineOtp} disabled={otpSending || otpCode.length !== 6}>
                               {otpSending ? "..." : "Confirm"}
                            </Button>
                         </div>
                      )}
                      {phoneError && (
                        <p className="text-xs text-destructive font-semibold">{phoneError}</p>
                      )}"""
if "handleSendInlineOtp" not in login_content:
    login_content = login_content.replace(phone_ui_target, phone_ui_repl)


# Ensure submit_btn UI is back to normal
btn_target = """{otpSending ? "Sending OTP..." : isSubmitting ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>
              </>
              )}"""
btn_repl = """{isSubmitting ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>"""
login_content = login_content.replace(btn_target, btn_repl)

with open(path_login, 'w', encoding='utf-8') as f:
    f.write(login_content)

print("Updated login page and auth context")
