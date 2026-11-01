"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IsRoot } from '@capgo/capacitor-is-root';
import { App } from '@capacitor/app';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import DisableDevtool from 'disable-devtool';

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

  // 2. Anti-Piracy, Anti-IDM & Anti-Inspect Security Engine
  useEffect(() => {
    // Never lock authentication pages
    if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/register')) {
      return;
    }

    let isPurged = false;

    // Hard Purge Function: Erases all real code, videos, and DOM elements from memory
    const purgeAndLockdown = (reason: 'devtools' | 'idm' = 'devtools') => {
      if (isPurged) return;
      isPurged = true;

      try {
        document.querySelectorAll('video, audio').forEach((media) => {
          try {
            (media as HTMLMediaElement).pause();
            (media as HTMLMediaElement).src = '';
            media.remove();
          } catch {}
        });
      } catch {}

      try { window.stop(); } catch (e) {}

      if (reason === 'idm') {
        document.title = "⚠️ Security Violation: IDM Detected";
        document.body.innerHTML = `
          <div style="position:fixed;inset:0;background:#050505;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px;user-select:none;">
            <div style="width:84px;height:84px;margin-bottom:20px;border-radius:50%;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;box-shadow:0 0 35px rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.3);">
              <svg style="width:48px;height:48px;color:#ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div style="display:inline-block;padding:4px 14px;border-radius:999px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:12px;text-transform:uppercase;">
              DRM Piracy Defense Triggered
            </div>
            <h1 style="color:#ef4444;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin:0 0 12px 0;">Security Violation: IDM / Downloader Detected</h1>
            <p style="color:#a1a1aa;max-width:540px;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
              Internet Download Manager (IDM) or a video downloading extension has been detected on your browser. To protect copyrighted teacher lectures, access to Brilliant Academy is locked down while downloader extensions are active.
            </p>
            <div style="background:#121215;border:1px solid #27272a;padding:20px 24px;border-radius:12px;color:#d4d4d8;font-size:13px;box-shadow:0 4px 24px rgba(0,0,0,0.6);max-width:480px;text-align:left;margin-bottom:24px;">
              <div style="font-weight:700;color:#f87171;margin-bottom:10px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
                How to restore access:
              </div>
              <ol style="margin:0;padding-left:20px;line-height:1.9;color:#a1a1aa;">
                <li>Open your browser extensions (<code style="background:#27272a;padding:2px 6px;border-radius:4px;color:#facc15;">chrome://extensions</code> or Edge Add-ons).</li>
                <li>Toggle <strong style="color:#ffffff;">OFF</strong> or remove the <strong style="color:#f87171;">IDM Integration Module</strong>.</li>
                <li>Close or exit Internet Download Manager from your Windows taskbar tray.</li>
                <li>Click the button below to refresh the page.</li>
              </ol>
            </div>
            <button onclick="window.location.reload()" style="background:#dc2626;color:#ffffff;border:none;padding:12px 32px;font-size:14px;font-weight:700;border-radius:8px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(220,38,38,0.4);">
              I Turned Off IDM &mdash; Refresh Page
            </button>
          </div>
        `;
      } else {
        document.title = "⚠️ Security Violation: Content Erased";
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
      }
    };

    // Global listener for anti-piracy IDM alert event
    const handleIdmAlert = () => {
      purgeAndLockdown('idm');
    };
    window.addEventListener('anti-piracy-idm-detected', handleIdmAlert);

    // K. Comprehensive Anti-IDM & Video Downloader Sniffer (Active for ALL roles)
    const checkIdmExtensions = () => {
      if (isPurged) return;

      try {
        // 1. Direct attribute check on videos/iframes/elements
        const idmTarget = document.querySelector('[__idm_id__], [__idm_frm__], [__idm_handle__], [__idm_displayed__]');
        if (idmTarget) {
          purgeAndLockdown('idm');
          return;
        }

        // 2. Class and ID checks for IDM extension panels
        const idmSelector = 'div[id*="idm" i], div[class*="idm" i], a[id*="idm" i], button[id*="idm" i], span[id*="idm" i], #idm_select, #idm_menu, #idm_panel, .idm_downloader, .idm-panel';
        const idmEls = document.querySelectorAll(idmSelector);
        for (let i = 0; i < idmEls.length; i++) {
          const el = idmEls[i];
          const idCls = `${el.id} ${typeof el.className === 'string' ? el.className : ''}`.toLowerCase();
          if (idCls.includes('idm_') || idCls.includes('idm-') || idCls.includes('idm_select') || idCls.includes('idm_menu') || idCls.includes('idm_downloader')) {
            purgeAndLockdown('idm');
            return;
          }
        }

        // 3. Text content matching IDM's injected floating buttons
        const candidates = document.querySelectorAll('button, div, a, span');
        for (let i = 0; i < candidates.length; i++) {
          const el = candidates[i];
          if (el.children.length <= 3) {
            const txt = (el.textContent || '').trim();
            if (
              txt.includes('Download this video') ||
              txt.includes('Download video from this page') ||
              txt.includes('Download with IDM')
            ) {
              purgeAndLockdown('idm');
              return;
            }
          }
        }
      } catch {}
    };

    // K2. Anti-IDM MutationObserver: Traps instant DOM injection by IDM Extension
    const idmObserver = new MutationObserver((mutations) => {
      if (isPurged) return;
      for (const m of mutations) {
        if (m.type === 'attributes') {
          const attr = m.attributeName?.toLowerCase() || '';
          if (attr.includes('__idm') || attr.includes('idm_')) {
            purgeAndLockdown('idm');
            return;
          }
        } else if (m.type === 'childList') {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node instanceof HTMLElement) {
              const id = node.id || '';
              const cls = typeof node.className === 'string' ? node.className : '';
              const txt = (node.textContent || '').trim();
              if (
                node.hasAttribute('__idm_id__') ||
                node.hasAttribute('__idm_frm__') ||
                node.hasAttribute('__idm_handle__') ||
                id.toLowerCase().includes('idm_') ||
                cls.toLowerCase().includes('idm_') ||
                txt.includes('Download video from this page') ||
                txt.includes('Download this video')
              ) {
                purgeAndLockdown('idm');
                return;
              }
            }
          }
        }
      }
    });

    idmObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['__idm_id__', '__idm_frm__', '__idm_handle__', '__idm_displayed__'],
    });

    // Check IDM immediately and continuously every 400ms
    checkIdmExtensions();
    const idmCheckInterval = setInterval(checkIdmExtensions, 400);

    // If Admin/Teacher, exempt them from DevTools & shortcut locks, but keep IDM checks active
    const isAdmin = user?.role === 'admin' || user?.role === 'teacher';
    if (isAdmin) {
      return () => {
        window.removeEventListener('anti-piracy-idm-detected', handleIdmAlert);
        clearInterval(idmCheckInterval);
        idmObserver.disconnect();
      };
    }

    // A. Intercept Right-Click Context Menu everywhere (Students only)
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);

    // B. Block Shortcuts (F12, Ctrl+Shift+I/J/C/M, Ctrl+U, Ctrl+S, Ctrl+P) (Students only)
    const blockShortcuts = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();

      if (
        e.key === "F12" ||
        (isCmdOrCtrl && e.shiftKey && ["I", "J", "C", "M"].includes(key)) ||
        (isCmdOrCtrl && ["U", "S", "P"].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        purgeAndLockdown('devtools');
        return false;
      }
    };
    window.addEventListener("keydown", blockShortcuts, true);

    // C. Anti-Snipping Tool & Window Focus Blackout
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

    // E. Block Browser Screen Recording Extensions
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.getDisplayMedia = () => {
          purgeAndLockdown('devtools');
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

    // G. DevTools Dimension Detection (Standard Docked Check)
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > 220 || heightDiff > 320) {
        purgeAndLockdown('devtools');
      }
    };

    // H. Mobile Preview & Device Mode Emulation Detection (Catches DevTools Responsive Mode on Reload)
    const checkMobileEmulation = () => {
      if (typeof window === 'undefined') return;
      const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
      if (isNative) return;

      const availWidth = window.screen?.availWidth || window.screen?.width || 0;
      const isDesktopScreen = availWidth >= 800;
      const isMobileSizedViewport = window.innerWidth <= 700;
      const isDesktopPlatform = /Win32|Win64|Windows|Macintosh|MacIntel|Linux x86_64/i.test(navigator.userAgent || navigator.platform);

      // Desktop machine with a simulated mobile viewport -> DevTools responsive mode
      if (isDesktopScreen && isMobileSizedViewport && isDesktopPlatform) {
        purgeAndLockdown('devtools');
        return;
      }

      // Spoofed iOS UA check on desktop (Chrome device toolbar set to iPhone)
      const isSpoofedIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) && (!!(window as any).chrome || navigator.vendor !== 'Apple Computer, Inc.');
      if (isSpoofedIos) {
        purgeAndLockdown('devtools');
        return;
      }

      // Spoofed Android UA check on desktop (Chrome device toolbar set to Pixel/Galaxy)
      const isSpoofedAndroid = /Android/i.test(navigator.userAgent) && /Win32|Win64|MacIntel/i.test(navigator.platform);
      if (isSpoofedAndroid) {
        purgeAndLockdown('devtools');
        return;
      }
    };

    // I. Initial checks immediately upon page load / refresh
    checkMobileEmulation();
    checkDevTools();

    window.addEventListener("resize", checkDevTools, { passive: true });
    window.addEventListener("resize", checkMobileEmulation, { passive: true });
    const interval = setInterval(() => {
      checkDevTools();
      checkMobileEmulation();
    }, 1500);

    // J. disable-devtool engine integration (catches debugger, console, element inspect)
    try {
      DisableDevtool({
        ondevtoolopen() {
          purgeAndLockdown('devtools');
        },
        disableMenu: true,
        interval: 800,
      });
    } catch (e) {}

    return () => {
      window.removeEventListener('anti-piracy-idm-detected', handleIdmAlert);
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
      window.removeEventListener("resize", checkMobileEmulation);
      clearInterval(interval);
      clearInterval(idmCheckInterval);
      idmObserver.disconnect();
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
