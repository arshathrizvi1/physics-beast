import sys
import re

path = r'C:\Projects\Brilliant Academy\physics-beast\src\app\login\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the giant old OTP screen block
content = re.sub(r'\{showOtpScreen && \(\s*<div className="bg-blue-500/10[^>]+>\s*<h3[^>]+>Verify Your Phone Number</h3>.*?</div>\s*\)\}', '', content, flags=re.DOTALL)

# 2. Replace the old Phone input with the Inline UI
phone_target_pattern = r'<Label htmlFor="student-phone">Your Phone <span className="text-red-500">\*</span></Label>\s*<Input\s*id="student-phone"\s*type="number"\s*placeholder="077\.\.\."\s*value=\{phone\}\s*onChange=\{\(e\) => setPhone\(e\.target\.value\)\}\s*required\s*/>\s*(?:\{phoneError && \(\s*<p className="text-xs text-destructive font-semibold">\{phoneError\}</p>\s*\)\})?'

phone_repl = """<Label htmlFor="student-phone">Your Phone <span className="text-red-500">*</span></Label>
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

content = re.sub(phone_target_pattern, phone_repl, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed inline OTP UI with regex.")
