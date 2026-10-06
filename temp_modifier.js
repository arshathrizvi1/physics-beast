const fs = require('fs');

let code = fs.readFileSync('src/app/login/page.tsx', 'utf8');

// 1. Add state variables
code = code.replace(
  'const [email, setEmail] = useState("");',
  'const [resetOobCode, setResetOobCode] = useState<string | null>(null);\n  const [newPassword, setNewPassword] = useState("");\n  const [confirmNewPassword, setConfirmNewPassword] = useState("");\n  const [email, setEmail] = useState("");'
);

// 2. Add import for confirmPasswordReset
if (!code.includes('confirmPasswordReset')) {
  code = code.replace(
    'import { auth, db, storage } from "@/lib/firebase";',
    'import { auth, db, storage } from "@/lib/firebase";\nimport { confirmPasswordReset } from "firebase/auth";'
  );
}

// 3. Update useEffect
code = code.replace(
  /if \(mode === 'verifyEmail' && oobCode\) \{[\s\S]*?\}\s*\}\, \[searchParams\]\);/,
  `if (mode === 'verifyEmail' && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          alert("✅ Email verified successfully! You can now log in.");
          window.history.replaceState({}, '', '/login');
        })
        .catch(err => {
          alert("❌ Verification link is invalid or expired. " + err.message);
        });
    } else if (mode === 'resetPassword' && oobCode) {
      setResetOobCode(oobCode);
    }
  }, [searchParams]);`
);

// 4. Add handleSaveNewPassword
code = code.replace(
  'const handleResetPassword = async () => {',
  `const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await confirmPasswordReset(auth, resetOobCode!, newPassword);
      alert("✅ Password successfully reset! You can now log in.");
      setResetOobCode(null);
      setNewPassword("");
      setConfirmNewPassword("");
      window.history.replaceState({}, '', '/login');
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {`
);

fs.writeFileSync('src/app/login/page.tsx', code);
console.log('Modified state and handlers successfully');
