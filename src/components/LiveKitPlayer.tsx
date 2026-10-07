"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  GridLayout,
  ParticipantTile,
  ConnectionStateToast,
  LayoutContextProvider,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useRoomContext,
} from '@livekit/components-react';
import { Track, RoomEvent, VideoPresets, ScreenSharePresets } from 'livekit-client';
import '@livekit/components-styles';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import {
  Hand,
  LogOut,
  Maximize2,
  Minimize2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import LiveChat from '@/components/LiveChat';
import AdminLiveChat from '@/components/AdminLiveChat';

interface LiveKitPlayerProps {
  roomName: string;
  user: any;
  isAdmin?: boolean; // kept for compatibility; the server decides the real role
}

// LiveKit TrackSource enum values
const SRC_CAMERA = 1;
const SRC_MIC = 2;
const SRC_SCREEN = 3;
const SRC_SCREEN_AUDIO = 4;

const uidOf = (identity: string) => identity.split('~')[0];

const btn =
  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50';
const btnNeutral = `${btn} border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700`;
const btnActive = `${btn} border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700`;
const btnHand = `${btn} border-yellow-400 bg-yellow-500 text-black hover:bg-yellow-400`;
const btnDanger = `${btn} border-red-500/60 bg-red-600/20 text-red-400 hover:bg-red-600/30`;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

async function setPermissions(roomName: string, identity: string, sources: number[]) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in');
  const res = await fetch('/api/livekit/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ roomName, identity, sources }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update permissions');
  }
}

function presenceRef(classId: string, uid: string) {
  return doc(db, 'presence', `live_${classId}_${uid}`);
}

function useRoomTick() {
  const room = useRoomContext();
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const events: any[] = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.ParticipantPermissionsChanged,
      RoomEvent.ParticipantMetadataChanged,
      RoomEvent.ActiveSpeakersChanged,
    ];
    events.forEach((e) => room.on(e, force as any));
    return () => {
      events.forEach((e) => room.off(e, force as any));
    };
  }, [room]);
}

/** The student's own raise-hand state, stored in the same `presence` doc the website/app already use. */
function useHandRaise(classId: string, user: any) {
  const [raised, setRaised] = useState(false);

  useEffect(() => {
    if (!classId || !user?.uid) return;
    return onSnapshot(presenceRef(classId, user.uid), (snap) => setRaised(!!snap.data()?.handRaised));
  }, [classId, user?.uid]);

  const setHand = useCallback(
    async (value: boolean) => {
      if (!user?.uid) return;
      await setDoc(
        presenceRef(classId, user.uid),
        {
          handRaised: value,
          handRaisedAt: value ? Date.now() : null,
          liveClassId: classId,
          userId: user.uid,
          studentName: user.name || user.displayName || user.email?.split('@')[0] || 'Student',
          lastActive: Date.now(),
        },
        { merge: true }
      );
    },
    [classId, user]
  );

  return { raised, setHand };
}

interface RaisedHand {
  uid: string;
  name: string;
  at: number;
}

function useRaisedHands(classId: string, enabled: boolean) {
  const [hands, setHands] = useState<RaisedHand[]>([]);
  useEffect(() => {
    if (!enabled || !classId) return;
    const q = query(collection(db, 'presence'), where('liveClassId', '==', classId));
    return onSnapshot(
      q,
      (snap) => {
        const list: RaisedHand[] = snap.docs
          .map((d) => {
            const data: any = d.data();
            return {
              uid: data.userId || d.id.replace(`live_${classId}_`, ''),
              name: data.studentName || 'Student',
              raised: !!data.handRaised,
              at: data.handRaisedAt || data.lastActive || 0,
            };
          })
          .filter((h) => h.raised)
          .sort((a, b) => a.at - b.at)
          .map(({ uid, name, at }) => ({ uid, name, at }));
        setHands(list);
      },
      (err) => console.error('Raised-hand listener failed', err)
    );
  }, [classId, enabled]);
  return hands;
}

/* ------------------------------------------------------------------ */
/* video area                                                          */
/* ------------------------------------------------------------------ */

