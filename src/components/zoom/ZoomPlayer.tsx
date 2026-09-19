"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Maximize, Minimize } from "lucide-react";

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
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams({
    mn: meetingNumber,
    name: userName,
    email: userEmail || 'student@brilliantacademy.com',
    pwd: password || "",
    role: role.toString(),
  });

  useEffect(() => {
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const capCheck = (window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isNative;
    const isMobileDevice = mobileCheck || capCheck;
    setIsMobile(isMobileDevice);

    if (capCheck || mobileCheck) { window.location.href = "/zoom-mobile.html?v=71&" + params.toString(); } else { setPermissionsGranted(true); }
  }, []);

  useEffect(() => {
    if (!isMobile) {
      const handleFullscreenChange = () => {
        const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        setIsFullscreen(isFull);
        document.body.style.overflow = isFull ? "hidden" : "";
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.body.style.overflow = "";
      };
    }
  }, [isMobile]);

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

  const iframeSrc = "/zoom-frame.html?v=121&" + params.toString();

  // If mobile, we are redirecting, so show a cleaner loading state
  if (isMobile) {
    return (
      <div className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Launching Mobile Live Class...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px]">
      {(!iframeLoaded || !permissionsGranted) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Preparing PC Experience...</p>
        </div>
      )}

      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-20 bg-black/70 text-white p-2.5 rounded-full hover:bg-black transition-colors border border-white/10 shadow-lg flex items-center justify-center"
        aria-label="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      {permissionsGranted && (
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0 absolute inset-0 z-0"
          allow="camera; microphone; display-capture; fullscreen; autoplay"
          allowFullScreen={true}
          onLoad={() => setIframeLoaded(true)}
        />
      )}
    </div>
  );
}
