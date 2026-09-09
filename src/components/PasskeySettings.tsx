"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Loader2 } from 'lucide-react';

export default function PasskeySettings() {
  const { user } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    setMessage('');
    setError('');

    try {
      // 1. Get registration options from server
      const resp = await fetch('/api/passkey/generate-registration-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: user.email, displayName: user.name }),
      });
      const options = await resp.json();
      if (options.error) throw new Error(options.error);

      // 2. Prompt user to create passkey
      const attResp = await startRegistration(options);

      // 3. Verify registration on server
      const verifyResp = await fetch('/api/passkey/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, response: attResp }),
      });
      const verifyResult = await verifyResp.json();

      if (verifyResult.verified) {
        setMessage("Passkey registered successfully! You can now log in using your fingerprint or Face ID.");
      } else {
        throw new Error(verifyResult.error || "Verification failed");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to register passkey. Ensure your device supports biometrics/Windows Hello.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <Fingerprint className="w-5 h-5 text-primary" />
        Biometric Login (Passkeys)
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Set up fingerprint, Face ID, or Windows Hello to securely log into your account without a password.
      </p>

      {message && <p className="text-sm text-green-500 mb-2 font-medium">{message}</p>}
      {error && <p className="text-sm text-red-500 mb-2 font-medium">{error}</p>}

      <Button 
        onClick={handleRegisterPasskey} 
        disabled={isRegistering}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {isRegistering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
        Register New Passkey
      </Button>
    </div>
  );
}
