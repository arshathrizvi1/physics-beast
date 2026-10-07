"use client";

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useRoomContext
} from '@livekit/components-react';
import '@livekit/components-styles';

interface LiveKitPlayerProps {
  roomName: string;
  user: any;
  isAdmin?: boolean;
}

export default function LiveKitPlayer({ roomName, user, isAdmin }: LiveKitPlayerProps) {
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!user || !roomName) return;
    
    // Fetch a token for the room
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            participantIdentity: user.uid,
            participantName: user.displayName || user.name || 'Student',
            isAdmin: isAdmin
          })
        });
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
        }
      } catch (e) {
        console.error("Failed to fetch LiveKit token", e);
      }
    };
    fetchToken();
  }, [roomName, user, isAdmin]);

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800 p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-medium">Connecting to Virtual Classroom...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={isAdmin} // Automatically turn on camera if admin
      audio={isAdmin} // Automatically turn on mic if admin
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      className="h-[600px] w-full rounded-xl overflow-hidden border border-zinc-800 shadow-2xl"
    >
      {/* The default VideoConference component handles grid layout, chat, and participants */}
      <VideoConference />
      
      {/* Render audio from the room */}
      <RoomAudioRenderer />
      
      {/* If it's a student, we can optionally hide the control bar entirely or customize it. 
          By default, LiveKit handles permissions gracefully (buttons will be disabled if no publish grants) */}
    </LiveKitRoom>
  );
}
