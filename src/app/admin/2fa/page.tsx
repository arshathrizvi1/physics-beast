"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, ShieldCheck, RotateCcw, ArrowLeft, CheckCircle2, RefreshCw, Key } from "lucide-react";
import Link from "next/link";

export default function Admin2FAPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // mode: 'verify' (entering code to log in) | 'setup' (scanning QR code for new/changed 2FA) | 'manage' (viewing 2FA status with option to change)
  const [mode, setMode] = useState<"verify" | "setup" | "manage">("verify");
  const [existingSecret, setExistingSecret] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isSessionVerified, setIsSessionVerified] = useState(false);

  const [checkingSecret, setCheckingSecret] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      router.replace("/");
      return;
    }

    const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor);
    const passed2FA = isCapacitor || (typeof window !== 'undefined' && (sessionStorage.getItem("admin_2fa_passed") === "true" || localStorage.getItem("admin_2fa_passed") === "true"));
    
    if (isCapacitor && typeof window !== 'undefined') {
      sessionStorage.setItem("admin_2fa_passed", "true");
      localStorage.setItem("admin_2fa_passed", "true");
      router.replace("/admin");
      return;
    }

    setIsSessionVerified(passed2FA);

    const isChangeRequested = typeof window !== 'undefined' && (
      window.location.search.includes("change=true") || 
      window.location.search.includes("reset=true")
    );

    const check2FA = async () => {
      setCheckingSecret(true);
      setError("");
      
      try {
        const { getDocFromServer } = await import("firebase/firestore");
        const userDoc = await getDocFromServer(doc(db, "users", user.uid));
        const data = userDoc.data();
        
        // STRICT check: only treat it as having a secret if it's a non-empty string
        const secretInDb = (typeof data?.totpSecret === 'string' && data.totpSecret.length > 0) 
          ? data.totpSecret 
          : null;
        setExistingSecret(secretInDb);

        if (!secretInDb) {
          // No secret exists yet -> first time setup
          await generateNewSetup(user.email || "Admin");
        } else if (isChangeRequested && passed2FA) {
          // User is already logged in and explicitly wants to change 2FA
          await generateNewSetup(user.email || "Admin");
        } else if (passed2FA) {
          // User is already logged in, show manage view
          setMode("manage");
        } else {
          // Standard login verification — user HAS a secret, just needs to enter the code
          setMode("verify");
        }
      } catch (err) {
        console.error("Failed to check 2FA status", err);
        // CRITICAL: On network error, DO NOT fall through to setup mode.
        // If user profile has totpSecret cached, trust it and go to verify mode.
        if (user.totpSecret && typeof user.totpSecret === 'string' && user.totpSecret.length > 0) {
          setExistingSecret(user.totpSecret);
          if (passed2FA) {
            setMode("manage");
          } else {
            setMode("verify");
          }
        } else {
          // Genuinely can't determine — show error with retry, do NOT show setup
          setError("Could not connect to server to verify your 2FA status. Please check your internet and try again.");
        }
      } finally {
        setCheckingSecret(false);
      }
    };
    
    check2FA();
  }, [user, loading, router]);

  const generateNewSetup = async (userEmail: string) => {
    try {
      const generated = new OTPAuth.Secret().base32;
      setNewSecret(generated);
      setMode("setup");
      setError("");
      setTokenInput("");
      
      const totp = new OTPAuth.TOTP({
        issuer: "Brilliant Academy",
        label: userEmail,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: generated
      });
      
      const uri = totp.toString();
      const qrUrl = await QRCode.toDataURL(uri);
      setQrCodeUrl(qrUrl);
    } catch (e) {
      console.error(e);
      setError("Failed to generate QR code.");
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to disable 2FA for your account?")) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        totpSecret: null
      }, { merge: true });
      setExistingSecret(null);
      setNewSecret(null);
      sessionStorage.removeItem("admin_2fa_passed");
      setSuccessMessage("Two-Factor Authentication has been disabled.");
      setTimeout(() => {
        router.replace("/admin");
      }, 1000);
    } catch (err) {
      console.error("Failed to disable 2FA", err);
      setError("Failed to disable 2FA.");
    }
  };

  const handleStartChange2FA = async () => {
    if (!user) return;
    await generateNewSetup(user.email || "Admin");
  };

  const verifyCode = async () => {
    const activeSecret = mode === "setup" ? newSecret : existingSecret;
    if (!activeSecret || !tokenInput || tokenInput.length < 6) return;

    setVerifying(true);
    setError("");
    setSuccessMessage("");
    
    try {
      const totp = new OTPAuth.TOTP({
        issuer: "Brilliant Academy",
        label: user?.email || "Admin Panel",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: activeSecret
      });

      const isValid = totp.validate({ token: tokenInput, window: 1 }) !== null;

      if (isValid) {
        if (mode === "setup" && user) {
          // Save new secret to Firestore
          await setDoc(doc(db, "users", user.uid), {
            totpSecret: activeSecret
          }, { merge: true });
          setExistingSecret(activeSecret);
          setSuccessMessage("✅ 2FA Authenticator successfully configured!");
        }
        
        // Mark session as 2FA verified
        sessionStorage.setItem("admin_2fa_passed", "true");
        setIsSessionVerified(true);

        setTimeout(() => {
          router.replace("/admin");
        }, mode === "setup" ? 1200 : 300);
      } else {
        setError("Invalid 6-digit code. Please check your app and try again.");
      }
    } catch (err) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading || checkingSecret) {
    return (
      <div className="flex h-[70vh] items-center justify-center flex-col gap-3">
        <p className="animate-pulse text-primary font-bold">Initializing Security Console...</p>
        {error && (
          <div className="max-w-md text-center space-y-3">
            <p className="text-red-500 text-sm font-medium bg-red-500/10 p-3 rounded border border-red-500/20">
              {error}
            </p>
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  // If we finished checking but have an error and no mode determined, show error with retry
  if (error && !existingSecret && mode !== "setup") {
    return (
      <div className="flex h-[70vh] items-center justify-center flex-col gap-3">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <p className="text-red-500 text-sm font-medium bg-red-500/10 p-3 rounded border border-red-500/20 max-w-md text-center">
          {error}
        </p>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-primary/20 shadow-xl bg-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-3">
            {mode === "setup" ? (
              <RefreshCw className="w-8 h-8 text-primary animate-spin-slow" />
            ) : mode === "manage" ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "setup" 
              ? (existingSecret ? "Change Google Authenticator" : "Set Up Two-Factor Auth")
              : mode === "manage"
              ? "2FA Security Settings"
              : "Two-Factor Authentication"}
          </CardTitle>
          <CardDescription>
            {mode === "setup"
              ? "Scan the new QR code below with your Google Authenticator or Authy app."
              : mode === "manage"
              ? "Your account is secured with Google Authenticator."
              : "Enter the 6-digit code from your authenticator app to proceed."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {successMessage && (
            <div className="bg-green-500/15 border border-green-500/40 p-3 rounded-lg text-green-500 text-sm font-medium text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {successMessage}
            </div>
          )}

          {/* SETUP / CHANGE MODE: SHOW QR CODE */}
          {mode === "setup" && (
            <div className="flex flex-col items-center space-y-4 bg-secondary/10 p-4 rounded-xl border border-secondary/30">
              <p className="text-xs text-center text-muted-foreground">
                {existingSecret 
                  ? "This will replace your previous authenticator device with this new one." 
                  : "Open Google Authenticator, tap '+' and scan this QR code:"}
              </p>
              {qrCodeUrl && (
                <div className="bg-white p-3 rounded-xl shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44" />
                </div>
              )}
              <div className="w-full text-center space-y-1">
                <p className="text-[11px] text-muted-foreground">Cannot scan? Enter manual key in app:</p>
                <div className="p-2 rounded bg-background border border-secondary/40 font-mono text-xs text-primary font-bold select-all break-all flex items-center justify-center gap-1.5">
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  <span>{newSecret}</span>
                </div>
              </div>
            </div>
          )}

          {/* MANAGE MODE: CURRENT STATUS & OPTION TO CHANGE */}
          {mode === "manage" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center space-y-1.5">
                <p className="font-bold text-green-500 text-sm flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> 2FA is Active & Protecting Your Account
                </p>
                <p className="text-xs text-muted-foreground">
                  Logged in as <span className="font-semibold text-foreground">{user?.email}</span> ({user?.role})
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 space-y-2">
                <p className="text-xs font-bold text-foreground">Need to switch to a new phone or device?</p>
                <p className="text-xs text-muted-foreground">
                  You can reconfigure and generate a new QR code anytime. Your old authenticator will be replaced.
                </p>
                <Button 
                  onClick={handleStartChange2FA}
                  className="w-full gap-2 font-bold text-sm bg-primary text-primary-foreground mt-2"
                >
                  <RotateCcw className="w-4 h-4" /> Change / Reconfigure 2FA Device
                </Button>
                <Button 
                  onClick={handleDisable2FA}
                  variant="destructive"
                  className="w-full gap-2 font-bold text-sm mt-2"
                >
                  <ShieldAlert className="w-4 h-4" /> Disable 2FA
                </Button>
              </div>

              <div className="pt-2">
                <Link href="/admin">
                  <Button variant="outline" className="w-full gap-2 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Return to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* VERIFICATION CODE INPUT (FOR BOTH SETUP CONFIRMATION AND LOGIN VERIFICATION) */}
          {mode !== "manage" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground block text-center">
                  {mode === "setup" ? "Enter 6-digit code from your app to confirm:" : "6-Digit Security Code:"}
                </label>
                <Input 
                  type="text" 
                  placeholder="000000" 
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-3xl tracking-widest font-mono h-14 font-bold"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                />
              </div>

              {error && (
                <p className="text-red-500 text-xs text-center font-medium bg-red-500/10 p-2 rounded border border-red-500/20">
                  {error}
                </p>
              )}

              <Button 
                className="w-full font-bold text-base h-12 gap-2" 
                onClick={verifyCode} 
                disabled={verifying || tokenInput.length < 6}
              >
                <ShieldCheck className="w-5 h-5" /> 
                {verifying 
                  ? "Verifying..." 
                  : mode === "setup" 
                  ? "Confirm & Save New 2FA" 
                  : "Verify & Enter"}
              </Button>

              {/* Optional Skip button for teachers */}
              {user?.role === "teacher" && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => router.replace("/admin")}
                >
                  Skip 2FA & Continue to Dashboard
                </Button>
              )}

              {/* Cancel Button if changing from inside dashboard */}
              {mode === "setup" && isSessionVerified && existingSecret && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMode("manage");
                    setError("");
                    setTokenInput("");
                  }}
                >
                  Cancel & Keep Existing 2FA
                </Button>
              )}
            </div>
          )}
        </CardContent>

        {mode === "verify" && isSessionVerified && (
          <CardFooter className="pt-0 justify-center">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

