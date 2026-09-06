"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export default function Admin2FAPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }

    const check2FA = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        if (data && data.totpSecret) {
          setSecret(data.totpSecret);
        } else {
          // Generate new secret for setup
          const newSecret = new OTPAuth.Secret().base32;
          setSecret(newSecret);
          setIsSettingUp(true);
          
          const totp = new OTPAuth.TOTP({
            issuer: "Physics Beast",
            label: "Admin Panel",
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: newSecret
          });
          
          const uri = totp.toString();
          const qrUrl = await QRCode.toDataURL(uri);
          setQrCodeUrl(qrUrl);
        }
      } catch (err) {
        console.error("Failed to check 2FA status", err);
        setError("Network error checking 2FA status.");
      }
    };
    
    check2FA();
  }, [user, loading, router]);

  const verifyCode = async () => {
    if (!secret || !tokenInput) return;
    setVerifying(true);
    setError("");
    
    try {
      const totp = new OTPAuth.TOTP({
        issuer: "Physics Beast",
        label: "Admin Panel",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret
      });

      const isValid = totp.validate({ token: tokenInput, window: 1 }) !== null;

      if (isValid) {
        // If we were setting it up, save the secret to Firestore
        if (isSettingUp && user) {
          await updateDoc(doc(db, "users", user.uid), {
            totpSecret: secret
          });
        }
        
        // Save session flag
        sessionStorage.setItem("admin_2fa_passed", "true");
        router.replace("/admin");
      } else {
        setError("Invalid code. Please try again.");
      }
    } catch (err) {
      setError("Failed to verify code.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading || !secret) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <p className="animate-pulse text-primary font-bold">Initializing Security...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Security</CardTitle>
          <CardDescription>
            {isSettingUp ? "Set up Google Authenticator" : "Two-Factor Authentication Required"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {isSettingUp && (
            <div className="flex flex-col items-center space-y-4 bg-secondary/10 p-4 rounded-lg">
              <p className="text-sm text-center text-muted-foreground">
                Scan this QR code with your Google Authenticator or Authy app.
              </p>
              {qrCodeUrl && (
                <div className="bg-white p-2 rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                </div>
              )}
              <div className="text-xs text-center text-muted-foreground break-all">
                Manual Key: <span className="font-mono font-bold text-foreground">{secret}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Input 
              type="text" 
              placeholder="Enter 6-digit code" 
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
            />
            {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full font-bold text-lg h-12" onClick={verifyCode} disabled={verifying || tokenInput.length < 6}>
            <ShieldCheck className="w-5 h-5 mr-2" /> {verifying ? "Verifying..." : "Verify & Login"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
