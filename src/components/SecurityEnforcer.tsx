"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IsRoot } from '@capgo/capacitor-is-root';
import { App } from '@capacitor/app';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import DisableDevtool from 'disable-devtool';

// Comprehensive IDM element discriminator with guaranteed zero false positives
// Track all shadow roots created on the page to unmask IDM Shadow DOM injections
const trackedShadowRoots = new Set<ShadowRoot>();

if (typeof window !== 'undefined' && typeof Element !== 'undefined' && !(Element.prototype as any).__IDM_SHADOW_TRAPPED__) {
  (Element.prototype as any).__IDM_SHADOW_TRAPPED__ = true;
  try {
    const origAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init: ShadowRootInit) {
      const shadow = origAttachShadow.call(this, { ...init, mode: 'open' });
      try {
        trackedShadowRoots.add(shadow);
        if (typeof window !== 'undefined') {
          ((window as any).__TRACKED_SHADOW_ROOTS__ = (window as any).__TRACKED_SHADOW_ROOTS__ || new Set()).add(shadow);
        }
      } catch {}
      return shadow;
    };
  } catch {}
}

// Trap setAttribute calls for IDM hook attributes
if (typeof window !== 'undefined' && typeof Element !== 'undefined' && !(Element.prototype as any).__IDM_ATTR_TRAPPED__) {
  (Element.prototype as any).__IDM_ATTR_TRAPPED__ = true;
  try {
    const origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (typeof name === 'string') {
        const n = name.toLowerCase();
        if (
          n.startsWith('__idm') ||
          n.startsWith('data-idm') ||
          n === 'idm_disp' ||
          n === '__idm_id__' ||
          n === '__idm_displayed__' ||
          n === '__idm_frm__' ||
          n === '__idm_handle__'
        ) {
          try {
            window.dispatchEvent(new CustomEvent('anti-piracy-idm-detected'));
          } catch {}
        }
        if (n === 'id' || n === 'class') {
          const val = String(value || '').toLowerCase();
          if (
            val.includes('idm_panel') ||
            val.includes('idm_select') ||
            val.includes('idm_menu') ||
            val.includes('idm_downloader') ||
            val.includes('idm-panel') ||
            val.includes('idm-dl') ||
            val.startsWith('idm_') ||
            val.startsWith('idm-') ||
            val.startsWith('__idm')
          ) {
            try {
              window.dispatchEvent(new CustomEvent('anti-piracy-idm-detected'));
            } catch {}
          }
        }
      }
      return origSetAttribute.call(this, name, value);
    };
  } catch {}
}

