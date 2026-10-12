"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IsRoot } from '@capgo/capacitor-is-root';
import { App } from '@capacitor/app';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export function SecurityEnforcer() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isCompromised, setIsCompromised] = useState(false);

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

  // 2. Hard DOM Purge & Lock on DevTools / Inspect Tampering (Students & Guests)
  useEffect(() => {
    // A. Admins and Teachers are completely exempt
    if (user?.role === 'admin' || user?.role === 'teacher') {
      return;
    }

    // B. Never lock authentication pages
    if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/register')) {
      return;
    }

    let isPurged = false;

    // Hard Purge Function: Erases all real code, videos, and DOM elements from memory
    const purgeAndLockdown = () => {
      if (isPurged) return;
      isPurged = true;

      // Stop all media streams and pending network fetches immediately
      try { window.stop(); } catch (e) {}

      // Completely ERASE document.body: No background elements, no iframes, no React code left in memory
      document.body.innerHTML = `
        <div style="position:fixed;inset:0;background:#050505;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px;user-select:none;">
          <div style="width:84px;height:84px;margin-bottom:24px;border-radius:50%;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(239,68,68,0.2);">
            <svg style="width:48px;height:48px;color:#ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 style="color:#ef4444;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin:0 0 12px 0;">Security Violation: Content Erased</h1>
          <p style="color:#a1a1aa;max-width:520px;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
            Developer tools or element inspection has been detected. All video streams, source code, and page content have been completely erased from memory to protect copyright.
          </p>
          <div style="background:#18181b;border:1px solid #27272a;padding:12px 28px;border-radius:12px;color:#71717a;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
            Please close Developer Tools and <strong style="color:#ffffff;">refresh the page</strong> to return to normal.
          </div>
        </div>
      `;
    };

    // C. Intercept Right-Click Context Menu everywhere
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);

    // D. Block Shortcuts & Trigger Purge if Inspect is pressed
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
        purgeAndLockdown();
        return false;
      }
    };
    window.addEventListener("keydown", blockShortcuts, true);

    // E. DevTools Dimension Detection (Triggers purge if docked drawer opens)
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      // DevTools docked side (>220px) OR DevTools docked bottom (>320px)
      if (widthDiff > 220 || heightDiff > 320) {
        purgeAndLockdown();
      }
    };

    window.addEventListener("resize", checkDevTools, { passive: true });
    const interval = setInterval(checkDevTools, 400);

    // F. The "Single Letter Change in Inspect" Detector:
    // If a student in DevTools edits any text (characterData) or modifies nodes in Inspect
    const observer = new MutationObserver((mutations) => {
      if (isPurged) return;
      const isDevToolsOpen = (window.outerWidth - window.innerWidth > 220) || (window.outerHeight - window.innerHeight > 320);
      if (isDevToolsOpen) {
        for (const m of mutations) {
          if (m.type === 'characterData' || m.type === 'childList') {
            purgeAndLockdown();
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      window.removeEventListener("contextmenu", blockContextMenu, true);
      document.removeEventListener("contextmenu", blockContextMenu, true);
      window.removeEventListener("keydown", blockShortcuts, true);
      window.removeEventListener("resize", checkDevTools);
      clearInterval(interval);
      observer.disconnect();
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

  return null;
}