function VideoStage({ isAdmin }: { isAdmin: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Only show people whose camera / screen share is actually on.
  const live = tracks.filter((t: any) => t.publication && !t.publication.isMuted);
  const screens = live.filter((t: any) => t.source === Track.Source.ScreenShare);
  const cams = live.filter((t: any) => t.source === Track.Source.Camera);

  if (live.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950 text-center text-zinc-500">
        <Video className="mb-3 h-10 w-10 text-zinc-700" />
        <p className="font-medium">
          {isAdmin
            ? 'Turn on your camera or share your screen to start teaching'
            : 'Waiting for the teacher to start the video...'}
        </p>
      </div>
    );
  }

  if (screens.length > 0) {
    const main = screens[0];
    const strip = [...screens.slice(1), ...cams];
    return (
      <div className="flex h-full w-full flex-col gap-2">
        <div className="relative min-h-0 flex-1">
          <ParticipantTile trackRef={main as any} style={{ height: '100%', width: '100%' }} />
        </div>
        {strip.length > 0 && (
          <div className="flex h-28 shrink-0 gap-2 overflow-x-auto sm:h-32">
            {strip.map((t: any) => (
              <div
                key={`${t.participant.identity}-${t.source}`}
                className="h-full shrink-0"
                style={{ aspectRatio: '16 / 9' }}
              >
                <ParticipantTile trackRef={t} style={{ height: '100%', width: '100%' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <GridLayout tracks={cams as any} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

/* ------------------------------------------------------------------ */
/* admin side panel                                                    */
/* ------------------------------------------------------------------ */

function PermissionRow({
  p,
  name,
  roomName,
  hand,
}: {
  p: any | null;
  name: string;
  roomName: string;
  hand: RaisedHand | null;
}) {
  const [busy, setBusy] = useState(false);
  const granted: number[] = p?.permissions?.canPublish ? Array.from(p.permissions.canPublishSources || []) : [];
  const has = (sources: number[]) => sources.every((s) => granted.includes(s));

  const lowerHand = useCallback(async () => {
    const uid = hand?.uid || (p ? uidOf(p.identity) : '');
    if (!uid) return;
    try {
      await setDoc(
        presenceRef(roomName, uid),
        { handRaised: false, handRaisedAt: null },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
    }
  }, [hand, p, roomName]);

  const toggle = async (sources: number[]) => {
    if (!p) return;
    setBusy(true);
    try {
      const next = has(sources)
        ? granted.filter((s) => !sources.includes(s))
        : Array.from(new Set([...granted, ...sources]));
      await setPermissions(roomName, p.identity, next);
      if (next.length === 0 && hand) await lowerHand();
    } catch (e: any) {
      alert(e.message || 'Could not change permission');
    } finally {
      setBusy(false);
    }
  };

  const live: string[] = [];
  if (p?.isMicrophoneEnabled) live.push('Mic on');
  if (p?.isCameraEnabled) live.push('Camera on');
  if (p?.isScreenShareEnabled) live.push('Sharing screen');
  const status = !p ? 'Not in the video room' : live.length ? live.join(' | ') : 'Listening';

  const toggleBtn = (sources: number[], Icon: any, label: string, isLive: boolean) => (
    <button
      type="button"
      disabled={busy || !p}
      onClick={() => toggle(sources)}
      title={has(sources) ? `Remove ${label} access` : `Allow ${label}`}
      className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-colors disabled:opacity-40 ${
        has(sources)
          ? isLive
            ? 'animate-pulse border-emerald-400 bg-emerald-600 text-white'
            : 'border-emerald-500 bg-emerald-600/80 text-white'
          : 'border-border bg-secondary text-foreground hover:bg-secondary/70'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2 ${
        hand ? 'border-yellow-400/60 bg-yellow-500/10' : 'border-border bg-secondary/20'
      } ${p?.isSpeaking ? 'ring-2 ring-emerald-400' : ''}`}
    >
      {hand && <Hand className="h-4 w-4 shrink-0 text-yellow-500" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{status}</p>
      </div>
      {toggleBtn([SRC_MIC], p?.isMicrophoneEnabled ? Mic : MicOff, 'microphone', !!p?.isMicrophoneEnabled)}
      {toggleBtn([SRC_CAMERA], p?.isCameraEnabled ? Video : VideoOff, 'camera', !!p?.isCameraEnabled)}
      {toggleBtn([SRC_SCREEN, SRC_SCREEN_AUDIO], p?.isScreenShareEnabled ? MonitorUp : MonitorOff, 'screen share', !!p?.isScreenShareEnabled)}
      {hand && (
        <button
          type="button"
          onClick={lowerHand}
          title="Dismiss raised hand"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/70"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AdminSidebar({
  roomName,
  hands,
  onClose,
}: {
  roomName: string;
  hands: RaisedHand[];
  onClose: () => void;
}) {
  useRoomTick();
  const room = useRoomContext();
  const remotes: any[] = Array.from((room as any).remoteParticipants.values());

  const roleOf = (p: any) => {
    try {
      return JSON.parse(p.metadata || '{}').role as string | undefined;
    } catch {
      return undefined;
    }
  };
  const students = remotes.filter((p) => !roleOf(p) || roleOf(p) === 'student');
  const teachers = remotes.filter((p) => roleOf(p) === 'admin' || roleOf(p) === 'teacher');
  const handUids = new Set(hands.map((h) => h.uid));
  const others = students.filter((p) => !handUids.has(uidOf(p.identity)));
  const speaking = students.filter((p) => p.isMicrophoneEnabled);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-bold">Class Control</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-secondary md:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[48%] shrink-0 space-y-2 overflow-y-auto border-b border-border p-2">
        {speaking.length > 0 && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-500">
            Mic on: {speaking.map((p) => p.name || uidOf(p.identity)).join(', ')}
          </div>
        )}

        <h4 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Hand className="h-3 w-3" /> Raised hands ({hands.length})
        </h4>
        {hands.length === 0 ? (
          <p className="text-xs text-muted-foreground">No raised hands.</p>
        ) : (
          hands.map((h) => {
            const p = students.find((s) => uidOf(s.identity) === h.uid) || null;
            return (
              <PermissionRow key={h.uid} p={p} name={p?.name || h.name} roomName={roomName} hand={h} />
            );
          })
        )}

        <h4 className="pt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          In class ({others.length})
        </h4>
        {others.length === 0 ? (
          <p className="text-xs text-muted-foreground">No other students in the video room.</p>
        ) : (
          others.map((p) => (
            <PermissionRow key={p.identity} p={p} name={p.name || uidOf(p.identity)} roomName={roomName} hand={null} />
          ))
        )}

        {teachers.length > 0 && (
          <p className="pt-1 text-[11px] text-muted-foreground">
            Teachers/admins in room: {teachers.map((p) => p.name || uidOf(p.identity)).join(', ')}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-3 pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Student questions (website + app)
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <AdminLiveChat liveClassId={roomName} fullHeight />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* student controls                                                    */
/* ------------------------------------------------------------------ */

function StudentControls({
  roomName,
  user,
  chatOpen,
  toggleChat,
  toggleFull,
  showingFull,
  onLeave,
}: {
  roomName: string;
  user: any;
  chatOpen: boolean;
  toggleChat: () => void;
  toggleFull: () => void;
  showingFull: boolean;
  onLeave: () => void;
}) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const perms = useLocalParticipantPermissions();
  const { raised, setHand } = useHandRaise(roomName, user);

  const granted: number[] = perms?.canPublish ? Array.from(perms.canPublishSources || []) : [];
  const grantedRef = useRef<number[]>(granted);
  grantedRef.current = granted;

  const canMic = granted.includes(SRC_MIC);
  const canCam = granted.includes(SRC_CAMERA);
  const canScreen = granted.includes(SRC_SCREEN);

  // Removes the given sources from the student's permissions (and lowers the hand when nothing is left).
  const revoke = useCallback(
    async (remove: number[]) => {
      const next = grantedRef.current.filter((s) => !remove.includes(s));
      try {
        await setPermissions(roomName, localParticipant.identity, next);
        if (next.length === 0) await setHand(false);
      } catch (e) {
        console.error('Failed to revoke access', e);
      }
    },
    [roomName, localParticipant, setHand]
  );

  // Browser-level "Stop sharing" also ends the screen-share permission.
  useEffect(() => {
    const onUnpublished = (pub: any) => {
      if (pub?.source === Track.Source.ScreenShare && grantedRef.current.includes(SRC_SCREEN)) {
        revoke([SRC_SCREEN, SRC_SCREEN_AUDIO]);
      }
    };
    room.on(RoomEvent.LocalTrackUnpublished, onUnpublished);
    return () => {
      room.off(RoomEvent.LocalTrackUnpublished, onUnpublished);
    };
  }, [room, revoke]);

  const guard = async (fn: () => Promise<any>) => {
    try {
      await fn();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Could not access your device. Please allow permission in the browser.');
    }
  };

  const toggleMic = () =>
    guard(async () => {
      if (isMicrophoneEnabled) {
        await localParticipant.setMicrophoneEnabled(false);
        await revoke([SRC_MIC]);
      } else {
        await localParticipant.setMicrophoneEnabled(true);
      }
    });

  const toggleCam = () =>
    guard(async () => {
      if (isCameraEnabled) {
        await localParticipant.setCameraEnabled(false);
        await revoke([SRC_CAMERA]);
      } else {
        await localParticipant.setCameraEnabled(true);
      }
    });

  const toggleScreen = () =>
    guard(async () => {
      // Stopping is handled by the LocalTrackUnpublished listener above (also covers the browser's own stop button).
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    });

  return (
    <div className="shrink-0 border-t border-zinc-900 bg-zinc-950 p-3">
      {granted.length > 0 && (
        <p className="mb-2 text-center text-xs text-emerald-400">
          Your teacher gave you access. Muting or stopping removes it, so raise your hand again to get it back.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className={raised ? btnHand : btnNeutral}
          onClick={() => guard(() => setHand(!raised))}
        >
          <Hand className="h-4 w-4" /> {raised ? 'Lower Hand' : 'Raise Hand'}
        </button>

        {canMic && (
          <button type="button" className={isMicrophoneEnabled ? btnActive : btnNeutral} onClick={toggleMic}>
            {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {isMicrophoneEnabled ? 'Mute' : 'Unmute'}
          </button>
        )}
        {canCam && (
          <button type="button" className={isCameraEnabled ? btnActive : btnNeutral} onClick={toggleCam}>
            {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            {isCameraEnabled ? 'Stop Camera' : 'Start Camera'}
          </button>
        )}
        {canScreen && (
          <button type="button" className={isScreenShareEnabled ? btnActive : btnNeutral} onClick={toggleScreen}>
            {isScreenShareEnabled ? <MonitorOff className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
            {isScreenShareEnabled ? 'Stop Sharing' : 'Share Screen'}
          </button>
        )}

        <button type="button" className={chatOpen ? btnActive : btnNeutral} onClick={toggleChat}>
          <MessageSquare className="h-4 w-4" /> Chat
        </button>
        <button type="button" className={btnNeutral} onClick={toggleFull}>
          {showingFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {showingFull ? 'Exit Full Screen' : 'Full Screen'}
        </button>
        <button type="button" className={btnDanger} onClick={onLeave}>
          <LogOut className="h-4 w-4" /> Leave
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* layout                                                              */
/* ------------------------------------------------------------------ */

function ClassroomLayout({
  roomName,
  user,
  isAdmin,
  onLeave,
}: {
  roomName: string;
  user: any;
  isAdmin: boolean;
  onLeave: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const hands = useRaisedHands(roomName, isAdmin);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && !isAdmin) setChatOpen(false);
  }, [isAdmin]);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFull = async () => {
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
        setPseudoFull(true);
      }
    } catch {
      setPseudoFull(true);
    }
  };

  const showingFull = isFull || pseudoFull;
  const toggleChat = () => setChatOpen((v) => !v);

  return (
    <LayoutContextProvider>
      <div
        ref={rootRef}
        className={`relative flex w-full bg-black ${pseudoFull ? 'fixed inset-0 z-[10000]' : ''}`}
        style={{ height: pseudoFull ? '100dvh' : '100%' }}
      >
        {/* video + controls */}
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 p-1">
            <VideoStage isAdmin={isAdmin} />
          </div>

          {isAdmin ? (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-zinc-900 bg-zinc-950 p-3">
              <ControlBar
                variation="minimal"
                controls={{ camera: true, microphone: true, screenShare: true, chat: false, leave: false }}
              />
              <button type="button" className={chatOpen ? btnActive : btnNeutral} onClick={toggleChat}>
                <MessageSquare className="h-4 w-4" /> Panel
                {hands.length > 0 && (
                  <span className="rounded-full bg-yellow-500 px-1.5 text-xs font-bold text-black">
                    {hands.length}
                  </span>
                )}
              </button>
              <button type="button" className={btnNeutral} onClick={toggleFull}>
                {showingFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {showingFull ? 'Exit Full Screen' : 'Full Screen'}
              </button>
              <button type="button" className={btnDanger} onClick={onLeave}>
                <LogOut className="h-4 w-4" /> Leave
              </button>
            </div>
          ) : (
            <StudentControls
              roomName={roomName}
              user={user}
              chatOpen={chatOpen}
              toggleChat={toggleChat}
              toggleFull={toggleFull}
              showingFull={showingFull}
              onLeave={onLeave}
            />
          )}
        </div>

        {/* right panel: teacher control + questions, or student chat */}
        <aside
          className={`${
            chatOpen ? 'flex' : 'hidden'
          } absolute inset-0 z-30 h-full flex-col border-l border-zinc-800 bg-background text-foreground md:static md:inset-auto md:w-[380px] md:shrink-0`}
        >
          {isAdmin ? (
            <AdminSidebar roomName={roomName} hands={hands} onClose={() => setChatOpen(false)} />
          ) : (
            <>
              <div className="flex shrink-0 justify-end px-2 pt-2 md:hidden">
                <button type="button" onClick={() => setChatOpen(false)} className="rounded p-1 hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col [&>div]:h-full [&>div]:max-h-none">
                <LiveChat liveClassId={roomName} />
              </div>
            </>
          )}
        </aside>

        <ConnectionStateToast />
      </div>
    </LayoutContextProvider>
  );
}

/* ------------------------------------------------------------------ */
/* entry                                                               */
/* ------------------------------------------------------------------ */

export default function LiveKitPlayer({ roomName, user }: LiveKitPlayerProps) {
  const [session, setSession] = useState(() => Math.random().toString(36).slice(2, 10));
  const [conn, setConn] = useState<{ token: string; role: string } | null>(null);
  const [error, setError] = useState('');
  const [left, setLeft] = useState(false);

  useEffect(() => {
    if (!user?.uid || !roomName || left) return;
    let cancelled = false;
    setError('');

    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error('Please log in again to join the class.');
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            roomName,
            sessionId: session,
            participantName: user.name || user.displayName || user.email?.split('@')[0] || 'Student',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.token) throw new Error(data.error || 'Could not join the class.');
        if (!cancelled) setConn({ token: data.token, role: data.role });
      } catch (e: any) {
        console.error('Failed to fetch LiveKit token', e);
        if (!cancelled) setError(e.message || 'Could not join the class.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomName, user?.uid, session, left]); // eslint-disable-line react-hooks/exhaustive-deps

  const rejoin = () => {
    setConn(null);
    setError('');
    setSession(Math.random().toString(36).slice(2, 10));
    setLeft(false);
  };

  if (left) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center text-white">
        <p className="text-lg font-semibold">You left the class</p>
        <button type="button" className={btnActive} onClick={rejoin}>
          Rejoin Class
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center text-white">
        <p className="max-w-md text-sm text-red-400">{error}</p>
        <button type="button" className={btnNeutral} onClick={rejoin}>
          Try Again
        </button>
      </div>
    );
  }

  if (!conn) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="font-medium text-zinc-400">Connecting to Virtual Classroom...</p>
        </div>
      </div>
    );
  }

  const isAdmin = conn.role === 'admin' || conn.role === 'teacher';

  return (
    <LiveKitRoom
      video={isAdmin}
      audio={isAdmin}
      token={conn.token}
      options={{
        publishDefaults: {
          videoEncoding: VideoPresets.h1080.encoding,
          screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
          videoSimulcast: true, // Enables adaptive quality for students with bad internet
        },
        videoCaptureDefaults: {
          resolution: VideoPresets.h1080.resolution,
        }
      }}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://live.brillliantacademy.site'}
      data-lk-theme="default"
      className="h-full w-full overflow-hidden"
      style={{ height: '100%' }}
      onError={(e) => console.error('LiveKit error', e)}
      onMediaDeviceFailure={(f) => console.error('Media device failure', f)}
    >
      <ClassroomLayout roomName={roomName} user={user} isAdmin={isAdmin} onLeave={() => setLeft(true)} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