function checkIsIdm(node: Element): boolean {
  if (!node) return false;
  if (node.id === 'anti-piracy-screen' || node.closest?.('#anti-piracy-screen')) return false;

  const tag = (node.tagName || '').toUpperCase();
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') {
    return false;
  }
  if (node === document.body || node === document.documentElement) {
    return false;
  }

  // 1. Check ID
  const id = (node.id || '').toLowerCase();
  if (
    id === 'idm_panel' ||
    id === 'idm_select' ||
    id === 'idm_menu' ||
    id.startsWith('idm_') ||
    id.startsWith('idm-') ||
    id.startsWith('__idm') ||
    id.includes('idm_') ||
    id.includes('idm-') ||
    id.includes('idm-panel') ||
    id.includes('idm-dl')
  ) {
    return true;
  }

  // 2. Check classes
  const cls = (typeof node.className === 'string' ? node.className : '').toLowerCase();
  if (
    cls.includes('idm_panel') ||
    cls.includes('idm_downloader') ||
    cls.includes('idm_select') ||
    cls.includes('idm_menu') ||
    cls.includes('idm-panel') ||
    cls.includes('idm-dl') ||
    cls.startsWith('idm_') ||
    cls.startsWith('idm-') ||
    cls.includes(' idm_') ||
    cls.includes(' idm-') ||
    cls.startsWith('__idm')
  ) {
    return true;
  }

  // 3. Check attributes
  if (
    node.hasAttribute('__idm_id__') ||
    node.hasAttribute('__idm_displayed__') ||
    node.hasAttribute('__idm_frm__') ||
    node.hasAttribute('__idm_handle__') ||
    node.hasAttribute('idm_disp') ||
    node.hasAttribute('data-idm-id') ||
    node.hasAttribute('data-idm-video') ||
    node.hasAttribute('data-idm-vreg')
  ) {
    return true;
  }

  // 4. Check JS properties on media elements (strictly !== undefined, NEVER check 'in' operator)
  const anyNode = node as any;
  if (
    anyNode.__idm_id__ !== undefined ||
    anyNode.__idm_displayed__ === true ||
    anyNode.__idm_frm__ !== undefined ||
    anyNode.__idm_handle__ !== undefined ||
    anyNode.__idm_video__ !== undefined ||
    anyNode.idm_disp !== undefined
  ) {
    return true;
  }

  // 5. Check tooltip / title / aria-label
  const title = (node.getAttribute('title') || node.getAttribute('aria-label') || '').toLowerCase();
  if (
    title.includes('download this video') ||
    title.includes('download with idm') ||
    title.includes('idm integration') ||
    title.includes('download video from this page')
  ) {
    return true;
  }

  // 6. Check extension image/iframe sources
  if (tag === 'IMG' || tag === 'IFRAME') {
    const src = (node.getAttribute('src') || '').toLowerCase();
    if (src.includes('chrome-extension://') || src.includes('idm') || src.includes('extension://')) {
      return true;
    }
  }

  // 7. Check text content on candidate elements (no arbitrary children or length limits)
  const rawTxt = (node.textContent || (node as HTMLElement).innerText || '').trim();
  if (rawTxt) {
    // Safe list: protect legitimate academy buttons & notifications
    if (
      rawTxt.includes('Download PDF') ||
      rawTxt.includes('PDF Document') ||
      rawTxt.includes('Statement (PDF)') ||
      rawTxt.includes('BrilliantAcademy.apk') ||
      rawTxt.includes('Download Android App') ||
      rawTxt.includes('DRM Piracy Defense') ||
      rawTxt.includes('Security Violation: IDM') ||
      rawTxt.includes('How to restore access:') ||
      rawTxt.includes('I Turned Off IDM')
    ) {
      return false;
    }

    if (
      rawTxt.includes('Download this video') ||
      rawTxt.includes('Download video from this page') ||
      rawTxt.includes('Download with IDM') ||
      rawTxt.includes('Download all') ||
      (rawTxt.includes('TS file') && rawTxt.includes('kbps')) ||
      (rawTxt.includes('MP4 file') && rawTxt.includes('kbps')) ||
      (rawTxt.includes('file, quality') && rawTxt.includes('kbps')) ||
      rawTxt.includes('IDM Integration') ||
      rawTxt.includes('Internet Download Manager') ||
      rawTxt.includes('Download with Plexo')
    ) {
      return true;
    }
  }

  // 8. Check shadow root if attached
  if (node.shadowRoot) {
    try {
      const shadowChildren = node.shadowRoot.querySelectorAll('*');
      for (let s = 0; s < shadowChildren.length; s++) {
        if (checkIsIdm(shadowChildren[s])) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

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
          <div id="anti-piracy-screen" style="position:fixed;inset:0;background:#050505;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px;user-select:none;">
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
          <div id="anti-piracy-screen" style="position:fixed;inset:0;background:#050505;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px;user-select:none;">
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

    // Intercept IDM Native Messaging Bridge Messages (0x49444D31 - 0x49444D37)
    const handleIdmMessage = (e: MessageEvent) => {
      if (e && e.data && Array.isArray(e.data)) {
        const code = e.data[0];
        if (typeof code === 'number' && code >= 1229212977 && code <= 1229212985) {
          purgeAndLockdown('idm');
        }
      }
    };
    window.addEventListener('message', handleIdmMessage, true);

    // Active Probe: Detects IDM Integration Module even when playing inside cross-origin YouTube iframe
    const probeIdmExtensions = () => {
      if (isPurged) return;
      const IDM_EXTENSION_IDS = [
        'ngpampappnmepgilojfohadhhmbhlaek', // Chrome Web Store official
        'llbjbkhnmlidjebalopleeepgdfgcpec', // Microsoft Edge Add-ons official
        'clhiejnehegdfknplplojohghjaklbae', // Opera Add-ons official
        'egdfhflhcmffeeaagnollpapcijamiih', // CRX unpacked
        'lcdlanlaneooailnebnhamiiieebikid', // Legacy IDM
        'epcnnfbjfcgphgdmggkamkmgojdagdnn', // Edge store alternate IDM
      ];

      for (const extId of IDM_EXTENSION_IDS) {
        // Probe 1: Fetch captured.html (web_accessible_resource with static URL)
        try {
          fetch(`chrome-extension://${extId}/captured.html`, { cache: 'no-store' })
            .then((res) => {
              if (res && (res.ok || res.status === 200 || res.type === 'opaque')) {
                purgeAndLockdown('idm');
              }
            })
            .catch(() => {});
        } catch (e) {}

        // Probe 2: Fetch document.js (web_accessible_resource with static URL)
        try {
          fetch(`chrome-extension://${extId}/document.js`, { cache: 'no-store' })
            .then((res) => {
              if (res && (res.ok || res.status === 200 || res.type === 'opaque')) {
                purgeAndLockdown('idm');
              }
            })
            .catch(() => {});
        } catch (e) {}

        // Probe 3: Dynamic script injection probe (only loads if extension is enabled)
        try {
          const script = document.createElement('script');
          script.src = `chrome-extension://${extId}/document.js`;
          script.onload = () => {
            script.remove();
            purgeAndLockdown('idm');
          };
          script.onerror = () => {
            script.remove();
          };
          (document.head || document.documentElement).appendChild(script);
        } catch (e) {}
      }
    };

    probeIdmExtensions();
    const probeInterval = setInterval(probeIdmExtensions, 1500);

    // K. Comprehensive Anti-IDM & Video Downloader Sniffer (Active across document, shadow roots & media hooks)
    const checkIdmExtensions = () => {
      if (isPurged) return;
      if (typeof document === 'undefined') return;

      try {
        // A. Check window globals
        if (typeof window !== 'undefined') {
          const win = window as any;
          if (
            win.__IDM_DETECTED__ ||
            win.__idm__ ||
            win.idm_ ||
            win.idmInstalled ||
            win.IDM ||
            win.idm_panel ||
            win._idm_
          ) {
            purgeAndLockdown('idm');
            return;
          }
        }

        // B. Check all HTML video and audio elements for properties, attributes, and tags
        const mediaElements = document.querySelectorAll('video, audio');
        for (let i = 0; i < mediaElements.length; i++) {
          if (checkIsIdm(mediaElements[i])) {
            purgeAndLockdown('idm');
            return;
          }
        }

        // C. Fast selector lookup for known IDM classes, IDs, and attributes
        const fastTarget = document.querySelector(
          '[id*="idm_"], [id*="idm-"], [class*="idm_"], [class*="idm-"], [id^="__idm"], [class^="__idm"], #idm_panel, #idm_select, #idm_menu, .idm_downloader, [data-idm-video], [data-idm-vreg]'
        );
        if (fastTarget && !fastTarget.closest('#anti-piracy-screen')) {
          purgeAndLockdown('idm');
          return;
        }

        // D. Check extension resources
        const extElements = document.querySelectorAll(
          'iframe[src*="chrome-extension://"], iframe[src*="idm"], img[src*="chrome-extension://"], img[src*="idm"], embed[type*="idm"], embed[id*="__IDM__"], object[type*="idm"]'
        );
        if (extElements.length > 0) {
          purgeAndLockdown('idm');
          return;
        }

        // E. Scan candidates across entire document body
        const candidates = document.querySelectorAll(
          'div, span, button, a, table, td, tr, p, ul, ol, li, menu, header, section, [title*="download" i], [aria-label*="download" i]'
        );
        for (let j = 0; j < candidates.length; j++) {
          const el = candidates[j];
          if (checkIsIdm(el)) {
            purgeAndLockdown('idm');
            return;
          }
        }

        // F. Scan ALL tracked Shadow Roots (bypasses extension closed shadow isolation)
        const allShadows = new Set<ShadowRoot>([
          ...trackedShadowRoots,
          ...((window as any).__TRACKED_SHADOW_ROOTS__ || []),
        ]);
        for (const shadow of allShadows) {
          try {
            const shadowCandidates = shadow.querySelectorAll('*');
            for (let s = 0; s < shadowCandidates.length; s++) {
              if (checkIsIdm(shadowCandidates[s])) {
                purgeAndLockdown('idm');
                return;
              }
            }
          } catch {}
        }
      } catch {}
    };

    checkIdmExtensions();
    const idmCheckInterval = setInterval(checkIdmExtensions, 120);

    const idmObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes') {
          const target = m.target as Element;
          if (checkIsIdm(target)) {
            purgeAndLockdown('idm');
            return;
          }
        } else if (m.type === 'childList') {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node instanceof Element) {
              if (checkIsIdm(node)) {
                purgeAndLockdown('idm');
                return;
              }
              const descendants = node.querySelectorAll?.('*');
              if (descendants) {
                for (let d = 0; d < descendants.length; d++) {
                  if (checkIsIdm(descendants[d])) {
                    purgeAndLockdown('idm');
                    return;
                  }
                }
              }
              if (node.shadowRoot) {
                try {
                  const shadowAll = node.shadowRoot.querySelectorAll('*');
                  for (let s = 0; s < shadowAll.length; s++) {
                    if (checkIsIdm(shadowAll[s])) {
                      purgeAndLockdown('idm');
                      return;
                    }
                  }
                } catch {}
              }
            }
          }
        }
      }
    });

    if (typeof document !== 'undefined' && document.documentElement) {
      try {
        idmObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      } catch {}
    }

    // If Admin/Teacher, exempt them from DevTools & shortcut locks, but keep IDM checks 100% ACTIVE for EVERYONE
    const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

    // A. Intercept Right-Click Context Menu everywhere (Students only)
    const blockContextMenu = (e: MouseEvent) => {
      if (isAdmin) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);

    // B. Block Shortcuts (F12, Ctrl+Shift+I/J/C/M, Ctrl+U, Ctrl+S, Ctrl+P) (Students only)
    const blockShortcuts = (e: KeyboardEvent) => {
      if (isAdmin) return;
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
      if (isAdmin) return;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > 220 || heightDiff > 320) {
        purgeAndLockdown('devtools');
      }
    };

    // H. Mobile Preview & Device Mode Emulation Detection (Catches DevTools Responsive Mode on Reload)
    const checkMobileEmulation = () => {
      if (isAdmin) return;
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
      if (!isAdmin) {
        DisableDevtool({
          ondevtoolopen() {
            purgeAndLockdown('devtools');
          },
          disableMenu: true,
          interval: 800,
        });
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('anti-piracy-idm-detected', handleIdmAlert);
      window.removeEventListener("contextmenu", blockContextMenu, true);
      document.removeEventListener("contextmenu", blockContextMenu, true);
      window.removeEventListener("keydown", blockShortcuts, true);
      window.removeEventListener("keyup", handlePrintScreen);
      window.removeEventListener("keydown", handlePrintScreen);
      window.removeEventListener("dragstart", blockDrag);
      window.removeEventListener("resize", checkDevTools);
      window.removeEventListener("resize", checkMobileEmulation);
      clearInterval(interval);
      clearInterval(idmCheckInterval);
      clearInterval(probeInterval);
      window.removeEventListener('message', handleIdmMessage, true);
      idmObserver.disconnect();
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
