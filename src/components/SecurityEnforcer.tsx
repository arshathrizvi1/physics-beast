"use client";

import { useEffect, useState } from 'react';
import { IsRoot } from '@capgo/capacitor-is-root';
import { App } from '@capacitor/app';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export function SecurityEnforcer() {
  const { user } = useAuth();
  const [isCompromised, setIsCompromised] = useState(false);
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);

  // 1. Native Root / Jailbreak Security (Mobile Apps)
  useEffect(() => {
    const checkSecurity = async () => {
      try {
        const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
        if (!isNative) return;

        const rootCheck = await (IsRoot as any).isJailbrokenOrRooted();
        const simCheck = await (IsRoot as any).isSimulator();
        
        if (rootCheck.result || simCheck.result) {
          setIsCompromised(true);
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

  // 2. Global Anti-DevTools & Anti-Inspection (Students & Guests Only)
  useEffect(() => {
    // Admins and Teachers are completely exempt so they can manage the site
    if (user?.role === 'admin' || user?.role === 'teacher') {
      setIsDevToolsDetected(false);
      return;
    }

    // A. Prevent Right-Click Context Menu across entire website
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("contextmenu", handleContextMenu);

    // B. Block DevTools Shortcuts (F12, Ctrl/Cmd + Shift + I/J/C, Ctrl/Cmd + U, Ctrl/Cmd + S)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();

      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && ["I", "J", "C"].includes(key)) ||
        (isCmdOrCtrl && key === "U") ||
        (isCmdOrCtrl && key === "S")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);

    // C. Continuous Timing Trap (Pauses execution and detects open DevTools)
    const trapInterval = setInterval(() => {
      const t0 = performance.now();
      // This debugger statement halts JavaScript execution ONLY when DevTools is open
      (function () {}.constructor("debugger")());
      const t1 = performance.now();

      if (t1 - t0 > 100) {
        setIsDevToolsDetected(true);
      } else {
        setIsDevToolsDetected(false);
      }
    }, 1000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown, true);
      clearInterval(trapInterval);
    };
  }, [user]);

  // Screen for Rooted/Jailbroken devices
  if (isCompromised) {
    return (
      <div className="fixed inset-0 z-[999999] bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold text-red-500 mb-4">Security Violation Detected</h1>
        <p className="text-gray-300 max-w-md">
          Brilliant Academy cannot be run on a rooted, modified, or emulated device. This security policy is in place to protect premium educational content. The application will close automatically.
        </p>
      </div>
    );
  }

  // Screen for Students trying to open DevTools / Inspect Element
  if (isDevToolsDetected) {
    return (
      <div className="fixed inset-0 z-[999999] bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-md">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold text-red-500 mb-4">Developer Tools Prohibited</h1>
        <p className="text-gray-300 max-w-md">
          Developer Tools, element inspection, and source viewing are strictly prohibited on Brilliant Academy to protect educational content and examination integrity.
        </p>
        <p className="text-zinc-500 text-sm mt-4">
          Please close Developer Tools to resume using the platform.
        </p>
      </div>
    );
  }

  return null;
}
