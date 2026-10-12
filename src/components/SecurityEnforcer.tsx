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

  // 1. Native Mobile Security (Root/Jailbreak detection)
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

  // 2. Complete Anti-Recording, Anti-Screenshot, & Anti-Inspect Suite
  useEffect(() => {
    // Admins and Teachers are completely exempt
    if (user?.role === 'admin' || user?.role === 'teacher') {
      return;
    }

    // Never lock authentication pages
    if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/register')) {
      return;
    }

    let isPurged = false;

    // Hard Purge Function: Erases all real code, videos, and DOM elements from memory
    const purgeAndLockdown = () => {
      if (isPurged) return;
      isPurged = true;

      try { window.stop(); } catch (e) {}

      document.body.innerHTML = `
        <div style="position:fixed;inset:0;background:#050505;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px;user-select:none;">
          <div style="width:84px;height:84px;margin-bottom:24px;border-radius:50%;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(239,68,68,0.2);">
            <svg style="width:48px;height:48px;color:#ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 style="color:#ef4444;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin:0 0 12px 0;">Security Violation: Content Erased</h1>
          <p style="color:#a1a1aa;max-width:520px;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
            Developer tools or screen capture tampering has been detected. All video streams, source code, and page content have been completely erased from memory to protect copyright.
          </p>
          <div style="background:#18181b;border:1px solid #27272a;padding:12px 28px;border-radius:12px;color:#71717a;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
            Please close Developer Tools and <strong style="color:#ffffff;">refresh the page</strong> to return to normal.
          </div>
        </div>
      `;
    };

    // A. Intercept Right-Click Context Menu everywhere
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);

    // B. Block Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P)
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

    // C. Anti-Snipping Tool & Window Focus Blackout
    // When a student opens Snipping Tool (Win+Shift+S) or clicks outside to an external recorder,
    // the window immediately loses focus. We blackout all videos and media instantly!
    const handleBlur = () => {
      document.body.classList.add('window-unfocused-blur');
    };
    const handleFocus = () => {
      document.body.classList.remove('window-unfocused-blur');
    };
    const handleVisibility = () => {
      if (document.hidden) {
        document.body.classList.add('window-unfocused-blur');
      } else {
        document.body.classList.remove('window-unfocused-blur');
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // D. Clipboard Poisoning on PrintScreen Key
    // If student presses PrintScreen, overwrite the clipboard with a copyright warning
    const handlePrintScreen = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        try {
          const warningMsg = `⚠️ COPYRIGHT WARNING: Screen capture and distribution is strictly prohibited on Brilliant Academy. User: ${user?.email || user?.phone || 'Student'}`;
          navigator.clipboard.writeText(warningMsg);
        } catch (err) {}
      }
    };
    window.addEventListener("keyup", handlePrintScreen);
    window.addEventListener("keydown", handlePrintScreen);

    // E. Block Browser Screen Recording Extensions (navigator.mediaDevices.getDisplayMedia)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.getDisplayMedia = () => {
          purgeAndLockdown();
          return Promise.reject(new DOMException("Screen recording is prohibited by security policy", "NotAllowedError"));
        };
      } catch (err) {}
    }

    // F. Prevent Dragging Media Out of Window
    const blockDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };
    window.addEventListener("dragstart", blockDrag);

    // G. DevTools Dimension Detection (Triggers purge if docked drawer opens)
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > 220 || heightDiff > 320) {
        purgeAndLockdown();
      }
    };

    window.addEventListener("resize", checkDevTools, { passive: true });
    const interval = setInterval(checkDevTools, 400);

    // H. Anti-Tamper Observer: Catches modifications made in DevTools
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
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("keyup", handlePrintScreen);
      window.removeEventListener("keydown", handlePrintScreen);
      window.removeEventListener("dragstart", blockDrag);
      window.removeEventListener("resize", checkDevTools);
      clearInterval(interval);
      observer.disconnect();
      document.body.classList.remove('window-unfocused-blur');
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
