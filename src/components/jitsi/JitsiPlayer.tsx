"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface JitsiPlayerProps {
  roomName: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

export default function JitsiPlayer({
  roomName,
  userName,
  userEmail,
  isAdmin
}: JitsiPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load the Jitsi external API script
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => {
      setLoading(false);
      if (window.JitsiMeetExternalAPI && containerRef.current) {
        const domain = "meet.jit.si";
        const options = {
          roomName: `BrilliantAcademy_${roomName.replace(/[^a-zA-Z0-9]/g, '')}`,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          userInfo: {
            displayName: userName,
            email: userEmail
          },
          configOverwrite: {
            startWithAudioMuted: !isAdmin,
            startWithVideoMuted: !isAdmin,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
              'security'
            ],
          }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        
        // Example: Admins could theoretically listen to events here
        api.addEventListener('videoConferenceJoined', () => {
          console.log("Joined Jitsi room:", roomName);
        });

        return () => {
          api.dispose();
        };
      }
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [roomName, userName, userEmail, isAdmin]);

  return (
    <div className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px]">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Connecting to Jitsi Classroom...</p>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[500px] absolute inset-0 z-0"
      />
    </div>
  );
}

// Add global type for Jitsi
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}
