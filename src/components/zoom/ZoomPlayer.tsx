"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Maximize, Minimize, Video } from "lucide-react";

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
    if (typeof window !== "undefined") {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isCap = (window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isNative;
      setIsNative(isMobile || isCap);
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

  const handleLaunchMobile = () => {
    // The user wants total control: auto-fill name, hide top bar, and disable renaming.
    // The official Zoom PWA (zoom.us) DOES NOT ALLOW hiding the top bar or disabling rename.
    // Client View SDK crashes on WebCodecs on Mobile.
    // The ONLY solution is Component View, configured as a top-level fullscreen redirect
    // with aggressive CSS to hide the header and participant list (rename button), and 
    // force a pitch black background so it looks exactly like the native app.
    const customMobileUrl = "/zoom-mobile-frame.html?mn=" + meetingNumber + "&pwd=" + password + "&name=" + encodeURIComponent(userName) + "&email=" + encodeURIComponent(userEmail) + "&role=" + role;
    window.location.href = customMobileUrl;
  };

  if (isNative) {
    return (
      <div className="w-full h-full min-h-[500px] relative bg-zinc-900 rounded-lg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
          <Video className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Live Class is Ready</h3>
        <p className="text-zinc-400 mb-8 max-w-sm">
          Tap the button below to join the class. When the class is over, use your phone's back button to return.
        </p>
        <button 
          onClick={handleLaunchMobile}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-10 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-3"
        >
          <Video className="w-5 h-5" />
          Join Class Now
        </button>
      </div>
    );
  }

  const params = new URLSearchParams({
    mn: meetingNumber,
    name: userName,
    email: userEmail,
    pwd: password,
    role: role.toString(),
  });
  const iframeSrc = "/zoom-frame.html?v=101&" + params.toString();

  return (
    <div ref={containerRef} className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px]">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Preparing Meeting Environment...</p>
        </div>
      )}

      <button 
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-20 bg-black/70 text-white p-2.5 rounded-full hover:bg-black transition-colors border border-white/10 shadow-lg flex items-center justify-center"
        aria-label="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      <iframe 
        src={iframeSrc} 
        className="w-full h-full border-0 absolute inset-0 z-0" 
        allow="camera; microphone; display-capture; fullscreen; autoplay" 
        allowFullScreen={true} 
        onLoad={() => setIframeLoaded(true)} 
      />
    </div>
  );
}
