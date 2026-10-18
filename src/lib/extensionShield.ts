/**
 * Extension Shield - Anti-Piracy & Media Downloader Sniffer Detection
 * 
 * Deeply intercepts and neutralizes extensions like Internet Download Manager (IDM),
 * Video DownloadHelper, Ant Download Manager, and generic media rippers.
 */

// Official IDM protocol handshake codes (0x49444D31 to 0x49444D37)
// Found in IDM's official extension: content.js (line 16) and document.js (line 7-10)
const IDM_CODES = new Set([
  1229212977, // IDM1 - document.js initialization handshake
  1229212978, // IDM2 - content.js initialization reply
  1229212979, // IDM3 - hook status
  1229212980, // IDM4 - intercepted media request
  1229212981, // IDM5 - query elements
  1229212982, // IDM6 - query response
  1229212983  // IDM7 - hook command
]);

/**
 * Scans the DOM and active JavaScript environment for any IDM or download tool signatures.
 */
export function scanForDownloadTools(): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  // 1. Check IDM extension global hooks on window
  const win = window as any;
  if (win.__idm_init__ || win.__idm_connect__ || win.idm) {
    return 'Internet Download Manager (IDM)';
  }

  // 2. Scan all media elements (video, audio, source, iframe)
  const mediaElements = document.querySelectorAll('video, audio, source');
  for (const media of Array.from(mediaElements)) {
    const m = media as any;

    // Direct properties attached to HTMLVideoElement by IDM's content.js (lines 17-19)
    if (m.h && typeof m.h === 'string' && m.h.includes('idmrs:')) {
      return 'Internet Download Manager (IDM)';
    }
    if (m.j && m.m) {
      return 'Internet Download Manager (IDM)';
    }

    // Attributes injected by download tools
    if (
      media.hasAttribute('__idm_id__') ||
      media.hasAttribute('data-idm-id') ||
      media.hasAttribute('idm_id') ||
      media.hasAttribute('__idm_uri__') ||
      media.hasAttribute('__idm_obs__')
    ) {
      return 'Internet Download Manager (IDM)';
    }
    if (
      media.hasAttribute('vdh-video') ||
      (media as HTMLElement).dataset?.vdh !== undefined
    ) {
      return 'Video DownloadHelper';
    }
    if (
      media.className &&
      typeof media.className === 'string' &&
      media.className.includes('ant-dm-')
    ) {
      return 'Ant Download Manager';
    }
    if (
      media.hasAttribute('download-manager-attached') ||
      media.hasAttribute('data-downloader')
    ) {
      return 'Media Downloader Extension';
    }
  }

  // 3. Scan for injected download panels/overlays
  const overlayElements = document.querySelectorAll(
    '[class*="idm-"], [id*="idm-"], [id*="idm_"], [class*="ant-dm-"], [class*="download-panel"], [id*="download-panel"], [class*="vdh-"]'
  );
  for (const el of Array.from(overlayElements)) {
    const id = (el.id || '').toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();

    if (
      id.includes('idm_editor') ||
      id.includes('idm-') ||
      id.includes('idm_') ||
      cls.includes('idm-panel') ||
      cls.includes('idm-') ||
      cls.includes('ant-dm-') ||
      cls.includes('download-panel')
    ) {
      return 'Video Downloader / Media Ripper';
    }
  }

  return null;
}

/**
 * Starts real-time defense against download manager extensions:
 * 1. Intercepts IDM's exact postMessage handshake protocol (1229212977 - 1229212983)
 * 2. Monitors DOM mutations and media element attribute injection
 * 3. Immediately triggers onViolation and severs communication
 */
export function startExtensionShield(onViolation: (toolName: string) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let violationFired = false;
  const triggerViolation = (name: string) => {
    if (!violationFired) {
      violationFired = true;
      onViolation(name);
    }
  };

  // 1. Intercept IDM's internal postMessage communication in capture phase
  const handleWindowMessage = (e: MessageEvent) => {
    if (Array.isArray(e.data) && typeof e.data[0] === 'number' && IDM_CODES.has(e.data[0])) {
      // Sever IDM's communication loop
      try {
        e.stopImmediatePropagation();
        e.stopPropagation();
      } catch {}
      triggerViolation('Internet Download Manager (IDM)');
    }
  };
  window.addEventListener('message', handleWindowMessage, true);

  // 2. Initial environment check
  const initialTool = scanForDownloadTools();
  if (initialTool) {
    triggerViolation(initialTool);
  }

  // 3. MutationObserver to catch any attribute or element injection
  const observer = new MutationObserver((mutations) => {
    if (violationFired) return;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target as any;
        if (
          target.h?.includes?.('idmrs:') ||
          (target.j && target.m) ||
          target.hasAttribute?.('__idm_id__') ||
          target.hasAttribute?.('__idm_uri__') ||
          target.hasAttribute?.('vdh-video')
        ) {
          triggerViolation('Internet Download Manager (IDM) / Video Sniffer');
          return;
        }
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node: any) => {
          if (node.nodeType === 1) {
            const id = (node.id || '').toLowerCase();
            const className = (typeof node.className === 'string' ? node.className : '').toLowerCase();
            if (
              id.includes('idm_editor') ||
              id.includes('idm-') ||
              id.includes('idm_') ||
              className.includes('idm-') ||
              id.includes('fdm') ||
              id.includes('download-panel') ||
              className.includes('download-panel') ||
              className.includes('ant-dm-')
            ) {
              try { node.remove(); } catch (e) {}
              triggerViolation('Media Downloader Extension');
            }
          }
        });
      }
    }

    const tool = scanForDownloadTools();
    if (tool) {
      triggerViolation(tool);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      '__idm_id__',
      'data-idm-id',
      'idm_id',
      '__idm_uri__',
      '__idm_obs__',
      'vdh-video',
      'data-vdh',
      'download-manager-attached',
      'class'
    ]
  });

  return () => {
    window.removeEventListener('message', handleWindowMessage, true);
    observer.disconnect();
  };
}
