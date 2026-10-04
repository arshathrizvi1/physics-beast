"use client";

import { useEffect, useState } from 'react';
import { JailbreakRootDetection } from '@capgo/capacitor-is-root';
import { App } from '@capacitor/app';
import { ShieldAlert } from 'lucide-react';

export function SecurityEnforcer() {
  const [isCompromised, setIsCompromised] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      try {
        // Only run this check if the app is running as a native Android/iOS app via Capacitor
        const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
        if (!isNative) return;

        // Uses the native Android checks for Root / Magisk / Su binary / Emulator
        const rootCheck = await JailbreakRootDetection.isJailbrokenOrRooted();
        const simCheck = await JailbreakRootDetection.isSimulator();
        
        if (rootCheck.result || simCheck.result) {
          setIsCompromised(true);
          // Force close the app after showing the message for 4 seconds
          setTimeout(() => {
            App.exitApp();
          }, 4000);
        }
      } catch (e) {
        console.error("Security check failed:", e);
      }
    };
    checkSecurity();
  }, []);

  if (isCompromised) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold text-red-500 mb-4">Security Violation Detected</h1>
        <p className="text-gray-300 max-w-md">
          Brilliant Academy cannot be run on a rooted, modified, or emulated device. This security policy is in place to protect premium educational content. The application will close automatically.
        </p>
      </div>
    );
  }

  return null;
}
