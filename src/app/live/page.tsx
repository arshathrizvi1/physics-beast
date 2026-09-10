"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, where, getDocs, updateDoc, doc, increment, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, PlayCircle, Clock, ExternalLink, Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import LiveChat from "@/components/LiveChat";
import dynamic from 'next/dynamic';
import { useRef } from 'react';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });
const ZoomPlayer = dynamic(() => import('@/components/zoom/ZoomPlayer'), { ssr: false });

export default function StudentLivePortal() {
  const { user, loading } = useAuth();
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [fetchingClasses, setFetchingClasses] = useState(true);

  // Video Player States
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wmRef = useRef<HTMLDivElement>(null);

  // DVD-style bouncing watermark — covers full player
  useEffect(() => {
    let x = 10 + Math.random() * 60;
    let y = 10 + Math.random() * 60;
    let dx = (Math.random() > 0.5 ? 1 : -1) * (0.05 + Math.random() * 0.05);
    let dy = (Math.random() > 0.5 ? 1 : -1) * (0.04 + Math.random() * 0.04);
    let animationFrameId: number;

    const animate = () => {
      x += dx;
      y += dy;
      
      if (x <= 1) { x = 1; dx = Math.abs(dx); }
      if (x >= 82) { x = 82; dx = -Math.abs(dx); }
      if (y <= 1) { y = 1; dy = Math.abs(dy); }
      if (y >= 88) { y = 88; dy = -Math.abs(dy); }
      
      if (wmRef.current) {
        wmRef.current.style.left = `${x}%`;
        wmRef.current.style.top = `${y}%`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      let folderCourseMap = new Map<string, string>();
      try {
        // Fetch all folders to map folder -> courseId
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 2500)
        );
        
        const foldersSnap: any = await Promise.race([
          getDocs(collection(db, 'folders')),
          timeoutPromise
        ]);

        foldersSnap.forEach((d: any) => folderCourseMap.set(d.id, d.data().courseId));
      } catch (err) {
        console.error("Could not fetch folders (quota exceeded?). Relying on cached access.", err);
      }

      // Get all courses the student has ACTIVE folder access to
      const activeCourseIds = new Set<string>();
      if (user.folderAccess) {
        const now = Date.now();
        Object.entries(user.folderAccess).forEach(([folderId, expiry]) => {
          if (typeof expiry === 'number' && expiry > now) {
            const cId = folderCourseMap.get(folderId);
            if (cId) activeCourseIds.add(cId);
          }
        });
      }
      
      // Add legacy accessible courses
      if (user.accessibleCourses) {
        user.accessibleCourses.forEach((cId: string) => activeCourseIds.add(cId));
      }

      try {
        const q = query(collection(db, 'live_classes'));
        
        const unsub = onSnapshot(q, (snap) => {
          let classes = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
          
          classes = classes.filter(cls => {
            if (cls.status === 'draft') return false; // Never show drafts
            if (user.role === 'admin' || user.role === 'teacher') return true;

            // Batch filtering
            if (cls.batchId && cls.batchId !== "all") {
              if (user.graduationYear !== cls.batchId) return false;
            }

            // Course / Folder access filtering
            if (!cls.courseId || cls.courseId === "all") return true; 
            return activeCourseIds.has(cls.courseId);
          });
          
          classes.sort((a, b) => {
            if (a.status === 'live' && b.status !== 'live') return -1;
            if (a.status !== 'live' && b.status === 'live') return 1;
            return a.scheduledFor - b.scheduledFor;
          });
          
          setLiveClasses(classes);
          setFetchingClasses(false);
        }, (err) => {
          console.error("Quota exceeded fetching live classes?", err);
          setFetchingClasses(false);
        });

        return unsub;
      } catch (err) {
        console.error("Failed to fetch dependencies for live classes", err);
        setFetchingClasses(false);
        return () => {};
      }
    };

    let unsubFunc: any = null;
    fetchData().then(fn => { unsubFunc = fn; });

    return () => {
      if (unsubFunc) unsubFunc();
    };
  }, [user]);

  // Heartbeat to track study time and presence if there is a LIVE class currently happening
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    // Check if any class is currently 'live'
    const liveActiveClasses = liveClasses.filter(cls => cls.status === 'live');
    if (liveActiveClasses.length === 0) return;

    const { calculateXpLevel, XP_PER_STUDY_MINUTE } = require('@/lib/xp');

    const studyHeartbeat = setInterval(() => {
      const nowStr = new Date().toISOString().split('T')[0];
      const newXp = (user.totalXp || 0) + XP_PER_STUDY_MINUTE;
      updateDoc(doc(db, 'users', user.uid), {
        totalStudyTimeMins: increment(1),
        [`studyHistory.${nowStr}`]: increment(1),
        totalXp: increment(XP_PER_STUDY_MINUTE),
        xpLevel: calculateXpLevel(newXp),
        lastStudyPing: Date.now(),
        lastStudyDate: nowStr
      }).catch((e: any) => console.error("Failed to update study time and XP", e));
    }, 60000);

    const presencePing = setInterval(() => {
      liveActiveClasses.forEach(cls => {
        const presenceRef = doc(db, 'presence', `live_${cls.id}_${user.uid}`);
        setDoc(presenceRef, { liveClassId: cls.id, userId: user.uid, lastActive: Date.now() }, { merge: true });
      });
    }, 15000);
    
    // Initial ping
    liveActiveClasses.forEach(cls => {
      const presenceRef = doc(db, 'presence', `live_${cls.id}_${user.uid}`);
      setDoc(presenceRef, { liveClassId: cls.id, userId: user.uid, lastActive: Date.now() }, { merge: true });
    });

    return () => {
      clearInterval(studyHeartbeat);
      clearInterval(presencePing);
    };
  }, [user, liveClasses]);

  // Anti-piracy shortcuts and Blackout Overlay
  useEffect(() => {
    const blackoutDiv = document.createElement('div');
    blackoutDiv.id = 'anti-screenshot-blackout-live';
    blackoutDiv.style.position = 'fixed';
    blackoutDiv.style.top = '0';
    blackoutDiv.style.left = '0';
    blackoutDiv.style.width = '100vw';
    blackoutDiv.style.height = '100vh';
    blackoutDiv.style.backgroundColor = '#000000';
    blackoutDiv.style.zIndex = '99999999';
    blackoutDiv.style.color = 'white';
    blackoutDiv.style.display = 'flex';
    blackoutDiv.style.alignItems = 'center';
    blackoutDiv.style.justifyContent = 'center';
    blackoutDiv.style.fontSize = '28px';
    blackoutDiv.style.fontWeight = 'bold';
    blackoutDiv.style.opacity = '0';
    blackoutDiv.style.pointerEvents = 'none';
    blackoutDiv.style.transition = 'opacity 0.1s ease';
    blackoutDiv.innerHTML = '<div style="text-align:center;"><span style="font-size:64px; display:block; margin-bottom:15px;">🛡️</span><span style="color:#ef4444;">You can\'t screenshot this page.</span><br/><span style="font-size:16px; font-weight:normal; color:#a1a1aa; margin-top:10px; display:block;">Screen recording and screenshots are disabled due to security policy.</span></div>';
    document.body.appendChild(blackoutDiv);

    const showBlackout = () => {
      blackoutDiv.style.opacity = '1';
      blackoutDiv.style.pointerEvents = 'all';
    };
    
    const hideBlackout = () => {
      blackoutDiv.style.opacity = '0';
      blackoutDiv.style.pointerEvents = 'none';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen, Ctrl+P, Mac Cmd+Shift+3/4/5
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))) {
        e.preventDefault();
        showBlackout();
        try { navigator.clipboard.writeText("Content Protected"); } catch(err) {}
        setTimeout(hideBlackout, 3000);
      }
    };
    
    // Android 3-finger gesture screenshot & multi-touch detection
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 3) {
        showBlackout();
        setTimeout(hideBlackout, 2500);
      }
    };

    // Android notification shade / app switch / screenshot preview detection
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        showBlackout();
      } else {
        hideBlackout();
      }
    };

    const handleWindowBlur = () => {
      showBlackout();
    };

    const handleWindowFocus = () => {
      hideBlackout();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchStart, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      if (document.body.contains(blackoutDiv)) {
        document.body.removeChild(blackoutDiv);
      }
    };
  }, []);

  // Utility to extract Zoom Meeting ID and Password from link
  const getZoomDetails = (url: string) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const meetingIdMatch = pathname.match(/\/j\/(\d+)/);
      const meetingId = meetingIdMatch ? meetingIdMatch[1] : null;
      const pwd = urlObj.searchParams.get("pwd") || "";
      return meetingId ? { meetingId, pwd } : null;
    } catch {
      return null;
    }
  };

  // Utility to extract YouTube video ID from various link formats
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Utility to extract secure HTTPS HLS stream URL for RTMP broadcasts
  const getStreamUrl = (cls: any) => {
    if (cls.platform === 'rtmp') {
      const key = cls.streamKey || (cls.link ? cls.link.match(/\/live\/([^\/]+)\/index\.m3u8/)?.[1] : null);
      if (key) {
        return `/api/live/hls/${key}/index.m3u8`;
      }
    }
    return cls.link;
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><p className="animate-pulse text-primary font-bold text-xl">Loading Broadcasts...</p></div>;
  }

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
        <Video className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-2xl font-bold">Please log in to view Live Classes</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 text-center">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-primary flex items-center justify-center gap-3">
          <Video className="w-10 h-10" /> Live Broadcasts
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Join ongoing live classes directly from your browser, or see upcoming scheduled sessions.
        </p>
      </div>

      {liveClasses.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-border/50 rounded-2xl text-center flex flex-col items-center justify-center">
          <Clock className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Live Classes Currently Scheduled</h2>
          <p className="text-muted-foreground max-w-md">Your instructors haven't scheduled any upcoming live sessions for your courses yet. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {liveClasses.map(cls => (
            <Card key={cls.id} className={`overflow-hidden border-2 transition-all ${cls.status === 'live' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-primary/20'}`}>
              
              {/* Card Header Section */}
              <div className={`p-4 md:p-6 ${cls.status === 'live' ? 'bg-red-500/10' : 'bg-secondary/5'} border-b border-border/30`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {cls.status === 'live' ? (
                        <span className="bg-red-500 text-foreground text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse shadow-lg flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-white rounded-full"></span> LIVE NOW
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-500 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-blue-500/20">
                          Scheduled
                        </span>
                      )}
                      <h2 className="text-2xl font-bold">{cls.title}</h2>
                    </div>
                    {cls.description && <p className="text-muted-foreground">{cls.description}</p>}
                    
                    <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className={cls.status === 'live' ? 'text-foreground' : 'text-primary'}>
                        {new Date(cls.scheduledFor).toLocaleString(undefined, { 
                          weekday: 'long', month: 'long', day: 'numeric', 
                          hour: 'numeric', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons for non-youtube links */}
                  {cls.status === 'live' && cls.platform !== 'youtube' && cls.platform !== 'rtmp' && cls.platform !== 'zoom' && (
                    cls.allowDirectJoin !== false ? (
                      <a href={cls.link} target="_blank" rel="noreferrer" className="shrink-0">
                        <Button size="lg" className="bg-red-600 hover:bg-red-700 text-foreground font-bold w-full md:w-auto h-14 px-8 text-lg animate-pulse shadow-lg">
                          <PlayCircle className="w-6 h-6 mr-2" /> JOIN {cls.platform.toUpperCase()} MEETING
                        </Button>
                      </a>
                    ) : (
                      <div className="shrink-0 p-3.5 bg-secondary/30 rounded-xl border border-border/50 text-center max-w-xs shadow-inner">
                        <div className="text-xs font-bold text-amber-500 flex items-center justify-center gap-1 mb-1">
                          <span>🔒</span> Direct Join Disabled
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Direct 1-click entry has been disabled by the instructor for this session.
                        </p>
                      </div>
                    )
                  )}
                  {cls.status === 'scheduled' && (
                     <div className="shrink-0 p-4 bg-background rounded-xl border border-border shadow-inner text-center">
                       <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                       <p className="text-sm font-bold">Waiting for host to start...</p>
                     </div>
                  )}
                </div>
              </div>

              {/* Zoom Embedded Player Section */}
              {cls.platform === 'zoom' && cls.status === 'live' && (
                <div className="w-full relative border-t border-border/30">
                  {cls.allowDirectJoin !== false ? (
                    getZoomDetails(cls.link) ? (
                      <ZoomPlayer 
                        meetingNumber={getZoomDetails(cls.link)!.meetingId} 
                        password={getZoomDetails(cls.link)!.pwd}
                        userName={user.displayName || user.email || "Student"}
                        userEmail={user.email}
                        role={0} 
                      />
                    ) : (
                      <div className="p-8 text-center bg-zinc-900 min-h-[500px] flex flex-col justify-center items-center">
                        <p className="text-red-400 mb-4">Invalid Zoom Link format. Could not extract Meeting ID.</p>
                        <a href={cls.link} target="_blank" rel="noreferrer">
                          <Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" /> Open in Zoom App</Button>
                        </a>
                      </div>
                    )
                  ) : (
                      <div className="p-12 bg-zinc-900 min-h-[500px] flex flex-col items-center justify-center text-center">
                        <div className="text-xl font-bold text-amber-500 flex items-center justify-center gap-2 mb-2">
                          <span>🔒</span> Zoom Class Join Disabled
                        </div>
                        <p className="text-muted-foreground max-w-md">
                          The instructor has disabled joining this class directly from the website. 
                        </p>
                      </div>
                  )}
                </div>
              )}

              {/* Custom Player Section for YouTube, Native RTMP & Bunny DRM */}
              {(cls.platform === 'youtube' || cls.platform === 'rtmp' || cls.platform === 'bunny') && cls.status === 'live' && (
                <div 
                  ref={playerContainerRef} 
                  className="aspect-video w-full relative bg-black group/player overflow-hidden"
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => setShowControls(false)}
                >
                  {cls.platform === 'bunny' ? (
                    <iframe
                      src={`https://iframe.mediadelivery.net/embed/748058/${cls.streamKey || cls.link}?autoplay=true`}
                      className="w-full h-full border-0 relative z-[50]"
                      allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                      allowFullScreen={true}
                    />
                  ) : (cls.platform === 'rtmp' || getYouTubeId(cls.link)) ? (
                    <>
                      {/* The pointer-events-none wrapper completely disables ANY interaction with the underlying iframe/video */}
                      <div className="absolute inset-0 pointer-events-none w-full h-full">
                        <ReactPlayer
                          ref={playerRef}
                          url={getStreamUrl(cls)}
                          width="100%"
                          height="100%"
                          playing={cls.platform === 'rtmp' ? true : playing} // RTMP is always forced playing
                          volume={volume}
                          muted={muted}
                          playsinline
                          config={{
                            youtube: {
                              playerVars: { 
                                autoplay: 1, 
                                controls: 0, 
                                modestbranding: 1, 
                                rel: 0, 
                                disablekb: 1 
                              }
                            },
                            file: {
                              forceHLS: cls.platform === 'rtmp' || cls.link?.includes('.m3u8'),
                              attributes: {
                                disablePictureInPicture: true,
                                controlsList: "nodownload noplaybackrate",
                                style: { objectFit: 'contain', width: '100%', height: '100%' }
                              },
                              hlsOptions: {
                                enableWorker: true,
                                lowLatencyMode: true,
                                liveSyncDurationCount: 1,
                                liveMaxLatencyDurationCount: 2,
                                maxLiveSyncPlaybackRate: 1.5,
                              }
                            }
                          }}
                        />
                      </div>
                      
                      {/* Anti-Piracy Click-to-Play Catcher with Double Tap to Seek (Disabled for RTMP) */}
                      <div className="absolute inset-0 z-10 cursor-pointer flex">
                        <div 
                          className="w-1/2 h-full"
                          onClick={(e) => {
                            if (cls.platform === 'rtmp') return; // NO seeking or pausing for RTMP
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                              // Double click Left: Seek -10s
                              if (playerRef.current) {
                                const ct = playerRef.current.getCurrentTime();
                                playerRef.current.seekTo(Math.max(0, ct - 10), 'seconds');
                              }
                            } else {
                              clickTimeoutRef.current = setTimeout(() => {
                                clickTimeoutRef.current = null;
                                setPlaying(!playing);
                              }, 250);
                            }
                          }}
                        />
                        <div 
                          className="w-1/2 h-full"
                          onClick={(e) => {
                            if (cls.platform === 'rtmp') return; // NO seeking or pausing for RTMP
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                              // Double click Right: Seek +10s
                              if (playerRef.current) {
                                const ct = playerRef.current.getCurrentTime();
                                playerRef.current.seekTo(ct + 10, 'seconds');
                              }
                            } else {
                              clickTimeoutRef.current = setTimeout(() => {
                                clickTimeoutRef.current = null;
                                setPlaying(!playing);
                              }, 250);
                            }
                          }}
                        />
                      </div>

                      {/* Floating Email Watermark */}
                      <div
                        ref={wmRef}
                        className="absolute z-[11] pointer-events-none select-none"
                        style={{
                          left: `20%`,
                          top: `20%`,
                        }}
                      >
                        <span className="text-xs font-semibold text-foreground/25 bg-black/10 px-2 py-1 rounded whitespace-nowrap"
                          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                          {user.email}
                        </span>
                      </div>

                      {/* Custom Controls Overlay */}
                      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-3 z-20 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-center justify-between text-foreground mt-1">
                          <div className="flex items-center gap-5">
                            {cls.platform !== 'rtmp' && (
                              <button onClick={() => setPlaying(!playing)} className="hover:text-primary transition-colors focus:outline-none">
                                {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                              </button>
                            )}
                            
                            <div className="flex items-center gap-2 group/vol">
                              <button onClick={() => setMuted(!muted)} className="hover:text-primary transition-colors focus:outline-none">
                                {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                              </button>
                              <input 
                                type="range" 
                                min={0} 
                                max={1} 
                                step="any" 
                                value={muted ? 0 : volume} 
                                onChange={(e) => {
                                  setMuted(false);
                                  setVolume(parseFloat(e.target.value));
                                }}
                                className="w-0 group-hover/vol:w-20 transition-all duration-300 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                              />
                            </div>
                            <span className="text-sm font-medium flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                              LIVE
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => {
                                if (!document.fullscreenElement) {
                                  playerContainerRef.current?.requestFullscreen();
                                } else {
                                  document.exitFullscreen();
                                }
                              }} 
                              className="hover:text-primary transition-colors opacity-80 hover:opacity-100 focus:outline-none ml-2"
                            >
                              <Maximize className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-900 border-t border-border">
                      <p className="text-red-400 mb-4">Invalid YouTube Link format. Click below to open directly.</p>
                      <a href={cls.link} target="_blank" rel="noreferrer">
                        <Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" /> Open in YouTube</Button>
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {/* Secret Chat Box for Live Classes */}
              {cls.status === 'live' && (
                 <LiveChat liveClassId={cls.id} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

