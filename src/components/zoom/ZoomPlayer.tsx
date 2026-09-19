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

  useEffect(() => {
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const capCheck = (window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isNative;
    setIsMobile(mobileCheck || capCheck);

    if (mobileCheck || capCheck) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          setPermissionsGranted(true);
        })
        .catch(err => {
          console.warn("User or OS denied media permissions.", err);
          setPermissionsGranted(true);
        });
    } else {
      setPermissionsGranted(true);
    }
  }, []);

  useEffect(() => {
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

  const params = new URLSearchParams({
    mn: meetingNumber,
    name: userName,
    email: userEmail,
    pwd: password,
    role: role.toString(),
  });
  
  // Mobile MUST use Component View because Client View strictly throws 4003 on WebView engines
  // despite any UserAgent spoofing. We embed it inside the iframe so it doesn't open in a new window.
  const iframeSrc = isMobile 
    ? "/zoom-mobile.html?v=18&" + params.toString()
    : "/zoom-frame.html?v=120&" + params.toString();

  return (
    <div ref={containerRef} className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px]">
      {(!iframeLoaded || !permissionsGranted) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>{permissionsGranted ? "Preparing Meeting Environment..." : "Requesting Camera & Mic Permissions..."}</p>
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





















