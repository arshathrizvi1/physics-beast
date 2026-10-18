"use client";

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ShadowPlayerWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ShadowPlayerWrapper encapsulates the video player inside a Shadow DOM subtree.
 * 
 * Why this is crucial:
 * Browser extensions like Internet Download Manager (IDM) search for media using:
 * `document.querySelectorAll("video, audio, object, embed")`
 * Because standard DOM queries cannot penetrate shadow boundaries, IDM's content
 * script cannot locate the video element or calculate its bounding coordinates,
 * completely preventing IDM from attaching its floating "Download this video" panel.
 */
export function ShadowPlayerWrapper({ children, className = "", style }: ShadowPlayerWrapperProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (hostRef.current && !hostRef.current.shadowRoot) {
      try {
        const root = hostRef.current.attachShadow({ mode: 'open' });
        const styleEl = document.createElement('style');
        styleEl.textContent = `
          :host {
            display: block;
            width: 100%;
            height: 100%;
            position: absolute;
            inset: 0;
            overflow: hidden;
          }
          video {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain;
          }
          div {
            width: 100%;
            height: 100%;
          }
        `;
        root.appendChild(styleEl);
        setShadowRoot(root);
      } catch (err) {
        console.warn("Shadow DOM attachment failed, falling back to light DOM:", err);
      }
    }
  }, []);

  return (
    <div ref={hostRef} className={className} style={style}>
      {shadowRoot ? createPortal(children, shadowRoot) : children}
    </div>
  );
}
