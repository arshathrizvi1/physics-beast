"use client";

import { useEffect } from "react";

export function PasskeyShim() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initShim = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          // Polyfill PublicKeyCredential on globalThis FIRST, so even if autoShim fails, @simplewebauthn won't throw initially
          if (typeof globalThis !== "undefined") {
            if (!(globalThis as any).PublicKeyCredential) {
              (globalThis as any).PublicKeyCredential = function() {};
            }
            (globalThis as any).PublicKeyCredential.isConditionalMediationAvailable = async () => false;
            (globalThis as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
          }
          if (typeof window !== "undefined") {
            if (!(window as any).PublicKeyCredential) {
              (window as any).PublicKeyCredential = function() {};
            }
            (window as any).PublicKeyCredential.isConditionalMediationAvailable = async () => false;
            (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
          }

          const { CapacitorPasskey } = await import("@capgo/capacitor-passkey");
          await CapacitorPasskey.autoShimWebAuthn();
          
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
