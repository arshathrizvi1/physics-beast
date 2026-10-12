"use client";

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { IsRoot } from '@capgo/capacitor-is-root';
import { App } from '@capacitor/app';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export function SecurityEnforcer() {
  const { user } = useAuth();
  const pathname = usePathname();
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

  // 2. Anti-DevTools & Anti-Inspection Engine (Students & Guests)
  useEffect(() => {
    // A. Admins & Teachers are completely exempt
    if (user?.role === 'admin' || user?.role === 'teacher') {
      setIsDevToolsDetected(false);
      document.body.classList.remove('devtools-locked');
      return;
    }

    // B. Never lock authentication pages (login / register)
    if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/register')) {
      setIsDevToolsDetected(false);
      document.body.classList.remove('devtools-locked');
      return;
    }

    // C. Intercept Right-Click Context Menu everywhere
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);

    // D. Block DevTools, Inspect, and Source Shortcuts
    const blockShortcuts = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();

      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && ["I", "J", "C"].includes(key)) ||
        (isCmdOrCtrl && ["U", "S", "P"].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    window.addEventListener("keydown", blockShortcuts, true);

    // E. Accurate DevTools Dimension Detection
    // Normal browser toolbars/borders: width diff is ~16px, height diff is ~140-190px (title+tabs+URL+bookmarks).
    // Docked DevTools drawer is at least 250px on width, and adds at least 250px on height.
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      // DevTools docked to side (>220px) OR DevTools docked to bottom (>320px)
      const isDockedSide = widthDiff > 220;
      const isDockedBottom = heightDiff > 320;

      if (isDockedSide || isDockedBottom) {
        setIsDevToolsDetected(true);
        document.body.classList.add('devtools-locked');
      } else {
        setIsDevToolsDetected(false);
        document.body.classList.remove('devtools-locked');
      }
    };

    window.addEventListener("resize", checkDevTools, { passive: true });
    const interval = setInterval(checkDevTools, 400);
    checkDevTools();

    return () => {
      window.removeEventListener("contextmenu", blockContextMenu, true);
      document.removeEventListener("contextmenu", blockContextMenu, true);
      window.removeEventListener("keydown", blockShortcuts, true);
      window.removeEventListener("resize", checkDevTools);
      clearInterval(interval);
      document.body.classList.remove('devtools-locked');
    };
  }, [user, pathname]);

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

  // Security Screen for DevTools Violation
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
