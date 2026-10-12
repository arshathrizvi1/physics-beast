"use client";

import { useEffect, useState, useRef } from 'react';
import { IsRoot } from '@capgo/capacitor-is-root';
import { App } from '@capacitor/app';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export function SecurityEnforcer() {
  const { user } = useAuth();
  const [isCompromised, setIsCompromised] = useState(false);
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // 2. Unbypassable Anti-DevTools & Anti-Inspection Engine (Students & Guests)
  useEffect(() => {
    // Admins and Teachers are completely exempt
    if (user?.role === 'admin' || user?.role === 'teacher') {
      setIsDevToolsDetected(false);
      document.body.classList.remove('devtools-locked');
      return;
    }

    // A. Intercept Right-Click Context Menu everywhere
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);

    // B. Block DevTools, Inspect, and Source Shortcuts
    const blockShortcuts = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();

      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && ["I", "J", "C"].includes(key)) ||
        (isCmdOrCtrl && ["U", "S", "P"].includes(key)) // U: Source, S: Save, P: Print
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    window.addEventListener("keydown", blockShortcuts, true);

    // C. Multi-Vector DevTools Detection
    const threshold = 160;

    // Vector 1: Undocked Console Formatters
    let consoleOpened = false;
    const detectorReg = /./;
    detectorReg.toString = () => {
      consoleOpened = true;
      return '';
    };

    const dateObj = new Date();
    Object.defineProperty(dateObj, 'toString', {
      get: () => {
        consoleOpened = true;
        return '';
      }
    });

    const checkDevTools = () => {
      consoleOpened = false;
      try {
        console.debug(detectorReg);
        console.debug(dateObj);
        console.clear();
      } catch (e) {}

      // Vector 2: Docked Window Size Differential Check
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      const isDetected = widthDiff || heightDiff || consoleOpened;

      if (isDetected) {
        setIsDevToolsDetected(true);
        document.body.classList.add('devtools-locked');
      } else {
        setIsDevToolsDetected(false);
        document.body.classList.remove('devtools-locked');
      }
    };

    // Instant Event Listeners
    window.addEventListener("resize", checkDevTools, { passive: true });
    const interval = setInterval(checkDevTools, 250);
    checkDevTools();

    // D. Anti-Tamper MutationObserver (Prevents deleting modal in DevTools)
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('devtools-locked')) {
        const modal = document.getElementById('security-violation-modal');
        if (!modal) {
          // Student attempted to delete the security warning using DevTools!
          // Force immediate page blank / redirect to protect content
          window.location.replace('/login?reason=tamper_detected');
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      window.removeEventListener("contextmenu", blockContextMenu, true);
      document.removeEventListener("contextmenu", blockContextMenu, true);
      window.removeEventListener("keydown", blockShortcuts, true);
      window.removeEventListener("resize", checkDevTools);
      clearInterval(interval);
      observer.disconnect();
      document.body.classList.remove('devtools-locked');
    };
  }, [user]);

  // Screen for Rooted/Jailbroken devices
  if (isCompromised) {
    return (
      <div className="fixed inset-0 z-[9999999] bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold text-red-500 mb-4">Security Violation Detected</h1>
        <p className="text-gray-300 max-w-md">
          Brilliant Academy cannot be run on a rooted, modified, or emulated device. This security policy is in place to protect premium educational content. The application will close automatically.
        </p>
      </div>
    );
  }

  // Hardened Security Screen for DevTools Violation
  if (isDevToolsDetected) {
    return (
      <div 
        id="security-violation-modal"
        ref={modalRef}
        className="fixed inset-0 z-[9999999] bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-3xl"
        style={{ pointerEvents: 'auto' }}
      >
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
