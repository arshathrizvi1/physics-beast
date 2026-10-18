/**
 * Extension Shield - Anti-Piracy & Media Downloader Sniffer Detection
 * 
 * Intercepts and detects extensions like Internet Download Manager (IDM),
 * Video DownloadHelper, Ant Download Manager, and generic media rippers
 * that inject attributes or DOM elements to sniff media streams.
 */

// Signatures of known downloader extensions
export const EXTENSION_SIGNATURES = {
  idm: (el: Element) =>
    el.hasAttribute('__idm_id__') ||
    el.hasAttribute('data-idm-id') ||
    el.hasAttribute('idm_id'),
  videoDownloadHelper: (el: Element) =>
    el.hasAttribute('vdh-video') ||
    (el as HTMLElement).dataset?.vdh !== undefined,
  antDownloadManager: (el: Element) =>
    typeof el.className === 'string' && el.className.includes('ant-dm-'),
  genericDownloader: (el: Element) =>
    el.hasAttribute('download-manager-attached') ||
    el.hasAttribute('data-downloader') ||
    el.hasAttribute('data-sniffed')
};

/**
 * Scans the DOM for any injected extension attributes or elements.
 * Returns the name of the detected tool, or null if clean.
 */
export function scanForDownloadTools(): string | null {
  if (typeof document === 'undefined') return null;

  // 1. Scan all media elements (video, audio, source)
  const mediaElements = document.querySelectorAll('video, audio, source');
  for (const media of Array.from(mediaElements)) {
    if (EXTENSION_SIGNATURES.idm(media)) return 'Internet Download Manager (IDM)';
    if (EXTENSION_SIGNATURES.videoDownloadHelper(media)) return 'Video DownloadHelper';
    if (EXTENSION_SIGNATURES.antDownloadManager(media)) return 'Ant Download Manager';
    if (EXTENSION_SIGNATURES.genericDownloader(media)) return 'Media Sniffer Extension';
  }

  // 2. Scan for injected download panels/overlays
  const overlayElements = document.querySelectorAll(
    '[class*="idm-"], [id*="idm-"], [id*="idm_"], [class*="ant-dm-"], [class*="download-panel"], [id*="download-panel"], [class*="vdh-"]'
  );
  for (const el of Array.from(overlayElements)) {
    const id = (el.id || '').toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();

    // Check specific known injected panels while ignoring general site UI elements
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
 * Starts a MutationObserver to listen for DOM mutations caused by download extensions.
 * Returns a cleanup function to disconnect the observer.
 */
export function startExtensionShield(onViolation: (toolName: string) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // Initial check in case extension was already attached
  const initialTool = scanForDownloadTools();
  if (initialTool) {
    onViolation(initialTool);
    return () => {};
  }

  const observer = new MutationObserver((mutations) => {
    let violationFound: string | null = null;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLElement;
        if (EXTENSION_SIGNATURES.idm(target)) {
          violationFound = 'Internet Download Manager (IDM)';
          break;
        }
        if (EXTENSION_SIGNATURES.videoDownloadHelper(target)) {
          violationFound = 'Video DownloadHelper';
          break;
        }
        if (EXTENSION_SIGNATURES.antDownloadManager(target)) {
          violationFound = 'Ant Download Manager';
          break;
        }
        if (EXTENSION_SIGNATURES.genericDownloader(target)) {
          violationFound = 'Media Sniffer Extension';
          break;
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
              violationFound = 'Media Downloader Extension';
            }
          }
        });
        if (violationFound) break;
      }
    }

    if (!violationFound) {
      violationFound = scanForDownloadTools();
    }

    if (violationFound) {
      observer.disconnect();
      onViolation(violationFound);
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
      'vdh-video',
      'data-vdh',
      'download-manager-attached',
      'data-downloader',
      'class'
    ]
  });

  return () => observer.disconnect();
}
