'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';
import { extractYoutubeId } from '@/lib/playerDeviceControl';

export interface ProtectedYouTubePlayerProps {
  videoId?: string;
  url?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onProgress?: (progress: { played: number; playedSeconds: number }) => void;
}

export function ProtectedYouTubePlayer({
  videoId,
  url,
  title = 'Course Lecture',
  className = '',
  autoPlay = false,
}: ProtectedYouTubePlayerProps) {
  const [idmBlocked, setIdmBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract clean 11-char YouTube ID
  const resolvedVideoId = React.useMemo(() => {
    if (videoId && videoId.trim().length > 0) return videoId.trim();
    if (url) {
      const extracted = extractYoutubeId(url);
      if (extracted) return extracted;
    }
    return '';
  }, [videoId, url]);

  // Strip injected IDM attributes and lock down player
  const triggerIdmLockdown = useCallback((element?: Element | null) => {
    setIdmBlocked(true);
    if (element) {
      try {
        element.removeAttribute('__idm_id__');
        element.removeAttribute('__idm_frm__');
      } catch {
        // Ignore attribute removal failures on unmounted nodes
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Initial & periodic scan for IDM DOM tags or injection wrappers
    const checkIDM = () => {
      try {
        const idmTarget = document.querySelector('[__idm_id__], [__idm_frm__]');
        if (idmTarget) {
          triggerIdmLockdown(idmTarget);
          return;
        }

        // Secondary check: IDM injects floating downloader panels into the body
        const idmElements = document.querySelectorAll(
          'div[id*="__idm"], div[class*="idm-panel"], div[id*="idm_editor"]'
        );
        if (idmElements.length > 0) {
          setIdmBlocked(true);
        }
      } catch {
        // Safe querySelector fallback
      }
    };

    checkIDM();

    // 2. Real-time MutationObserver watching for IDM attribute injections
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes') {
            const attr = mutation.attributeName;
            if (attr === '__idm_id__' || attr === '__idm_frm__') {
              triggerIdmLockdown(mutation.target as Element);
            }
          } else if (mutation.type === 'childList') {
            for (const node of Array.from(mutation.addedNodes)) {
              if (node instanceof HTMLElement) {
                if (node.hasAttribute('__idm_id__') || node.hasAttribute('__idm_frm__')) {
                  triggerIdmLockdown(node);
                }
              }
            }
          }
        }
      });

      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['__idm_id__', '__idm_frm__'],
      });
    } catch (e) {
      console.warn('[Anti-IDM] MutationObserver unavailable:', e);
    }

    // Check periodically every 2 seconds
    const interval = setInterval(checkIDM, 2000);

    return () => {
      if (observer) observer.disconnect();
      clearInterval(interval);
    };
  }, [triggerIdmLockdown]);

  const handleManualRecheck = () => {
    setChecking(true);
    // Strip attributes globally across document
    try {
      const idmTags = document.querySelectorAll('[__idm_id__], [__idm_frm__]');
      idmTags.forEach((el) => {
        el.removeAttribute('__idm_id__');
        el.removeAttribute('__idm_frm__');
      });
    } catch {}

    setTimeout(() => {
      const stillDetected = document.querySelector('[__idm_id__], [__idm_frm__]');
      if (stillDetected) {
        setIdmBlocked(true);
        setChecking(false);
      } else {
        setIdmBlocked(false);
        setChecking(false);
      }
    }, 600);
  };

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none bg-black rounded-xl border border-zinc-800 ${className}`}
      style={{ minHeight: '320px' }}
    >
      {idmBlocked ? (
        /* High-Security Lockdown Card when IDM attempts to capture stream */
        <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white min-h-[380px] border-2 border-red-600/70 rounded-xl shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 ring-8 ring-red-500/5 animate-pulse">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 text-xs font-semibold mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Anti-Piracy Lock Active</span>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
            Download Tool Detected
          </h3>

          <p className="text-sm text-zinc-300 max-w-md mb-2">
            Internet Download Manager (IDM) or an external video downloader extension has been detected hooking into the video stream.
          </p>

          <p className="text-xs text-zinc-400 max-w-lg mb-6 leading-relaxed">
            To protect teacher copyrighted lectures, video streaming is temporarily suspended. Please disable the IDM extension in your browser extensions manager and refresh the page.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleReload}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-lg shadow-red-900/30 transition-all duration-150 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>I Disabled It, Reload Page</span>
            </button>

            <button
              onClick={handleManualRecheck}
              disabled={checking}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              <span>{checking ? 'Scanning...' : 'Re-check Now'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Protected YouTube Embed with Anti-Redirection Shield */
        <div className="relative w-full aspect-video bg-black">
          {resolvedVideoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${resolvedVideoId}?autoplay=${
                autoPlay ? '1' : '0'
              }&modestbranding=1&rel=0&disablekb=1&playsinline=1&controls=1&iv_load_policy=3&fs=1`}
              title={title}
              className="absolute inset-0 w-full h-full border-0 rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-zinc-500 text-sm">
              Video source unavailable
            </div>
          )}

          {/* Transparent click-shield over the YouTube header (blocks clicking YouTube title / channel) */}
          <div
            className="absolute top-0 left-0 right-0 h-14 z-10 cursor-default bg-transparent"
            title="Brilliant Academy Protected Stream"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />

          {/* Transparent click-shield over the YouTube watermark in bottom right corner */}
          <div
            className="absolute bottom-2 right-2 w-28 h-10 z-10 cursor-default bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ProtectedYouTubePlayer;
