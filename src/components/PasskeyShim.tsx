"use client";

import { useEffect } from "react";

export function PasskeyShim() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initShim = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { CapacitorPasskey } = await import("@capgo/capacitor-passkey");
          await CapacitorPasskey.autoShimWebAuthn();
          // Polyfill PublicKeyCredential so @simplewebauthn/browser doesn't throw "not supported" error
          if (typeof window !== "undefined" && !window.PublicKeyCredential) {
            (window as any).PublicKeyCredential = function() {};
            (window as any).PublicKeyCredential.isConditionalMediationAvailable = async () => false;
            (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
          }
          console.log("[PasskeyShim] CapacitorPasskey.autoShimWebAuthn() initialized");
        }
      } catch (e) {
        console.error("[PasskeyShim] Failed to initialize passkey shim", e);
      }
    };

    initShim();
  }, []);

  return null;
}
