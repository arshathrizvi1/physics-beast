"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface JitsiPlayerProps {
  roomName: string;
  liveClassId?: string;
  userId?: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

export default function JitsiPlayer({
  roomName,
  userName,
  userEmail,
  isAdmin,
  liveClassId,
  userId
}: JitsiPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [micAllowed, setMicAllowed] = useState(false);
  const [apiRef, setApiRef] = useState<any>(null);

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
        setApiRef(api);
        
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

    
  useEffect(() => {
    if (isAdmin || !liveClassId || !userId) return;
    
    const presenceRef = doc(db, 'presence', `live_${liveClassId}_${userId}`);
    const unsub = onSnapshot(presenceRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMicAllowed(!!data.micAllowed);
        
        // If mic permission is revoked by teacher
        if (data.micAllowed === false && apiRef) {
           try {
             apiRef.executeCommand('muteEveryone', 'audio'); // They can't mute everyone if not admin, but they can mute themselves
           } catch (e) {}
        }
      }
    });
    return () => unsub();
  }, [isAdmin, liveClassId, userId, apiRef]);

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
      
      {micAllowed && !isAdmin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <button 
            onClick={() => {
              if (apiRef) {
                apiRef.executeCommand('toggleAudio');
                // Auto lower hand
                setDoc(doc(db, 'presence', `live_${liveClassId}_${userId}`), { handRaised: false, micAllowed: false }, { merge: true });
              }
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(34,197,94,0.6)] flex items-center gap-2"
          >
            <Mic className="w-5 h-5" /> Teacher allowed Mic! Click to Unmute
          </button>
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
