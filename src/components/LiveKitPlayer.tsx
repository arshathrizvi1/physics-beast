"use client";

import { useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  GridLayout,
  ParticipantTile,
  ConnectionStateToast,
  Chat,
  LayoutContextProvider,
  FocusLayoutContainer
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

interface LiveKitPlayerProps {
  roomName: string;
  user: any;
  isAdmin?: boolean;
}

function CustomStudioLayout() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (pseudoFull) {
        setPseudoFull(false);
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else {
        // Fallback (e.g. iPhone Safari): cover the whole viewport
        setPseudoFull(true);
      }
    } catch {
      setPseudoFull(true);
    }
  };

  const showingFull = isFull || pseudoFull;

  // Only grab tracks from participants who are actively broadcasting video or screen share!
  // This completely eliminates the empty grey avatars for audio-only or spectator students.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <LayoutContextProvider>
      <div
        ref={rootRef}
        className={`flex w-full bg-black relative ${pseudoFull ? 'fixed inset-0 z-[9999]' : ''}`}
        style={{ height: pseudoFull ? '100dvh' : '100%' }}
      >
        <div className="flex-1 flex flex-col h-full relative border-r border-zinc-800">
          <div className="flex-1 w-full p-2 h-full flex flex-col">
            {tracks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-medium bg-zinc-950 rounded-xl border border-zinc-900 border-dashed m-4">
                <div className="w-16 h-16 mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                  <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                Waiting for broadcaster to turn on camera...
              </div>
            ) : (
              <FocusLayoutContainer>
                <GridLayout tracks={tracks} style={{ height: '100%' }}>
                  <ParticipantTile />
                </GridLayout>
              </FocusLayoutContainer>
            )}
          </div>
          
          {/* Universal Control Bar */}
          <div className="shrink-0 p-3 bg-zinc-950 border-t border-zinc-900 flex justify-center items-center gap-2">
            <ControlBar variation="minimal" controls={{ camera: true, microphone: true, screenShare: true, chat: false, leave: true }} />
            <button
              type="button"
              onClick={toggleFullscreen}
              className="lk-button"
              title={showingFull ? 'Exit full screen' : 'Full screen'}
            >
              {showingFull ? 'Exit Full Screen' : 'Full Screen'}
            </button>
          </div>
        </div>
        
        {/* Chat sidebar fixed on the right */}
        <div className="w-80 h-full bg-zinc-950 flex flex-col hidden md:flex">
          <Chat className="flex-1 border-none bg-transparent" />
        </div>
        
        <ConnectionStateToast />
      </div>
    </LayoutContextProvider>
  );
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
      video={isAdmin}
      audio={isAdmin}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      className="h-full w-full rounded-xl overflow-hidden shadow-2xl"
      style={{ height: '100%', minHeight: '600px' }}
    >
      <CustomStudioLayout />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
