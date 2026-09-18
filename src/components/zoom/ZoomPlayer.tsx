"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface ZoomPlayerProps {
  meetingNumber: string;
  userName: string;
  userEmail: string;
  password?: string;
  role?: number; // 0 for attendee, 1 for host
}

export default function ZoomPlayer({
  meetingNumber,
  userName,
  userEmail,
  password = "",
  role = 0,
}: ZoomPlayerProps) {
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let client: any = null;

    const loadZoomScript = () => {
      return new Promise<any>((resolve, reject) => {
        if ((window as any).ZoomMtgEmbedded) return resolve((window as any).ZoomMtgEmbedded);
        
        const oldDefine = (window as any).define;
        const oldExports = (window as any).exports;
        const oldModule = (window as any).module;
        (window as any).define = undefined;
        (window as any).exports = undefined;
        (window as any).module = undefined;
        const script = document.createElement("script");
        script.src = "https://source.zoom.us/zoom-meeting-embedded-3.8.0.min.js";
        script.async = true;
        script.onload = () => {
          (window as any).define = oldDefine;
          (window as any).exports = oldExports;
          (window as any).module = oldModule;
          resolve((window as any).ZoomMtgEmbedded);
        };
        script.onerror = () => reject(new Error("Failed to load Zoom SDK"));
        document.body.appendChild(script);
      });
    };

    const initZoom = async () => {
      try {
        setLoading(true);

        const ZoomMtgEmbedded = await loadZoomScript();

        // Fetch signature from our secure backend API
        const response = await fetch("/api/zoom/signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingNumber, role }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to get signature");
        }

        const { signature, sdkKey } = data;

        // Initialize Zoom Client
        client = ZoomMtgEmbedded.createClient();

        await client.init({
          zoomAppRoot: meetingContainerRef.current!,
          language: "en-US",
          customize: {
            video: {
              isResizable: true,
              viewSizes: {
                default: { width: "100%", height: "100%" },
              },
            },
            meetingInfo: {
              showMeetingId: false,
              showPasscode: false,
            },
          },
        });

        await client.join({
          sdkKey: sdkKey,
          signature: signature,
          meetingNumber: meetingNumber,
          password: password,
          userName: userName,
          userEmail: userEmail,
        });

        setLoading(false);
      } catch (err: any) {
        console.error("Zoom Init Error:", err);
        setError(err.message || "Failed to initialize Zoom");
        setLoading(false);
      }
    };

    if (meetingContainerRef.current) {
      initZoom();
    }

    return () => {
      if (client) {
        try {
          client.leaveMeeting();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [meetingNumber, userName, userEmail, password, role]);

  return (
    <div className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px]">
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Connecting to Zoom Meeting...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-red-400 p-8 text-center">
          <p className="font-bold text-lg mb-2">Connection Error</p>
          <p>{error}</p>
        </div>
      )}

      <div
        ref={meetingContainerRef}
        className="w-full h-full min-h-[500px]"
        id="zoom-meeting-container"
      />
    </div>
  );
}
