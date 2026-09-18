"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Maximize, Minimize, ExternalLink } from "lucide-react";

interface ZoomPlayerProps {
  meetingNumber: string;
  userName: string;
  userEmail: string;
  password?: string;
  role?: number;
}

export default function ZoomPlayer({
  meetingNumber,
  userName,
  userEmail,
  password = "",
  role = 0,
}: ZoomPlayerProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect if we are running inside the Capacitor Android/iOS App
    if (typeof window !== "undefined") {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isCap = (window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isNative;
      setIsNative(isMobile || isCap);
    }
  }, []);

  // Prevent background scrolling when fullscreen is active (especially on Android WebViews in landscape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
      if (isFull) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.body.style.overflow = "";
    };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Construct URL with query parameters
  const params = new URLSearchParams({
    mn: meetingNumber,
    name: userName,
    email: userEmail,
    pwd: password,
    role: role.toString(),
  });

  const iframeSrc = "/zoom-frame.html?v=15&" + params.toString();
  const nativeAppUrl = "zoomus://zoom.us/join?action=join&confno=" + meetingNumber + "&pwd=" + password + "&uname=" + encodeURIComponent(userName);

  if (isNative) {
    return (
      <div className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px] flex flex-col items-center justify-center text-white border border-zinc-800">
        <div className="bg-zinc-800 p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm text-center">
          <div className="bg-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 7.5C4.5 6.11929 5.61929 5 7 5H17C18.3807 5 19.5 6.11929 19.5 7.5V16.5C19.5 17.8807 18.3807 19 17 19H7C5.61929 19 4.5 17.8807 4.5 16.5V7.5Z" fill="white"/>
              <path d="M19.5 9.5L23 7.5V16.5L19.5 14.5V9.5Z" fill="white"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Ready to Join</h3>
          <p className="text-zinc-400 mb-6 text-sm">For the best performance and video quality on mobile, this class requires the native Zoom app.</p>
          <a 
            href={nativeAppUrl}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            Launch Zoom App
            <ExternalLink className="w-4 h-4" />
          </a>
          <a 
            href="https://play.google.com/store/apps/details?id=us.zoom.videomeetings" 
            target="_blank"
            rel="noreferrer"
            className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            Download Zoom from Play Store
          </a>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px]">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Preparing Meeting Environment...</p>
        </div>
      )}

      {/* Custom Fullscreen Button for Mobile App / Browsers without native Zoom button */}
      <button 
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-20 bg-black/70 text-white p-2.5 rounded-full hover:bg-black transition-colors border border-white/10 shadow-lg flex items-center justify-center"
        aria-label="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      <iframe src={iframeSrc} className="w-full h-full border-0 absolute inset-0 z-0" allow="camera; microphone; display-capture; fullscreen" allowFullScreen={true} onLoad={() => setIframeLoaded(true)} />
    </div>
  );
}

