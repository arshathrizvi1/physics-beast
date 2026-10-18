"use client";
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayCircle, Lock, Eye, ShieldAlert, Folder, ChevronDown, ChevronUp, ChevronRight, FileText, Play, Pause, Volume2, VolumeX, Maximize, Settings, X, Download, Video, CheckCircle2, HelpCircle, Send, MessageSquare, CreditCard, RotateCcw, RotateCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, use, useRef, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { uploadToS3 } from "@/lib/s3Storage";
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, increment, onSnapshot, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { calculateXpLevel, XP_PER_STUDY_MINUTE } from "@/lib/xp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from 'next/dynamic';
import { detectDeviceType, isPlayerPermitted, getDeviceLabel, defaultPlayerSettings, VideoPlayerSettings, DeviceType, extractYoutubeId } from "@/lib/playerDeviceControl";
import { startExtensionShield, scanForDownloadTools } from "@/lib/extensionShield";
import { ShadowPlayerWrapper } from "@/components/ShadowPlayerWrapper";
const PdfViewer = dynamic(() => import("@/components/ui/pdf-viewer").then(mod => mod.PdfViewer), { ssr: false });
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const getDailymotionId = (url: string) => {
  if (!url) return null;
  const match = url.trim().match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  return match ? match[1] : null;
};

export default function CoursePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const isPromise = params && typeof (params as any).then === 'function';
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const resolvedParams = isPromise ? use(params as any) : params;
  const id = (resolvedParams as any).id;
  
  const { user, updateVideoProgress, recordStudyMinute } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [courseNotFound, setCourseNotFound] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pastLiveClasses, setPastLiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedMonthlyFolderId, setSelectedMonthlyFolderId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [viewersCount, setViewersCount] = useState(0);

  // Instant recovery from sessionStorage so course never disappears during playback
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`cached_course_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCourse((prev: any) => prev || parsed);
        setLoading(false);
      }
    } catch {}
  }, [id]);
  
  // Checkout States
  const [checkoutFolder, setCheckoutFolder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'card' | 'qr'>('bank');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);



  // Doubt / Question to Teacher State
  const [doubtText, setDoubtText] = useState("");
  const [isDoubtSending, setIsDoubtSending] = useState(false);
  const [doubtSuccess, setDoubtSuccess] = useState(false);

  // Video Player States
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeServer, setActiveServer] = useState<'bunny' | 'r2' | 'youtube'>('bunny');
  const playedSecondsRef = useRef(0);
  const durationRef = useRef(0);
  const prevServerRef = useRef<'bunny' | 'r2' | 'youtube'>(activeServer);
  const activeVideoIdRef = useRef<string | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['Auto', '720p', '480p', '360p']);
  const [isAdjustingQuality, setIsAdjustingQuality] = useState(false);
  const qualityAdjustTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    // Auto-hide controls after 3 seconds of mouse inactivity while playing and menus closed
    if (playing && !isAdjustingQuality && !showSpeedMenu && !showQualityMenu) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [playing, isAdjustingQuality, showSpeedMenu, showQualityMenu]);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    } else {
      resetControlsTimeout();
    }
  }, [playing, resetControlsTimeout]);

  const [extensionDetected, setExtensionDetected] = useState<string | null>(null);

  // Periodic scan for download tools & sniffer extensions during active playback
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const tool = scanForDownloadTools();
      if (tool) {
        setExtensionDetected(tool);
        setPlaying(false);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [playing]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ side: 'left' | 'right' | null; time: number }>({ side: null, time: 0 });
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<{ side: 'left' | 'right'; text: string } | null>(null);
  const seekFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wmRef = useRef<HTMLDivElement>(null);
  const readyFiredRef = useRef<Set<string>>(new Set());
  const syllabusScrollRef = useRef<HTMLDivElement>(null);
  const [bunnyEmbedUrl, setBunnyEmbedUrl] = useState<string>('');
  const [deviceType, setDeviceType] = useState<DeviceType>('pc_web');
  const [globalPlayerSettings, setGlobalPlayerSettings] = useState<VideoPlayerSettings>(defaultPlayerSettings);

  // Detect current client device and listen to global player permissions
  useEffect(() => {
    setDeviceType(detectDeviceType());
    const unsubPlayerConfig = onSnapshot(doc(db, 'siteConfig', 'playerSettings'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setGlobalPlayerSettings({
          defaultPlayer: data.defaultPlayer || 'bunny',
          bunny: { ...defaultPlayerSettings.bunny, ...(data.bunny || {}) },
          youtube: { ...defaultPlayerSettings.youtube, ...(data.youtube || {}) },
        });
      }
    });
    return () => unsubPlayerConfig();
  }, []);

  // Fetch signed embed URL for Bunny videos (supports Token Authentication if enabled)
  useEffect(() => {
    if (activeVideo?.platform === 'bunny' && activeVideo?.url) {
      let vid = activeVideo.url;
      let lib = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '764707'; // Fallback to their actual library ID

      // Bulletproof regex to extract UUID video ID from ANY Bunny format
      const idMatch = activeVideo.url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      if (idMatch) {
          vid = idMatch[1];
      } else {
          // Fallback if it's a short ID
          const shortMatch = activeVideo.url.match(/\/(embed|play)\/(\d+)\/([a-zA-Z0-9-]+)/);
          if (shortMatch) {
              lib = shortMatch[2];
              vid = shortMatch[3];
          }
      }
      
      const libMatch = activeVideo.url.match(/\/(embed|play)\/(\d+)\//);
      if (libMatch) {
          lib = libMatch[2];
      }

      const fetchVideoUrl = async () => {
        try {
          let headers: any = {};
          
          if (typeof window !== 'undefined' && typeof (window as any).AndroidNative !== 'undefined') {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            // Call C++ to generate a secure signature that hackers can't forge in JavaScript
            const signature = (window as any).AndroidNative.getCloudSignature(vid, timestamp);
            if (signature && signature !== 'ERROR') {
                headers['x-secure-signature'] = signature;
                headers['x-timestamp'] = timestamp;
            }
            headers['x-app-platform'] = 'android';
          } else {
            headers['x-app-platform'] = 'web';
          }
          
          const res = await fetch(`/api/bunny/sign?videoId=${encodeURIComponent(vid)}&libraryId=${encodeURIComponent(lib)}`, { headers });
          if (!res.ok) {
              setBunnyEmbedUrl(`https://iframe.mediadelivery.net/embed/${lib}/${vid}?autoplay=true`);
              return;
          }
          const data = await res.json();
          if (data.url) setBunnyEmbedUrl(data.url);
          else setBunnyEmbedUrl(`https://iframe.mediadelivery.net/embed/${lib}/${vid}?autoplay=true`);
        } catch (e) {
          setBunnyEmbedUrl(`https://iframe.mediadelivery.net/embed/${lib}/${vid}?autoplay=true`);
        }
      };
      fetchVideoUrl();
    } else {
      setBunnyEmbedUrl('');
    }
  }, [activeVideo?.id, activeVideo?.url, activeVideo?.platform, user?.email]);

  // Video Progress Tracking State & Persistence
  const [localVideoProgress, setLocalVideoProgress] = useState<Record<string, number>>({});
  const [folderTabs, setFolderTabs] = useState<Record<string, 'videos' | 'resources'>>({});
  const lastSavedProgressRef = useRef<Record<string, number>>({});

  // Sync with user's videoProgress from Firestore when profile updates
  useEffect(() => {
    if (user?.videoProgress) {
      setLocalVideoProgress(prev => ({ ...prev, ...user.videoProgress }));
    }
  }, [user?.videoProgress]);

  // Load cached progress from localStorage on initial mount
  useEffect(() => {
    try {
      const storageKey = user?.uid ? `user_progress_${user.uid}` : 'guest_video_progress';
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw); setLocalVideoProgress(prev => ({ ...parsed, ...prev }));
      }
    } catch {}
  }, [user?.uid]);

  // Record progress callback with accurate percentage tracking
  const recordProgress = useCallback((videoId: string, percent: number) => {
    if (!videoId) return;
    const clean = Math.min(100, Math.max(0, Math.round(percent)));
    // Genuinely record true percentage; only 100% when video is actually completed
    const finalPct = clean >= 100 ? 100 : clean;

    setLocalVideoProgress(prev => {
      const current = prev[videoId] || 0;
      // If previously falsely marked as 100% by the old >=90% bug, correct it back to actual watched progress
      if (current === 100 && clean < 98) {
        return { ...prev, [videoId]: finalPct };
      }
      if (finalPct <= current) return prev;
      return { ...prev, [videoId]: finalPct };
    });

    const prevSaved = lastSavedProgressRef.current[videoId] || 0;
    if (Math.abs(finalPct - prevSaved) >= 2 || finalPct === 100 || (prevSaved === 100 && clean < 98)) {
      lastSavedProgressRef.current[videoId] = finalPct;
      updateVideoProgress?.(videoId, finalPct);
    }
  }, [updateVideoProgress]);

  // Listen to postMessage from Bunny Stream Player iframe (Player.js standard)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        let data = e.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if ((data?.event === 'timeupdate' || data?.type === 'timeupdate') && activeVideoRef.current?.id) {
          const seconds = data?.value?.seconds ?? data?.seconds ?? 0;
          const duration = data?.value?.duration ?? data?.duration ?? 0;
          if (duration > 0) {
            const pct = Math.min(100, Math.round((seconds / duration) * 100));
            recordProgress(activeVideoRef.current.id, pct);
          }
        }
        if (data?.event === 'ended' && activeVideoRef.current?.id) {
          recordProgress(activeVideoRef.current.id, 100);
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [recordProgress]);

  // Quality Control for HLS
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const applyQuality = () => {
      if (activeVideo && playerRef.current) {
        const hls = playerRef.current.getInternalPlayer('hls');
        if (hls && hls.levels && hls.levels.length > 0) {
          // Discover available stream qualities (strictly restricted to 720p, 480p, 360p)
          const ALLOWED = ['720p', '480p', '360p'];
          const heights = hls.levels
            .filter((l: any) => l.height)
            .map((l: any) => `${l.height}p`)
            .filter((q: string) => ALLOWED.includes(q));
          if (heights.length > 0) {
            const sorted = (Array.from(new Set(heights)) as string[]).sort((a, b) => parseInt(b) - parseInt(a));
            setAvailableQualities(['Auto', ...sorted]);
          }

          if (quality === 'Auto') {
            if (!playing || (hls.media && hls.media.paused)) {
              hls.currentLevel = -1;
            }
            hls.nextLevel = -1;
            hls.loadLevel = -1;
          } else {
            const height = parseInt(quality);
            // Try exact match first
            let levelIndex = hls.levels.findIndex((l: any) => l.height === height);
            
            // If no exact match, find closest height
            if (levelIndex === -1) {
               let minDiff = Infinity;
               hls.levels.forEach((l: any, idx: number) => {
                 if (l.height) {
                   const diff = Math.abs(l.height - height);
                   if (diff < minDiff) {
                     minDiff = diff;
                     levelIndex = idx;
                   }
                 }
               });
            }

            if (levelIndex !== -1) {
              // Seamless switch: keep playing old quality from buffer while new quality loads in background
              if (!playing || (hls.media && hls.media.paused)) {
                hls.currentLevel = levelIndex;
              }
              hls.nextLevel = levelIndex;
              hls.loadLevel = levelIndex;
            }
          }
          return true; // Applied successfully
        }

        // Try YouTube internal player quality hint
        const internal = playerRef.current.getInternalPlayer();
        if (internal && typeof internal.setPlaybackQuality === 'function') {
          const ytQualityMap: Record<string, string> = {
            'Auto': 'auto',
            '1080p': 'hd1080',
            '720p': 'hd720',
            '480p': 'large',
            '360p': 'medium',
            '240p': 'small',
            '144p': 'tiny'
          };
          const targetQ = ytQualityMap[quality] || 'auto';
          try {
            internal.setPlaybackQuality(targetQ);
            if (typeof internal.setPlaybackQualityRange === 'function') {
              internal.setPlaybackQualityRange(targetQ, targetQ);
            }
          } catch (e) {}
          return true;
        }
      }
      return false;
    };

    // Try applying immediately
    if (!applyQuality()) {
      // If levels aren't loaded yet, poll for a few seconds
      let attempts = 0;
      interval = setInterval(() => {
        attempts++;
        if (applyQuality() || attempts > 20) { // Give up after 10 seconds
          clearInterval(interval);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [quality, activeVideo]);


  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    return `${mm}:${ss}`;
  };

  // Safe Double-Tap Seek Handler (prevents clamping to 0 and eliminates forward seek loops)
  const handleSeekDelta = useCallback((deltaSeconds: number) => {
    if (!playerRef.current) return;

    try {
      // 1. Determine current playback time safely
      let ct = 0;
      if (typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time) && isFinite(time) && time > 0) {
          ct = time;
        }
      }
      if (ct === 0 && playedSecondsRef.current > 0) {
        ct = playedSecondsRef.current;
      } else if (ct === 0 && played > 0 && duration > 0) {
        ct = played * duration;
      }

      // 2. Determine duration safely from player instance, ref, or state
      let dur = durationRef.current || duration || 0;
      if (typeof playerRef.current.getDuration === 'function') {
        const d = playerRef.current.getDuration();
        if (typeof d === 'number' && !isNaN(d) && isFinite(d) && d > 0) {
          dur = d;
        }
      }

      // 3. Compute new target seek position
      let target = ct + deltaSeconds;
      if (deltaSeconds < 0) {
        target = Math.max(0, target);
      } else {
        // Forward seeking: cap safely at dur - 1s if duration is known
        if (dur > 0) {
          target = Math.min(Math.max(0, dur - 1), target);
        }
      }

      // Update playedSecondsRef immediately so consecutive rapid double-taps accumulate (+10s, +20s, ...)
      playedSecondsRef.current = target;
      playerRef.current.seekTo(target, 'seconds');

      if (dur > 0) {
        setPlayed(Math.max(0, Math.min(1, target / dur)));
      }
    } catch (err) {
      console.warn("Seek error:", err);
    }
  }, [played, duration]);

  const showSeekFeedback = useCallback((side: 'left' | 'right', text: string) => {
    if (seekFeedbackTimerRef.current) {
      clearTimeout(seekFeedbackTimerRef.current);
    }
    setSeekFeedback({ side, text });
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback(null);
      seekFeedbackTimerRef.current = null;
    }, 700);
  }, []);

  const handleTap = useCallback((side: 'left' | 'right') => {
    const now = Date.now();
    const isDoubleTap = lastTapRef.current.side === side && (now - lastTapRef.current.time) < 320;

    if (isDoubleTap) {
      // Double tap confirmed! Cancel pending single-tap action (e.g. play/pause toggle)
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      // Update tap time to support rapid consecutive taps (+10s, +20s, etc.)
      lastTapRef.current = { side, time: now };

      if (side === 'left') {
        handleSeekDelta(-10);
        showSeekFeedback('left', '-10s');
      } else {
        handleSeekDelta(10);
        showSeekFeedback('right', '+10s');
      }
    } else {
      // First tap: register side and timestamp, trigger single tap action after grace period
      lastTapRef.current = { side, time: now };
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        lastTapRef.current = { side: null, time: 0 };
        singleTapTimerRef.current = null;
        setPlaying(prev => !prev);
        setShowControls(prev => !prev);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }, 300);
    }
  }, [handleSeekDelta, showSeekFeedback]);

  const handleDoneQuality = useCallback(() => {
    setIsAdjustingQuality(false);
    setPlaying(true);
    if (typeof document !== 'undefined' && document.activeElement) {
      (document.activeElement as HTMLElement)?.blur?.();
    }
    if (typeof window !== 'undefined') {
      window.focus();
    }
    try {
      const internal = playerRef.current?.getInternalPlayer();
      if (internal && typeof internal.playVideo === 'function') {
        internal.playVideo();
      }
    } catch (err) {}
  }, []);

  // DVD-style bouncing watermark ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â covers full player
  useEffect(() => {
    let x = 10 + Math.random() * 60;
    let y = 10 + Math.random() * 60;
    // Randomize direction per axis so it doesn't go diagonally forever
    let dx = (Math.random() > 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.02);
    let dy = (Math.random() > 0.5 ? 1 : -1) * (0.015 + Math.random() * 0.015);
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

  // Anti-Downloader / IDM Extension Defense (Neutralizes extension hooks and injected DOM elements)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stripIdmAttributes = (node: Element) => {
      const attrs = ['__idm_id__', '__idm_frm__', '__idm_displayed__'];
      attrs.forEach(a => {
        if (node.hasAttribute(a)) {
          try { node.removeAttribute(a); } catch (e) {}
        }
      });
    };

    const cleanupNodes = () => {
      try {
        const idmEls = document.querySelectorAll('[id*="idm"], [class*="idm"], [__idm_id__], [__idm_frm__]');
        idmEls.forEach(el => {
          stripIdmAttributes(el);
          if (el.id?.toLowerCase().includes('idm') || el.className?.toString().toLowerCase().includes('idm')) {
            try { el.remove(); } catch (e) {}
          }
        });
      } catch (e) {}
    };

    cleanupNodes();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const attr = mutation.attributeName;
          if (attr && (attr.startsWith('__idm') || attr.toLowerCase().includes('idm'))) {
            try { (mutation.target as Element).removeAttribute(attr); } catch (e) {}
          }
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              const id = node.id || '';
              const cls = typeof node.className === 'string' ? node.className : '';
              if (id.toLowerCase().includes('idm') || cls.toLowerCase().includes('idm')) {
                try { node.remove(); } catch (e) {}
              }
              stripIdmAttributes(node);
            }
          });
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['__idm_id__', '__idm_frm__', '__idm_displayed__']
    });

    const interval = setInterval(cleanupNodes, 1500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Check for successful Payable return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('checkout') || urlParams.get('session_id');

    if (paymentStatus === 'success' && sessionId && user) {
      // Show processing state
      const verifyPayment = async () => {
        try {
          const res = await fetch('/api/payable/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkoutId: sessionId })
          });
          const data = await res.json();
          if (data.success) {
            // Backend now securely updates the database!
            window.history.replaceState({}, document.title, window.location.pathname);
            alert("Payment Successful! Access granted.");
            window.location.reload();
          } else {
            alert("Payment verification failed: " + (data.status || data.error));
          }
        } catch (err) {
          console.error(err);
        }
      };
      verifyPayment();
    } else if (paymentStatus === 'cancelled') {
      alert("Payment was cancelled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, id]);

  useEffect(() => {
    if (!id) return;

    let unsubCourse: any;
    let unsubFolders: any;
    let unsubVideos: any;
    let unsubLive: any;
    let unsubConfig: any;

    const setupListeners = () => {
      try {
        // Course listener
        unsubCourse = onSnapshot(doc(db, "courses", id), (docSnap) => {
          if (docSnap.exists()) {
            const courseData = { id: docSnap.id, ...docSnap.data() };
            setCourse((prev: any) => ({ ...(prev || {}), ...courseData }));
            setCourseNotFound(false);
            try {
              sessionStorage.setItem(`cached_course_${id}`, JSON.stringify(courseData));
            } catch {}
          } else {
            // Only set not found if we genuinely don't have the course cached
            setCourse((prev: any) => {
              if (!prev) setCourseNotFound(true);
              return prev;
            });
          }
          setLoading(false);
        }, (err) => {
          console.error("Course listener error:", err);
          setLoading(false);
        });

        // Folders listener
        const qFolders = query(collection(db, "folders"), where("courseId", "==", id));
        unsubFolders = onSnapshot(qFolders, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.createdAt - b.createdAt);
          setFolders(data);
        }, (err) => console.error("Folders listener error:", err));

        // Videos listener
        const qVideos = query(collection(db, "videos"), where("courseId", "==", id));
        unsubVideos = onSnapshot(qVideos, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.createdAt - b.createdAt);
          setVideos(data);
        }, (err) => console.error("Videos listener error:", err));

        // Past live classes listener
        const qLive = query(collection(db, "live_classes"), where("courseId", "==", id), where("status", "==", "ended"));
        unsubLive = onSnapshot(qLive, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.scheduledFor - a.scheduledFor);
          setPastLiveClasses(data);
        }, (err) => console.error("Live listener error:", err));

        // Payment config listener
        unsubConfig = onSnapshot(doc(db, "siteConfig", "payments"), (docSnap) => {
          if (docSnap.exists()) {
            const conf = docSnap.data();
            setPaymentConfig(conf);
            if (conf.cardEnabled && !conf.bankEnabled) setPaymentMethod('card');
            else if (!conf.cardEnabled && conf.bankEnabled) setPaymentMethod('bank');
          }
        }, (err) => console.error("Config listener error:", err));

      } catch (err) {
        console.error("Failed to setup listeners", err);
        setLoading(false);
      }
    };
    setupListeners();

    



    // Anti-IDM / Downloader Extension DOM Shield
    const stopShield = startExtensionShield((detectedTool) => {
      setExtensionDetected(detectedTool);
      setPlaying(false);
    });

    // Unlock orientation when exiting fullscreen and immediately reveal player controls
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
      resetControlsTimeout();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      if (unsubCourse) unsubCourse();
      if (unsubFolders) unsubFolders();
      if (unsubVideos) unsubVideos();
      if (unsubLive) unsubLive();
      if (unsubConfig) unsubConfig();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      stopShield();
    };
  }, [id]);

  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (!user || folders.length === 0 || hasAutoOpenedRef.current) return;
    const accessibleFolders = sidebarFolders.filter((f: any) => {
      const exp = user.folderAccess?.[f.id];
      return user.role === 'admin' || user.role === 'teacher' || (user.accessibleCourses && user.accessibleCourses.includes(id)) || (exp && exp > Date.now());
    });

    if (accessibleFolders.length > 0) {
      hasAutoOpenedRef.current = true;
      const firstFolder = accessibleFolders[0];
      setActiveFolderId(firstFolder.id);
      if (videos.length > 0) {
        const firstFolderVideos = videos.filter((v: any) => v.folderId === firstFolder.id);
        if (firstFolderVideos.length > 0) {
          setActiveVideo(firstFolderVideos[0]);
        }
      }
    }
  }, [folders, videos, user, id]);

  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  // Video Player Device Permissions
  const activeSettings: VideoPlayerSettings = useMemo(() => {
    if (activeVideo?.playerSettings) {
      return {
        defaultPlayer: activeVideo.playerSettings.defaultPlayer || globalPlayerSettings?.defaultPlayer || defaultPlayerSettings.defaultPlayer,
        bunny: { ...defaultPlayerSettings.bunny, ...(globalPlayerSettings?.bunny || {}), ...(activeVideo.playerSettings.bunny || {}) },
        r2: { ...defaultPlayerSettings.r2, ...(globalPlayerSettings?.r2 || {}), ...(activeVideo.playerSettings.r2 || {}) },
        youtube: { ...defaultPlayerSettings.youtube, ...(globalPlayerSettings?.youtube || {}), ...(activeVideo.playerSettings.youtube || {}) },
      };
    }
    return globalPlayerSettings || defaultPlayerSettings;
  }, [activeVideo, globalPlayerSettings]);

  const isBunnyPermitted = useMemo(() => {
    if (!activeVideo) return false;
    const hasBunnyContent = activeVideo.platform === 'bunny' || !!bunnyEmbedUrl || (!!activeVideo.url && !activeVideo.url.includes('youtube') && !activeVideo.url.includes('youtu.be') && !activeVideo.url.includes('r2.cloudflarestorage.com') && !activeVideo.url.includes('r2.dev'));
    return hasBunnyContent && isPlayerPermitted(activeSettings.bunny, deviceType);
  }, [activeVideo, bunnyEmbedUrl, activeSettings, deviceType]);

  const isR2Permitted = useMemo(() => {
    if (!activeVideo) return false;
    const hasR2Content = !!activeVideo.r2Url || activeVideo.platform === 'r2' || (!!activeVideo.url && (activeVideo.url.includes('r2.cloudflarestorage.com') || activeVideo.url.includes('r2.dev') || activeVideo.url.includes('.site/videos/')));
    return hasR2Content && isPlayerPermitted(activeSettings.r2, deviceType);
  }, [activeVideo, activeSettings, deviceType]);

  const activeYoutubeId = useMemo(() => {
    if (!activeVideo) return null;
    return extractYoutubeId(activeVideo.originalYoutubeUrl) || extractYoutubeId(activeVideo.url);
  }, [activeVideo]);

  const isYoutubePermitted = useMemo(() => {
    if (!activeVideo) return false;
    const hasYoutubeContent = !!activeVideo.originalYoutubeUrl || activeVideo.platform === 'youtube' || (!!activeVideo.url && (activeVideo.url.includes('youtube') || activeVideo.url.includes('youtu.be')));
    return hasYoutubeContent && isPlayerPermitted(activeSettings.youtube, deviceType);
  }, [activeVideo, activeSettings, deviceType]);

  const activeVideoRef = useRef(activeVideo);
  useEffect(() => { 
    if (activeVideo?.id && activeVideoIdRef.current !== activeVideo.id) {
      activeVideoIdRef.current = activeVideo.id;
      playedSecondsRef.current = 0;
      setPlayed(0);
    }
    activeVideoRef.current = activeVideo; 
    const preferredPlayer = activeSettings?.defaultPlayer || 'bunny';

    const hasBunny = Boolean(activeVideo?.videoId || activeVideo?.platform === 'bunny');
    const hasR2 = Boolean(activeVideo?.r2Url || activeVideo?.platform === 'r2');
    const hasYoutube = Boolean(activeVideo?.originalYoutubeUrl || activeVideo?.platform === 'youtube');

    const permittedList: ('bunny' | 'r2' | 'youtube')[] = [];
    if (isBunnyPermitted && (hasBunny || (!hasR2 && !hasYoutube))) permittedList.push('bunny');
    if (isR2Permitted && hasR2) permittedList.push('r2');
    if (isYoutubePermitted && hasYoutube) permittedList.push('youtube');

    if (permittedList.length === 0) {
      if (isR2Permitted && hasR2) permittedList.push('r2');
      else if (isBunnyPermitted) permittedList.push('bunny');
      else if (isYoutubePermitted) permittedList.push('youtube');
      else return;
    }

    if (permittedList.includes(preferredPlayer as any)) {
      setActiveServer(preferredPlayer as any);
    } else {
      setActiveServer(permittedList[0]);
    }
  }, [activeVideo, isBunnyPermitted, isR2Permitted, isYoutubePermitted, activeSettings]);

  // Completely block Lenis smooth-scroll hijacking over the syllabus container
  useEffect(() => {
    const el = syllabusScrollRef.current;
    if (!el) return;
    const stopWheel = (e: Event) => {
      // Allow native scroll, but stop it from bubbling up to Window where Lenis catches it
      e.stopPropagation();
    };
    el.addEventListener('wheel', stopWheel, { passive: true });
    el.addEventListener('touchstart', stopWheel, { passive: true });
    el.addEventListener('touchmove', stopWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', stopWheel);
      el.removeEventListener('touchstart', stopWheel);
      el.removeEventListener('touchmove', stopWheel);
    };
  }, [folders]); // re-bind if structure changes
  const lastStudyDateRef = useRef(user?.lastStudyDate || new Date().toISOString().split('T')[0]);

  // Heartbeat & Presence Logic (Tracks Real "Students Watching" and Updates "Total Study Time")
  useEffect(() => {
    if (!user?.uid) return;
    lastStudyDateRef.current = user.lastStudyDate || new Date().toISOString().split('T')[0];

    // Local study time tracker (runs every 60s, updates local memory only, NO Firebase writes)
    const studyTimer = setInterval(() => {
      const currentVideo = activeVideoRef.current;
      if (!currentVideo) return;
      
      if (playingRef.current || currentVideo.type === 'resource') {
        recordStudyMinute(); // Buffers locally in AuthContext
      }
    }, 60000);

    // Presence pinger (runs every 5 minutes to vastly reduce Firebase write costs)
    const presenceTimer = setInterval(() => {
      const currentVideo = activeVideoRef.current;
      if (!currentVideo) return;
      
      const presenceRef = doc(db, 'presence', `${currentVideo.id}_${user.uid}`);
      setDoc(presenceRef, { videoId: currentVideo.id, userId: user.uid, lastActive: Date.now() }, { merge: true }).catch(() => {});
    }, 300000);

    return () => {
      clearInterval(studyTimer);
      clearInterval(presenceTimer);
    };
  }, [user?.uid]); // Removed activeVideo and playing from deps so interval never resets!

  // Initial immediate ping when playing starts
  useEffect(() => {
    if (playing && activeVideo && user?.uid) {
      const presenceRef = doc(db, 'presence', `${activeVideo.id}_${user.uid}`);
      setDoc(presenceRef, { videoId: activeVideo.id, userId: user.uid, lastActive: Date.now() }, { merge: true });
      
      const nowStr = new Date().toISOString().split('T')[0];
      updateDoc(doc(db, 'users', user.uid), {
        lastStudyPing: Date.now(),
        lastStudyDate: nowStr
      }).catch(e => console.log("Initial ping failed", e?.message));
    }
  }, [playing, activeVideo?.id, user?.uid]);

  // Listen to all viewers for this video
  useEffect(() => {
    if (!activeVideo) return;
    const qPresence = query(collection(db, 'presence'), where('videoId', '==', activeVideo.id));
    const unsub = onSnapshot(qPresence, (snap) => {
      const now = Date.now();
      let count = 0;
      snap.forEach(d => {
        if (now - d.data().lastActive < 90000) { // Active in last 90 seconds
          count++;
        }
      });
      setViewersCount(count);
    });

    return () => {
      unsub();
    };
  }, [activeVideo]);

  if (loading && !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-12 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading Course Content...</p>
      </div>
    );
  }

  const visibleFolders = folders.filter(f => user?.role === 'admin' || user?.role === 'teacher' || !f.isHidden || (user?.folderAccess?.[f.id] && user.folderAccess[f.id] > Date.now()));
  const legacyCourseAccess = user?.accessibleCourses && user.accessibleCourses.includes(id);
  const courseFolders = visibleFolders;
  const hasFolderAccess = courseFolders.some(f => {
    const exp = user?.folderAccess?.[f.id];
    return exp && exp > Date.now();
  });
  const hasAccess = user?.role === 'admin' || user?.role === 'teacher' || legacyCourseAccess || hasFolderAccess;

  const handlePaymentSubmit = async () => {
    if (!user || !checkoutFolder) return;

    if (paymentMethod === 'card') {
      setIsSubmittingPayment(true);
      try {
        const res = await fetch('/api/payable/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: id,
              folderId: checkoutFolder.id,
            courseName: course.name || checkoutFolder.name,
            price: checkoutFolder.price,
            userId: user.uid,
            userEmail: user.email,
            userPhone: user.phone,
            studentId: user.studentId,
            userName: user.name
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Payment gateway error: " + (data.error || "Unknown error"));
          setIsSubmittingPayment(false);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to connect to payment gateway.");
        setIsSubmittingPayment(false);
      }
      return;
    }

    
    if (paymentMethod === 'bank' && !receiptFile) {
      alert("Please upload your bank transfer receipt.");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      let receiptUrl = "";

      if (paymentMethod === 'bank' && receiptFile) {
        try {
          // Upload directly to Bunny CDN (forceBunny = true)
          receiptUrl = await uploadToS3(receiptFile, "payment-receipts", true);
        } catch (uploadErr: any) {
          alert(`ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ Failed to upload receipt: ${uploadErr.message}`);
          setIsSubmittingPayment(false);
          return;
        }
      }

      // Save payment record to Firestore
      try {
        await addDoc(collection(db, "payments"), {
          studentId: user.uid,
          studentName: user.name || "Student",
          studentEmail: user.email,
          folderId: checkoutFolder.id,
          folderName: checkoutFolder.name,
          courseId: id,
          courseName: course.name || "",
          teacherId: course.teacherId || null,
          teacherName: course.teacherName || null,
          amount: checkoutFolder.price || 0,
          method: paymentMethod,
          receiptUrl: receiptUrl,
          status: (paymentMethod as string) === 'card' ? 'approved' : 'pending',
          createdAt: Date.now()
        });

        // Notify Admin of payment / pending payment receipt
        const studentLabel = user.name ? `${user.name}${user.studentId ? ` (${user.studentId})` : ''}` : (user.studentId || user.email || 'A student');
        const paymentTypeLabel = paymentMethod === 'bank' ? 'Bank Transfer' : paymentMethod.toUpperCase();
        
        addDoc(collection(db, "notifications"), {
          target: "admin",
          title: paymentMethod === 'bank' ? "New Pending Payment Receipt 🧾" : "Payment Received (Card) 🧾",
          message: `${studentLabel} submitted a ${paymentTypeLabel} payment of Rs. ${checkoutFolder.price || 0} for "${checkoutFolder.name}". Pending payment verification.`,
          link: "/admin#payments",
          timestamp: Date.now(),
          type: "payment",
          readBy: []
        }).catch(err => console.error("Failed to notify admin of payment:", err));
      } catch (writeError: any) {
        if (writeError.code === 'permission-denied') {
          alert("⛔ Permission Denied: Your Firestore Rules are blocking payment submissions.\n\nPlease update Firestore Rules in Firebase Console to allow authenticated writes.");
          setIsSubmittingPayment(false);
          return;
        }
        throw writeError;
      }

      if ((paymentMethod as string) === 'card') {
        try {
          const userRef = doc(db, 'users', user.uid);
          const folderAccess = user.folderAccess || {};
          const now = Date.now();
          const currentExp = folderAccess[checkoutFolder.id] && folderAccess[checkoutFolder.id] > now ? folderAccess[checkoutFolder.id] : now;
          folderAccess[checkoutFolder.id] = currentExp + (30 * 24 * 60 * 60 * 1000);
          await updateDoc(userRef, { folderAccess });
        } catch (dbError) {
          console.error("Error updating user folderAccess:", dbError);
        }
        alert("Card Payment Successful! Access granted for 30 days.");
        setCheckoutFolder(null);
      } else {
        setPaymentSuccess(true);
      }
    } catch (e) {
      console.error("Payment failed", e);
      alert("Something went wrong submitting your payment. Please try again.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSendCourseDoubt = async () => {
    if (!doubtText.trim() || !user || !course) return;
    setIsDoubtSending(true);
    try {
      const studentDisplayName = user.name || (user.studentId ? `Student (${user.studentId})` : (user.email?.split('@')[0] || "Student"));
      
      // Save to examMessages collection with course and teacher attribution
      await addDoc(collection(db, 'examMessages'), {
        type: 'video_doubt',
        courseId: id,
        courseName: course.name,
        videoId: activeVideo?.id || null,
        videoTitle: activeVideo?.title || null,
        teacherId: course.teacherId || null,
        teacherName: course.teacherName || null,
        userId: user.uid,
        studentName: studentDisplayName,
        studentEmail: user.email || "",
        message: doubtText.trim(),
        timestamp: Date.now(),
        status: 'unread'
      });

      // 1. Notify Assigned Teacher directly if available (and only this teacher)
      if (course.teacherId) {
        await addDoc(collection(db, 'notifications'), {
          target: course.teacherId, // Delivered ONLY to this teacher
          title: `New Student Doubt ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¤ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â - ${course.name}`,
          message: `${studentDisplayName} asked: "${doubtText.slice(0, 70)}${doubtText.length > 70 ? '...' : ''}" in ${activeVideo?.title || course.name}.`,
          link: "/admin#messages",
          timestamp: Date.now(),
          type: "academic",
          readBy: []
        });
      }

      // 2. Notify Admin so admin has oversight across all courses
      await addDoc(collection(db, 'notifications'), {
        target: "admin",
        title: `Student Doubt [${course.teacherName || "Unassigned"}] - ${course.name}`,
        message: `${studentDisplayName} asked: "${doubtText.slice(0, 70)}${doubtText.length > 70 ? '...' : ''}" in ${course.name}.`,
        link: "/admin#messages",
        timestamp: Date.now(),
        type: "academic",
        readBy: []
      });

      setDoubtSuccess(true);
      setDoubtText("");
      setTimeout(() => setDoubtSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to submit doubt:", err);
      alert("Failed to send doubt. Please try again.");
    } finally {
      setIsDoubtSending(false);
    }
  };

  if (courseNotFound && !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="bg-destructive/10 border border-destructive/30 p-8 rounded-2xl max-w-md w-full">
          <h3 className="text-xl font-bold text-destructive mb-2">Course Not Found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            We couldn&apos;t locate this course. It may have been archived or moved.
          </p>
          <Link href="/courses" className={buttonVariants({ variant: "default", className: "w-full" })}>
            Return to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-12 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading Course Content...</p>
      </div>
    );
  }

    // Monthly Course Interceptor
  let displayFolders = visibleFolders;
  let virtualNextMonth = null;
  if (course.isMonthly) {
    const now = new Date();
    
    // Filter out expired folders if user doesn't have access
    displayFolders = visibleFolders.filter(folder => {
      const hasAccess = user?.role === 'admin' || user?.role === 'teacher' || (user?.folderAccess && user.folderAccess[folder.id] && user.folderAccess[folder.id] > now.getTime());
      if (hasAccess) return true; // Always show if they have access

      const folderDate = new Date(folder.name);
      if (isNaN(folderDate.getTime())) return true; // Not a valid date, keep it just in case
      
      // Folder expires on the 3rd day of the next month
      // We set it to the 4th at midnight (which covers all of the 3rd)
      const expirationDate = new Date(folderDate.getFullYear(), folderDate.getMonth() + 1, 4);
      
      if (now.getTime() > expirationDate.getTime()) {
        return false; // Hide it
      }
      return true;
    });

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() >= daysInMonth - 5) {
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthName = nextMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      const nextMonthExists = visibleFolders.some(f => f.name === nextMonthName);
      if (!nextMonthExists) {
        virtualNextMonth = {
          id: `month_${course.id}_${nextMonthDate.getFullYear()}_${nextMonthDate.getMonth()}`,
          name: nextMonthName,
          isVirtual: true,
          price: visibleFolders.find(f => f.price > 0)?.price || 0
        };
        displayFolders = [...displayFolders, virtualNextMonth];
      }
    }
  }

  // Filter sidebar folders if isolated to a month
  const sidebarFolders = (course.isMonthly && selectedMonthlyFolderId) 
    ? visibleFolders.filter(f => f.id === selectedMonthlyFolderId) 
    : visibleFolders;

  return (
    <>
      <div className={checkoutFolder ? "hidden" : "block"}>
      {course.isMonthly && !selectedMonthlyFolderId ? (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-[var(--gold)] flex items-center gap-3">
                <PlayCircle className="w-8 h-8" /> {course.name}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm max-w-xl">
                Select a month below to access the live classes, recordings, and PDF notes for that specific period.
              </p>
            </div>
            <Link href="/courses">
              <Button variant="outline" size="sm" className="border-secondary/30 hover:border-primary/50 text-xs">
                &larr; Back to Subjects
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...displayFolders].sort((a, b) => {
              if (a.isVirtual) return -1;
              if (b.isVirtual) return 1;
              return (b.createdAt || 0) - (a.createdAt || 0);
            }).map(folder => {
               const hasAccess = user?.role === 'admin' || user?.role === 'teacher' || (user?.folderAccess && user.folderAccess[folder.id] && user.folderAccess[folder.id] > Date.now());
               return (
                 <Card key={folder.id} className={`overflow-hidden transition-all duration-300 border-secondary/20 hover:border-[var(--gold)]/50 hover:shadow-lg hover:shadow-[var(--gold)]/10 ${!hasAccess ? 'opacity-80 hover:opacity-100' : ''}`}>
                   <div className="aspect-[4/3] bg-gradient-to-br from-secondary/30 to-background flex flex-col items-center justify-center p-6 border-b border-secondary/20 relative group">
                     {!hasAccess && <Lock className="w-5 h-5 absolute top-4 right-4 text-muted-foreground/50 group-hover:text-red-400 transition-colors" />}
                     {hasAccess && <CheckCircle2 className="w-5 h-5 absolute top-4 right-4 text-green-500" />}
                     <div className="text-center group-hover:scale-105 transition-transform duration-300">
                       <Folder className={`w-14 h-14 mx-auto mb-3 ${hasAccess ? 'text-[var(--gold)]' : 'text-muted-foreground/50'}`} />
                       <h3 className="font-bold text-xl text-foreground">{folder.name}</h3>
                       <p className="text-xs text-muted-foreground mt-1 font-medium">
                         {videos.filter(v => v.folderId === folder.id).length} Videos
                       </p>
                       {folder.isVirtual && (
                         <span className="bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full mt-3 inline-block">
                           Coming Soon
                         </span>
                       )}
                     </div>
                   </div>
                   <CardContent className="p-4 bg-background/50 flex flex-col gap-3 border-t-0">
                     {hasAccess ? (
                       <Button className="w-full bg-[var(--gold)] text-black hover:bg-[var(--light-gold)] font-bold shadow-md shadow-[var(--gold)]/20" onClick={() => setSelectedMonthlyFolderId(folder.id)}>
                         Enter Classes
                       </Button>
                     ) : (
                       <Button className="w-full bg-secondary hover:bg-[var(--gold)] hover:text-black text-foreground font-bold transition-all" onClick={() => setCheckoutFolder(folder)}>
                         {folder.price ? `Pay Rs. ${folder.price}` : 'Request Access'}
                       </Button>
                     )}
                   </CardContent>
                 </Card>
               );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {course.isMonthly && (
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedMonthlyFolderId(null)} className="h-8 px-2 text-xs text-muted-foreground hover:text-[var(--gold)]">
                &larr; Back to Months
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-4">
        <div 
          className="aspect-video bg-black rounded-xl overflow-hidden border border-secondary/50 relative flex items-center justify-center group"
          onContextMenu={(e) => e.preventDefault()} // Disable right click
        >
          {user ? (
            activeVideo ? (
              activeVideo.type === 'resource' ? (
                <div className="w-full h-full absolute inset-0 z-[5] bg-background border border-border rounded-xl overflow-hidden flex flex-col">
                  <PdfViewer 
                    url={activeVideo.url} 
                    title={activeVideo.title} 
                    height="100%" 
                    allowDownload={true} 
                    className="w-full h-full"
                  />
                </div>
              ) : (activeServer !== 'youtube' && (!activeVideo.isReady || activeVideo.processingStatus === 'downloading')) ? (
                <div className="w-full h-full absolute inset-0 z-10 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Video is Processing</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    This video is currently being downloaded or optimized by the cloud server. It will be available to watch shortly!
                  </p>
                </div>
              ) : (activeServer !== 'youtube' && activeVideo.transcodeStatus === 'processing') ? (
                <div className="w-full h-full absolute inset-0 z-10 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Optimizing Video for Smooth Playback</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    AWS MediaConvert is generating 1080p, 720p, 480p, and 144p quality formats. This takes 1ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ2 minutes after uploading. It will start playing automatically once ready!
                  </p>
                </div>
              ) : (!isBunnyPermitted && !isR2Permitted && !isYoutubePermitted && activeVideo.platform !== 'zoom' && activeVideo.type !== 'resource') ? (
                <div className="w-full h-full absolute inset-0 z-10 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
                  <h3 className="text-xl font-bold text-white mb-2">Playback Restricted on this Device</h3>
                  <p className="text-sm text-zinc-400 max-w-md">
                    Playback for this lesson has been disabled on <strong>{getDeviceLabel(deviceType)}</strong> according to academy settings. Please access this lesson from an approved device.
                  </p>
                </div>
              ) : extensionDetected ? (
                <div className="w-full h-full absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <ShieldAlert className="w-9 h-9 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Video Downloader / Ripper Detected</h3>
                  <p className="text-sm text-red-400 font-semibold mb-3">
                    {extensionDetected} was detected attaching to this player.
                  </p>
                  <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-6">
                    To protect proprietary academy course materials, streaming is automatically disabled while media grabber extensions or download managers are active. Please disable or remove the extension in your browser, or open this page in Incognito / Private browsing mode, then refresh the page.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-red-900/40 cursor-pointer"
                  >
                    Refresh Page
                  </button>
                </div>
              ) : (
                <div 
                  ref={playerContainerRef} 
                  className={`w-full h-full absolute inset-0 z-0 bg-black group/player overflow-hidden select-none ${
                    !showControls && playing ? 'cursor-none' : 'cursor-auto'
                  }`}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onMouseMove={resetControlsTimeout}
                  onMouseEnter={resetControlsTimeout}
                  onMouseLeave={() => {
                    if (playing && !isAdjustingQuality && !showSpeedMenu && !showQualityMenu) {
                      setShowControls(false);
                    }
                  }}
                >
                      <>
                        {activeVideo.platform === 'zoom' && (
                              <iframe 
                                src={activeVideo.url.replace(/\/j\/(\d+)/, '/wc/join/$1')} 
                                className="w-full h-full border-0 relative z-[60] pointer-events-auto bg-black"
                                allow="camera *; microphone *; display-capture *; accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen={true}
                              />
                          )}

                          {activeServer === 'bunny' && isBunnyPermitted && activeVideo.platform === 'bunny' && (
                            <iframe 
                              src={(bunnyEmbedUrl && !bunnyEmbedUrl.startsWith('CRACKED')) ? bunnyEmbedUrl : activeVideo.url} 
                              className="w-full h-full border-0 relative z-[50]"
                              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                              allowFullScreen={true}
                            />
                        )}

                        <ShadowPlayerWrapper 
                          className={`absolute inset-0 w-full h-full ${
                            (activeServer === 'bunny' && isBunnyPermitted && activeVideo.platform === 'bunny')
                              ? 'hidden'
                              : ''
                          }`}
                          style={{
                            pointerEvents: isAdjustingQuality ? 'auto' : 'none'
                          }}
                        >
                          <ReactPlayer
                            key={`player_${activeVideo.id}_${activeServer}`}
                            ref={playerRef}
                        url={
                          activeServer === 'youtube'
                            ? (activeVideo.originalYoutubeUrl || activeVideo.url)
                            : activeServer === 'r2'
                            ? (activeVideo.r2Url || activeVideo.url)
                            : activeVideo.url
                        }
                      width="100%"
                      height="100%"
                      playing={playing}
                      playbackRate={playbackRate}
                      volume={volume}
                      muted={muted}
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                      onEnded={() => {
                        setPlaying(false);
                        if (activeVideo?.id) {
                          recordProgress(activeVideo.id, 100);
                        }
                      }}
                      onProgress={(state) => {
                        setPlayed(state.played);
                        playedSecondsRef.current = state.playedSeconds;
                        if (activeVideo && user?.uid) {
                          localStorage.setItem(`video_progress_${activeVideo.id}_${user.uid}`, state.playedSeconds.toString());
                        }
                        if (activeVideo?.id && state.played != null) {
                          const pct = Math.min(100, Math.round(state.played * 100));
                          recordProgress(activeVideo.id, pct);
                        }
                      }}
                      onDuration={(dur) => {
                        durationRef.current = dur;
                        setDuration(dur);
                      }}
                      onError={(err) => {
                        console.warn("Playback error encountered:", err);
                        if (activeServer === 'bunny' && isR2Permitted && activeVideo?.r2Url) {
                          console.info("Bunny playback failed, automatically falling over to R2 source...");
                          setActiveServer('r2');
                        } else if (activeServer === 'bunny' && isYoutubePermitted && (activeVideo?.originalYoutubeUrl || activeVideo?.platform === 'youtube')) {
                          console.info("Bunny playback failed, automatically falling over to YouTube source...");
                          setActiveServer('youtube');
                        } else if (activeServer === 'r2' && isBunnyPermitted && (activeVideo?.videoId || activeVideo?.platform === 'bunny')) {
                          console.info("R2 playback failed, automatically falling over to Bunny source...");
                          setActiveServer('bunny');
                        } else if (activeServer === 'youtube' && isBunnyPermitted && (activeVideo?.videoId || activeVideo?.platform === 'bunny')) {
                          console.info("YouTube playback failed, automatically falling over to Bunny source...");
                          setActiveServer('bunny');
                        }
                      }}
                      onReady={() => {
                        if (prevServerRef.current !== activeServer) {
                          prevServerRef.current = activeServer;
                          if (playerRef.current && playedSecondsRef.current > 0) {
                            playerRef.current.seekTo(playedSecondsRef.current, 'seconds');
                          }
                        }
                        if (activeVideo && user?.uid && playerRef.current) {
                          if (!readyFiredRef.current.has(activeVideo.id)) {
                            readyFiredRef.current.add(activeVideo.id);
                            const saved = localStorage.getItem(`video_progress_${activeVideo.id}_${user.uid}`);
                            if (saved) {
                              const savedSec = parseFloat(saved);
                              if (savedSec > 0) {
                                playedSecondsRef.current = savedSec;
                                playerRef.current.seekTo(savedSec, 'seconds');
                              }
                            }
                          }
                        }
                        
                        const internal = playerRef.current?.getInternalPlayer();
                        if (internal && typeof internal.unloadModule === 'function') {
                          try {
                            internal.unloadModule("captions");
                            internal.unloadModule("cc");
                          } catch (e) {}
                        }

                        // Apply quality on ready & dynamically discover available stream qualities from HLS manifest
                        const hls = playerRef.current?.getInternalPlayer('hls');
                        if (hls && hls.levels && hls.levels.length > 0) {
                          const ALLOWED = ['720p', '480p', '360p'];
                          const heights = hls.levels
                            .filter((l: any) => l.height)
                            .map((l: any) => `${l.height}p`)
                            .filter((q: string) => ALLOWED.includes(q));
                          if (heights.length > 0) {
                            const sorted = (Array.from(new Set(heights)) as string[]).sort((a, b) => parseInt(b) - parseInt(a));
                            setAvailableQualities(['Auto', ...sorted]);
                          }

                          if (quality === 'Auto') {
                            if (!playing || (hls.media && hls.media.paused)) {
                              hls.currentLevel = -1;
                            }
                            hls.nextLevel = -1;
                            hls.loadLevel = -1;
                          } else {
                            const height = parseInt(quality);
                            let levelIndex = hls.levels.findIndex((l: any) => l.height === height);
                            if (levelIndex === -1) {
                               let minDiff = Infinity;
                               hls.levels.forEach((l: any, idx: number) => {
                                 if (l.height) {
                                   const diff = Math.abs(l.height - height);
                                   if (diff < minDiff) {
                                     minDiff = diff;
                                     levelIndex = idx;
                                   }
                                 }
                               });
                            }
                            if (levelIndex !== -1) {
                              if (!playing || (hls.media && hls.media.paused)) {
                                hls.currentLevel = levelIndex;
                              }
                              hls.nextLevel = levelIndex;
                              hls.loadLevel = levelIndex;
                            }
                          }
                        }

                        if (internal && typeof internal.setPlaybackQuality === 'function') {
                          const ytQualityMap: Record<string, string> = {
                            'Auto': 'auto',
                            '1080p': 'hd1080',
                            '720p': 'hd720',
                            '480p': 'large',
                            '360p': 'medium',
                            '240p': 'small',
                            '144p': 'tiny'
                          };
                          try {
                            internal.setPlaybackQuality(ytQualityMap[quality] || 'auto');
                            if (typeof internal.setPlaybackQualityRange === 'function') {
                              internal.setPlaybackQualityRange(ytQualityMap[quality] || 'auto', ytQualityMap[quality] || 'auto');
                            }
                          } catch (e) {}
                        }
                      }}
                      config={{
                        dailymotion: {
                          params: {
                            controls: false,
                            'queue-enable': false,
                            'ui-logo': false
                          }
                        },
                        youtube: {
                          playerVars: { 
                            showinfo: 0, 
                            controls: 1, 
                            autoplay: playing ? 1 : 0,
                            rel: 0, 
                            modestbranding: 1,
                            disablekb: 1,
                            iv_load_policy: 3,
                            cc_load_policy: 0,
                            cc_lang_pref: 'none',
                            fs: 0,
                            start: Math.floor(playedSecondsRef.current || 0)
                          }
                        },
                        file: {
                          attributes: {
                            controlsList: "nodownload",
                            onContextMenu: (e: any) => { e.preventDefault(); e.stopPropagation(); },
                            onDragStart: (e: any) => { e.preventDefault(); e.stopPropagation(); },
                            disablePictureInPicture: true
                          },
                          hlsOptions: {
                            enableWorker: true,
                            maxBufferLength: 30,
                            maxMaxBufferLength: 60,
                            backBufferLength: 30
                          }
                        }
                      }}
                    />

                    {/* SURGICAL TRANSPARENT SHIELDS (Active ONLY during quality adjustment) */}
                    {isAdjustingQuality && (
                      <>
                        {/* 1. Danger Zone 1: Top Bar (blocks Title, Avatar, & Channel link; leaves top-right Gear accessible) */}
                        <div 
                          className="absolute top-0 left-0 right-28 h-16 bg-transparent z-30 pointer-events-auto select-none"
                          onClick={(e) => { e.stopPropagation(); }}
                          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        />

                        {/* 2. Danger Zone 2: Bottom-Left Share & Watch Later buttons */}
                        <div 
                          className="absolute bottom-0 left-0 w-48 h-20 bg-transparent z-30 pointer-events-auto select-none"
                          onClick={(e) => { e.stopPropagation(); }}
                          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        />

                        {/* 3. Danger Zone 3: Bottom-Right - COMPLETELY BLOCKS YouTube logo button, More Videos shelf, and thumbnail */}
                        <div 
                          className="absolute bottom-0 right-0 w-80 h-24 bg-transparent z-30 pointer-events-auto select-none"
                          onClick={(e) => { e.stopPropagation(); }}
                          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        />

                        {/* 4. Danger Zone 4A: Bottom-Sheet Mode - Big block permanently shielding '... More options' & 'CC' without any edge gaps */}
                        <div 
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[460px] max-w-[95%] h-[105px] bg-transparent z-30 pointer-events-auto select-none"
                          onClick={(e) => { e.stopPropagation(); }}
                          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        />

                        {/* 5. Danger Zone 4B: Top-Right Dropdown Mode - Permanently blocks '... More options' (Copy URL), Captions, Speed */}
                        <div 
                          className="absolute top-24 right-2 w-72 h-40 bg-transparent z-30 pointer-events-auto select-none"
                          onClick={(e) => { e.stopPropagation(); }}
                          onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        />

                        {/* 6. Pulsing visual indicator over Top-Right ⚙ Gear icon */}
                        <div className="absolute top-2.5 right-2 w-10 h-10 border-2 border-primary/90 bg-primary/20 rounded-full pointer-events-none z-40 animate-pulse flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.8)]">
                          <span className="text-xs font-black text-primary animate-bounce">⚙</span>
                        </div>

                        {/* 7. Top Settings Guidance Notification Popup */}
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950/95 backdrop-blur-md border border-primary/60 px-5 py-3 rounded-2xl text-white shadow-2xl animate-in fade-in zoom-in-95 select-none pointer-events-auto max-w-[92%]">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                            <Settings className="w-4 h-4 animate-spin-slow" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              Click ⚙️ Gear (Top-Right) → Quality
                              <span className="inline-block animate-bounce text-primary text-sm font-black">
                                ↗
                              </span>
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              Click the highlighted ⚙ icon at top-right → select Quality → pick your resolution, then click Done.
                            </span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDoneQuality();
                            }}
                            className="bg-primary hover:bg-primary/80 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg cursor-pointer flex-shrink-0"
                          >
                            Done ✓
                          </button>
                        </div>
                      </>
                    )}

                        </ShadowPlayerWrapper>
                      </>

                {/* 3px hairline bottom mask: cleanly hides YouTube's 3px red timeline bar without any zoom or cropping */}
                {!isAdjustingQuality && (activeServer === 'youtube' || activeVideo?.platform === 'youtube') && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black z-20 pointer-events-none" />
                )}

                {/* Big Center Play Button Overlay when !playing */}
                {!playing && !isAdjustingQuality && (
                  <div 
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-20 h-20 bg-primary/90 text-white rounded-full flex items-center justify-center pl-2 shadow-2xl drop-shadow-2xl">
                      <Play className="w-10 h-10 fill-current" />
                    </div>
                  </div>
                )}
                
                {/* Anti-Piracy Click-to-Play Catcher with Double Tap to Seek */}
                <div 
                  className={`absolute inset-0 z-20 select-none touch-manipulation cursor-pointer flex ${
                    (activeServer === 'bunny' && activeVideo.platform === 'bunny') || isAdjustingQuality ? 'hidden' : ''
                  }`}
                  onMouseMove={resetControlsTimeout}
                  onMouseEnter={resetControlsTimeout}
                >
                  <div 
                    className="w-1/2 h-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTap('left');
                    }}
                  />
                  <div 
                    className="w-1/2 h-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTap('right');
                    }}
                  />
                </div>

                {/* Double Tap Seek Visual Feedback Overlay */}
                {seekFeedback && (
                  <div 
                    className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center transition-all animate-in zoom-in-75 fade-in duration-150 ${
                      seekFeedback.side === 'left' ? 'left-[12%] sm:left-[18%]' : 'right-[12%] sm:right-[18%]'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center px-4 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-2xl">
                      {seekFeedback.side === 'left' ? (
                        <>
                          <RotateCcw className="w-7 h-7 mb-1 text-primary animate-pulse" />
                          <span className="text-xs font-bold tracking-wider">{seekFeedback.text}</span>
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-7 h-7 mb-1 text-primary animate-pulse" />
                          <span className="text-xs font-bold tracking-wider">{seekFeedback.text}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Email Watermark - Enhanced for Anti-Piracy */}
                <div
                  ref={wmRef}
                  className="absolute z-[60] pointer-events-none select-none drop-shadow-lg"
                  style={{
                    left: `20%`,
                    top: `20%`,
                  }}
                >
                  <div className="flex flex-col items-center opacity-40">
                    <span className="text-sm md:text-base font-black text-white whitespace-nowrap drop-shadow-md"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}>
                      {user.email}
                    </span>
                    {user.phone && (
                      <span className="text-xs md:text-sm font-black text-white whitespace-nowrap drop-shadow-md mt-1"
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}>
                        {user.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Clean Course Title Header (fades in on hover/pause, covering YouTube title; fades out during playback) */}
                <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent px-5 py-3.5 z-30 transition-opacity duration-300 pointer-events-none flex items-center ${activeServer === 'bunny' && activeVideo.platform === 'bunny' ? 'hidden' : ''} ${showControls || !playing ? 'opacity-100' : 'opacity-0'} ${isAdjustingQuality ? '!opacity-0' : ''}`}>
                  <span className="text-sm font-semibold text-white/90 drop-shadow truncate">{activeVideo.title}</span>
                </div>

                {/* Custom Controls Overlay */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black from-45% via-black/80 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-3 z-30 ${activeServer === 'bunny' && activeVideo.platform === 'bunny' ? 'hidden' : ''} ${showControls || !playing ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isAdjustingQuality ? '!opacity-0 !pointer-events-none' : ''}`}
                  onMouseEnter={() => {
                    if (controlsTimeoutRef.current) {
                      clearTimeout(controlsTimeoutRef.current);
                      controlsTimeoutRef.current = null;
                    }
                    setShowControls(true);
                  }}
                  onMouseMove={(e) => {
                    e.stopPropagation();
                    if (controlsTimeoutRef.current) {
                      clearTimeout(controlsTimeoutRef.current);
                      controlsTimeoutRef.current = null;
                    }
                    setShowControls(true);
                  }}
                  onMouseLeave={resetControlsTimeout}
                >
                    
                    {/* Progress Bar */}
                    <div className="w-full flex items-center group/progress h-4 cursor-pointer relative"
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        setPlayed(percentage);
                        const dur = durationRef.current || duration || 0;
                        if (dur > 0) {
                          const targetSec = percentage * dur;
                          playedSecondsRef.current = targetSec;
                          playerRef.current?.seekTo(targetSec, 'seconds');
                        } else {
                          playerRef.current?.seekTo(percentage, 'fraction');
                        }
                      }}
                      onTouchStart={(e) => {
                        if (e.touches && e.touches[0]) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.touches[0].clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, x / rect.width));
                          setPlayed(percentage);
                          const dur = durationRef.current || duration || 0;
                          if (dur > 0) {
                            const targetSec = percentage * dur;
                            playedSecondsRef.current = targetSec;
                            playerRef.current?.seekTo(targetSec, 'seconds');
                          } else {
                            playerRef.current?.seekTo(percentage, 'fraction');
                          }
                        }
                      }}
                    >
                      <div className="absolute w-full h-1 bg-white/20 rounded-full group-hover/progress:h-2 transition-all" />
                      <div className="absolute h-1 bg-primary rounded-full group-hover/progress:h-2 transition-all" style={{ width: `${played * 100}%` }} />
                      <div className="absolute h-3 w-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 shadow-md" style={{ left: `calc(${played * 100}% - 6px)` }} />
                    </div>

                    <div className="flex items-center justify-between text-white mt-1">
                      <div className="flex items-center gap-5">
                        <button onClick={() => setPlaying(!playing)} className="hover:text-primary transition-colors focus:outline-none">
                          {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                        </button>
                        
                        <div className="flex items-center gap-2 group/vol">
                          <button onClick={() => setMuted(!muted)} className="hover:text-primary transition-colors focus:outline-none">
                            {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                          <input 
                            type="range" min={0} max={1} step="any"
                            value={muted ? 0 : volume}
                            onChange={(e) => {
                              setVolume(parseFloat(e.target.value));
                              setMuted(parseFloat(e.target.value) === 0);
                            }}
                            className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 transition-all duration-300 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                          />
                        </div>

                        <span className="text-sm font-medium tracking-wider opacity-80">
                          {formatTime(played * duration)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Quality Control */}
                        {activeVideo && activeVideo.type !== 'resource' && (
                          <div className="relative flex items-center">
                            <button 
                              className="text-sm font-bold hover:text-primary transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeServer === 'youtube' || activeVideo.platform === 'youtube') {
                                  // DIRECT YouTube trigger: Auto-pauses and shows YouTube gear/controls directly
                                  const internal = playerRef.current?.getInternalPlayer();
                                  if (internal && typeof internal.getPlayerState === 'function') {
                                    const state = internal.getPlayerState();
                                    if (state === -1 || state === 5) {
                                      try {
                                        internal.playVideo();
                                        setTimeout(() => {
                                          try { internal.pauseVideo(); } catch (err) {}
                                        }, 250);
                                      } catch (err) {}
                                    }
                                  }
                                  setPlaying(false);
                                  setIsAdjustingQuality(true);
                                  setShowQualityMenu(false);
                                  setShowSpeedMenu(false);
                                  if (qualityAdjustTimerRef.current) clearTimeout(qualityAdjustTimerRef.current);
                                  qualityAdjustTimerRef.current = setTimeout(() => {
                                    setIsAdjustingQuality(false);
                                  }, 60000);
                                } else {
                                  // For Bunny Stream / HLS: toggle native quality menu
                                  setShowQualityMenu(!showQualityMenu);
                                  setShowSpeedMenu(false);
                                }
                              }}
                            >
                              {quality} <Settings className="w-4 h-4 ml-1" />
                            </button>

                            {/* Dropdown Menu for Bunny / HLS ONLY */}
                            {showQualityMenu && activeServer !== 'youtube' && activeVideo.platform !== 'youtube' && (
                              <div className="absolute bottom-full right-0 mb-3 flex flex-col z-50">
                                <div className="bg-zinc-950/95 rounded-lg border border-white/20 overflow-hidden shadow-2xl pb-1 w-36 text-white backdrop-blur-md">
                                  <div className="flex justify-between items-center border-b border-white/10 mb-1 px-3 py-1.5">
                                    <span className="text-xs text-zinc-400 font-semibold">Quality</span>
                                    <X className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowQualityMenu(false); }} />
                                  </div>
                                  {availableQualities.filter(q => q === 'Auto' || ['720p', '480p', '360p'].includes(q)).map(q => (
                                    <button 
                                      key={q} 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setQuality(q); 
                                        setShowQualityMenu(false); 
                                        try {
                                          const hls = playerRef.current?.getInternalPlayer('hls');
                                          if (hls && hls.levels && hls.levels.length > 0) {
                                            if (q === 'Auto') {
                                              if (!playing || (hls.media && hls.media.paused)) {
                                                hls.currentLevel = -1;
                                              }
                                              hls.nextLevel = -1;
                                              hls.loadLevel = -1;
                                            } else {
                                              const height = parseInt(q);
                                              let levelIndex = hls.levels.findIndex((l: any) => l.height === height);
                                              if (levelIndex === -1) {
                                                let minDiff = Infinity;
                                                hls.levels.forEach((l: any, idx: number) => {
                                                  if (l.height) {
                                                    const diff = Math.abs(l.height - height);
                                                    if (diff < minDiff) {
                                                      minDiff = diff;
                                                      levelIndex = idx;
                                                    }
                                                  }
                                                });
                                              }
                                              if (levelIndex !== -1) {
                                                // Seamless transition: keep playing old quality buffer while downloading new level
                                                if (!playing || (hls.media && hls.media.paused)) {
                                                  hls.currentLevel = levelIndex;
                                                }
                                                hls.nextLevel = levelIndex;
                                                hls.loadLevel = levelIndex;
                                              }
                                            }
                                          }
                                        } catch (err) {}
                                        resetControlsTimeout();
                                      }}
                                      className={`w-full px-3 py-1.5 text-xs text-left hover:bg-white/15 transition-colors ${quality === q ? 'text-primary font-bold bg-primary/20' : 'text-zinc-200'}`}
                                    >
                                      {q}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Speed Control */}
                        <div className="relative flex items-center">
                          <button 
                            className="text-sm font-bold hover:text-primary transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSpeedMenu(!showSpeedMenu);
                              setShowQualityMenu(false);
                            }}
                          >
                            {playbackRate}x <Settings className="w-4 h-4 ml-1" />
                          </button>
                          {showSpeedMenu && (
                            <div className="absolute bottom-full right-0 mb-3 flex flex-col z-50">
                              <div className="bg-zinc-950/95 rounded-lg border border-white/20 overflow-hidden shadow-2xl pb-1 w-28 text-white backdrop-blur-md">
                                <div className="flex justify-between items-center border-b border-white/10 mb-1 px-3 py-1.5">
                                  <span className="text-xs text-zinc-400 font-semibold">Speed</span>
                                  <X className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(false); }} />
                                </div>
                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                  <button 
                                    key={rate} 
                                    onClick={(e) => { e.stopPropagation(); setPlaybackRate(rate); setShowSpeedMenu(false); }}
                                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-white/15 transition-colors ${playbackRate === rate ? 'text-primary font-bold bg-primary/20' : 'text-zinc-200'}`}
                                  >
                                    {rate === 1 ? 'Normal' : `${rate}x`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={async () => {
                            try {
                              if (!document.fullscreenElement) {
                                if (playerContainerRef.current) {
                                  await playerContainerRef.current.requestFullscreen();
                                  if (screen.orientation && (screen.orientation as any).lock) {
                                    try {
                                      await (screen.orientation as any).lock('landscape');
                                    } catch (e) {
                                      console.log("Orientation lock failed/unsupported", e);
                                    }
                                  }
                                }
                              } else {
                                await document.exitFullscreen();
                                if (screen.orientation && (screen.orientation as any).unlock) {
                                  (screen.orientation as any).unlock();
                                }
                              }
                            } catch (err) {
                              console.error("Fullscreen toggle failed", err);
                            } finally {
                              resetControlsTimeout();
                            }
                          }} 
                          className="hover:text-primary transition-colors opacity-80 hover:opacity-100 focus:outline-none ml-2"
                        >
                          <Maximize className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-zinc-500 flex flex-col items-center gap-2">
                <PlayCircle className="w-12 h-12" />
                <p>Select an item from the syllabus to start.</p>
              </div>
            )
          ) : (
            <>
              {/* Blurred Not-Logged-In View */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-md text-zinc-200 z-20">
                <Lock className="w-16 h-16 mb-4 text-primary" />
                <h3 className="text-2xl font-bold mb-2">Login Required</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-sm">
                  You can explore the course syllabus, but watching lessons requires an active student account.
                </p>
                <Link href="/login" className={buttonVariants({ variant: "default" })}>
                  Login to Watch
                </Link>
              </div>
            </>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{activeVideo ? activeVideo.title : course.name}</h1>
              <p className="text-muted-foreground mt-1">
                {activeVideo ? (activeVideo.type === 'resource' ? "Course Resource / PDF document." : "Currently playing from the course syllabus.") : "Course overview."}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">

              {activeVideo && activeVideo.type !== 'resource' && (
                <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full animate-pulse">
                  <Eye className="w-4 h-4" />
                  {viewersCount} student{viewersCount !== 1 ? 's' : ''} watching right now
                </div>
              )}
              {activeVideo && activeVideo.type !== 'resource' && (() => {
                const hasBunnyOption = isBunnyPermitted && (activeVideo.videoId || activeVideo.platform === 'bunny');
                const hasR2Option = isR2Permitted && (activeVideo.r2Url || activeVideo.platform === 'r2');
                const hasYoutubeOption = isYoutubePermitted && (activeVideo.originalYoutubeUrl || activeVideo.platform === 'youtube');
                const count = (hasBunnyOption ? 1 : 0) + (hasR2Option ? 1 : 0) + (hasYoutubeOption ? 1 : 0);
                if (count <= 1) return null;

                return (
                  <div className="flex flex-wrap items-center gap-1.5 bg-secondary/20 p-1 rounded-lg border border-secondary/30 text-xs">
                    <span className="text-muted-foreground px-1 font-medium">Source:</span>
                    {hasBunnyOption && (
                      <button
                        onClick={() => setActiveServer('bunny')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          activeServer === 'bunny'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Cloud (Bunny)
                      </button>
                    )}
                    {hasR2Option && (
                      <button
                        onClick={() => setActiveServer('r2')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          activeServer === 'r2'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Cloudflare R2
                      </button>
                    )}
                    {hasYoutubeOption && (
                      <button
                        onClick={() => setActiveServer('youtube')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          activeServer === 'youtube'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        YouTube
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        <Separator className="bg-secondary/30" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center font-bold text-primary">
                {course?.teacherName ? course.teacherName.substring(0, 2).toUpperCase() : 'BA'}
              </div>
            </div>
            <div>
              <p className="font-medium">{course?.teacherName || "Brilliant Academy Instructor"}</p>
              <p className="text-sm text-muted-foreground">{course?.teacherSubject || "Senior Physics Educator"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/10 p-2 rounded border border-secondary/20">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Protected by Brilliant Academy DRM
          </div>
        </div>

        {/* ASK A DOUBT TO TEACHER SECTION */}
        {user && user.role === 'student' && (
          <Card className="border-secondary/40 bg-secondary/5 mt-3 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-secondary/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm sm:text-base">
                  Ask a Doubt to {course?.teacherName || "Teacher"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Direct doubt assistance for this course
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {doubtSuccess ? (
                <div className="bg-green-500/10 border border-green-500/30 text-green-500 p-3 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Your doubt has been submitted directly to {course?.teacherName || "your teacher"}!
                </div>
              ) : (
                <>
                  <Textarea 
                    placeholder={`Type your question or doubt about ${activeVideo ? `"${activeVideo.title}"` : course.name}...`}
                    value={doubtText}
                    onChange={(e) => setDoubtText(e.target.value)}
                    rows={2}
                    className="bg-background text-sm resize-none border-secondary/40"
                  />
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {activeVideo ? `Referencing: ${activeVideo.title}` : `Course: ${course.name}`}
                    </p>
                    <Button 
                      size="sm" 
                      onClick={handleSendCourseDoubt}
                      disabled={isDoubtSending || !doubtText.trim()}
                      className="bg-primary text-black font-bold hover:bg-primary/90 flex items-center gap-1.5 self-end sm:self-auto"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isDoubtSending ? "Sending..." : "Send Doubt"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Course Sidebar */}
      <div className="space-y-6">
        <Card className="border-secondary/50">
          <CardHeader className="pb-3">
            {(() => {
              const courseVideos = videos.filter(v => v.type !== 'resource');
              const courseProgress = courseVideos.length > 0
                ? Math.round(courseVideos.reduce((sum, v) => sum + (localVideoProgress[v.id] || user?.videoProgress?.[v.id] || 0), 0) / courseVideos.length)
                : 0;

              return (
                <div>
                  <div className="flex items-center justify-between">
                    <CardTitle>Course Syllabus</CardTitle>
                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => document.getElementById('syllabus-scroll-area')?.querySelector('[data-slot="scroll-area-viewport"]')?.scrollBy({ top: -180, behavior: 'smooth' })}
                        className="p-1 rounded bg-secondary/15 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer border border-secondary/20"
                        title="Scroll syllabus up"
                        aria-label="Scroll syllabus up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => document.getElementById('syllabus-scroll-area')?.querySelector('[data-slot="scroll-area-viewport"]')?.scrollBy({ top: 180, behavior: 'smooth' })}
                        className="p-1 rounded bg-secondary/15 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer border border-secondary/20"
                        title="Scroll syllabus down"
                        aria-label="Scroll syllabus down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-primary ml-1">{courseProgress}%</span>
                    </div>
                  </div>
                  {/* Main Course Progress Bar (matches student screenshot) */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-full bg-secondary/30 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${courseProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground shrink-0">{courseProgress}%</span>
                  </div>
                </div>
              );
            })()}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea id="syllabus-scroll-area" data-lenis-prevent="true" className="h-[520px]"> <div className="p-2 flex flex-col gap-2"> {visibleFolders.length === 0 ? (
                  <p className="p-4 text-muted-foreground text-sm text-center">No folders available for this course yet.</p>
                ) : (
                  sidebarFolders.map((folder) => {
                    const isExpanded = activeFolderId === folder.id;
                    const folderVideos = videos.filter(v => v.folderId === folder.id);
                    const folderOnlyVideos = folderVideos.filter(v => v.type !== 'resource');
                    const folderProgress = folderOnlyVideos.length > 0
                      ? Math.round(folderOnlyVideos.reduce((sum, v) => sum + (localVideoProgress[v.id] || user?.videoProgress?.[v.id] || 0), 0) / folderOnlyVideos.length)
                      : 0;
                    
                    const folderExpiration = user?.folderAccess?.[folder.id];
                    const hasSpecificFolderAccess = (folderExpiration && folderExpiration > Date.now()) || user?.role === 'admin' || user?.role === 'teacher' || legacyCourseAccess;
                    const daysLeft = folderExpiration && folderExpiration > Date.now() ? Math.ceil((folderExpiration - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                    
                    return (
                      <div key={folder.id} className={`border border-secondary/30 rounded-lg overflow-hidden bg-background ${!hasSpecificFolderAccess ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                        <div
                          role="button"
                          tabIndex={hasSpecificFolderAccess ? 0 : -1}
                          className="w-full flex items-center justify-between p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors text-left cursor-pointer"
                          onClick={() => {
                            if (hasSpecificFolderAccess) {
                              setActiveFolderId(isExpanded ? null : folder.id);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (hasSpecificFolderAccess && (e.key === 'Enter' || e.key === ' ')) {
                              setActiveFolderId(isExpanded ? null : folder.id);
                            }
                          }}
                        >
                          <div className="flex flex-col gap-1 w-full mr-2">
                            <div className="flex items-center gap-2 font-bold text-sm">
                              {hasSpecificFolderAccess ? <Folder className="w-4 h-4 text-primary shrink-0" /> : <Lock className="w-4 h-4 text-red-500 shrink-0" />}
                              <span className="truncate">{folder.name}</span>
                              {folder.price ? <span className="ml-2 text-xs bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-mono shrink-0">Rs. {folder.price}</span> : null}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                              {videos.filter(v => v.folderId === folder.id).length} Videos
                            </p>
                            {hasSpecificFolderAccess && user?.role !== 'admin' && !legacyCourseAccess && folderExpiration ? (
                              <p className="text-xs text-green-600 font-bold">{daysLeft} days remaining</p>
                            ) : null}

                            {/* Folder Progress Bar + Percentage (matches student screenshot) */}
                            {hasSpecificFolderAccess && (
                              <div className="flex items-center gap-2 mt-1.5 w-full max-w-[200px]">
                                <div className="w-full bg-secondary/40 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-primary h-full rounded-full transition-all duration-300"
                                    style={{ width: `${folderProgress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground shrink-0">{folderProgress}%</span>
                              </div>
                            )}

                            {!hasSpecificFolderAccess && (
                                <div className="mt-1">
                                  <p className="text-xs text-red-500 font-bold mb-2">Locked - Requires Access</p>
                                  {folder.price && user?.role === 'student' && (
                                    <Button 
                                      size="sm" 
                                      className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCheckoutFolder(folder);
                                        setPaymentSuccess(false);
                                        setReceiptFile(null);
                                      }}
                                    >
                                      Buy Now - Rs. {folder.price}
                                    </Button>
                                  )}
                                </div>
                            )}
                          </div>
                          {hasSpecificFolderAccess && (
                            isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
                          )}
                        </div>
                        
                        {isExpanded && hasSpecificFolderAccess && (
                          <div className="flex flex-col border-t border-secondary/30">
                            {folderVideos.length === 0 ? (
                              <p className="p-3 text-xs text-muted-foreground italic">No items in this folder.</p>
                            ) : (
                              <>
                                {(() => {
                                  const onlyVideos = folderVideos.filter(v => v.type !== 'resource');
                                  const onlyPdfs = folderVideos.filter(v => v.type === 'resource');
                                  
                                  const activeTab = folderTabs[folder.id] || 'videos';
                                  
                                  return (
                                    <>
                                      <div className="flex bg-secondary/10 p-1 border-b border-secondary/30">
                                        <button 
                                          className={`flex-1 text-xs font-bold py-1.5 rounded-sm transition-colors ${activeTab === 'videos' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                          onClick={() => setFolderTabs(prev => ({ ...prev, [folder.id]: 'videos' }))}
                                        >
                                          Videos ({onlyVideos.length})
                                        </button>
                                        <button 
                                          className={`flex-1 text-xs font-bold py-1.5 rounded-sm transition-colors ${activeTab === 'resources' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                          onClick={() => setFolderTabs(prev => ({ ...prev, [folder.id]: 'resources' }))}
                                        >
                                          Resources & PDFs ({onlyPdfs.length})
                                        </button>
                                      </div>

                                      {activeTab === 'videos' && onlyVideos.length > 0 && (
                                        <div className="flex flex-col">
                                          {onlyVideos.map((video) => {
                                            const isPlaying = activeVideo?.id === video.id;
                                            const vPct = localVideoProgress[video.id] || user?.videoProgress?.[video.id] || 0;
                                            return (
                                              <button
                                                key={video.id}
                                                onClick={() => { if (user) { setActiveVideo(video); setPlaying(false); } }}
                                                disabled={!user}
                                                className={`flex items-center justify-between p-3 text-sm text-left transition-colors border-b border-secondary/10 last:border-0
                                                  ${isPlaying ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/10'}
                                                  ${!user ? 'opacity-60 cursor-not-allowed' : ''}
                                                `}
                                              >
                                                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                                  {!user ? (
                                                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                                                  ) : (
                                                    <PlayCircle className={`w-4 h-4 shrink-0 ${isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
                                                  )}
                                                  <span className={`truncate ${isPlaying ? 'font-bold text-primary' : ''}`}>
                                                    {video.title}
                                                  </span>
                                                </div>
                                                <span className={`text-[11px] font-bold shrink-0 px-1.5 py-0.5 rounded ${
                                                  vPct >= 100
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : vPct > 0
                                                      ? 'bg-primary/10 text-primary'
                                                      : 'text-muted-foreground/50'
                                                }`}>
                                                  {vPct}%
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                      
                                      {activeTab === 'videos' && onlyVideos.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground">No videos found in this folder.</div>
                                      )}

                                      {activeTab === 'resources' && onlyPdfs.length > 0 && (
                                        <div className="flex flex-col">
                                          {onlyPdfs.map((video) => {
                                            const isPlaying = activeVideo?.id === video.id;
                                            return (
                                              <button
                                                key={video.id}
                                                onClick={() => { if (user) { setActiveVideo(video); setPlaying(false); } }}
                                                disabled={!user}
                                                className={`flex items-center gap-3 p-3 text-sm text-left transition-colors border-b border-secondary/10 last:border-0
                                                  ${isPlaying ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/10'}
                                                  ${!user ? 'opacity-60 cursor-not-allowed' : ''}
                                                `}
                                              >
                                                {!user ? (
                                                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                                                ) : (
                                                  <FileText className={`w-4 h-4 shrink-0 ${isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
                                                )}
                                                <span className={`truncate ${isPlaying ? 'font-bold text-primary' : ''}`}>
                                                  {video.title}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {activeTab === 'resources' && onlyPdfs.length === 0 && (
                                        <div className="p-4 text-center text-xs text-muted-foreground">No resources or PDFs found in this folder.</div>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Past Live Classes Folder */}
                {pastLiveClasses.length > 0 && (
                  <div className={`border border-secondary/30 rounded-lg overflow-hidden bg-background mt-4`}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="w-full flex items-center justify-between p-3 bg-red-900/20 hover:bg-red-900/30 transition-colors text-left cursor-pointer"
                      onClick={() => setActiveFolderId(activeFolderId === 'past-live' ? null : 'past-live')}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-bold text-sm text-red-500">
                          <Video className="w-4 h-4" />
                          Past Live Classes
                        </div>
                      </div>
                      {activeFolderId === 'past-live' ? <ChevronDown className="w-4 h-4 text-red-500" /> : <ChevronRight className="w-4 h-4 text-red-500" />}
                    </div>
                    
                    {activeFolderId === 'past-live' && (
                      <div className="flex flex-col border-t border-secondary/30">
                        {pastLiveClasses.map((cls) => {
                          const isPlaying = activeVideo?.id === cls.id;
                          return (
                            <button
                              key={cls.id}
                              onClick={() => { 
                                if (user) { 
                                  // Map live class properties to look like a video object
                                  setActiveVideo({
                                    id: cls.id,
                                    title: cls.title,
                                    url: cls.link, // ReactPlayer accepts youtube links naturally
                                    type: 'video' // Zoom should now be 'video' so it loads inline in iframe
                                  }); 
                                  setPlaying(false); 
                                } 
                              }}
                              disabled={!user}
                              className={`flex items-center gap-3 p-3 text-sm text-left transition-colors border-b border-secondary/10 last:border-0
                                ${isPlaying ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/10'}
                              `}
                            >
                              <PlayCircle className={`w-4 h-4 shrink-0 ${isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className={`truncate ${isPlaying ? 'font-bold text-primary' : ''}`}>
                                {cls.title} <span className="text-xs text-muted-foreground ml-2">({new Date(cls.scheduledFor).toLocaleDateString()})</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div></ScrollArea></CardContent></Card> {user ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Ready to test your knowledge?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Take the chapter exam to evaluate your understanding.
              </p>
              <Link href={`/exams`} className={buttonVariants({ variant: "default", className: "w-full" })}>
                Go to Exams
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-secondary/30 bg-secondary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">
                Login to access course materials and exams.
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
    )}
    </div> {/* Close course content wrapper */}

      {/* Checkout View (Inline instead of Modal to push footer down) */}
      {checkoutFolder && (
        <div className="container mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-md">
            <Card className="bg-background border-primary/20 shadow-2xl overflow-hidden flex flex-col">
              <CardHeader className="bg-primary/5 border-b border-primary/10 flex-none pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Checkout</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Purchasing access to folder</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCheckoutFolder(null)} className="h-8 w-8 rounded-full">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-secondary/20 rounded-lg border border-secondary/30 flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Folder className="w-4 h-4 text-primary" />
                    {checkoutFolder.name}
                  </div>
                  <span className="text-sm bg-green-500/20 text-green-500 px-2 py-1 rounded font-mono font-bold">
                    Rs. {checkoutFolder.price}
                  </span>
                </div>
              </CardHeader>
              
              <div className="">
                <CardContent className="pt-6 pb-6">
                {paymentSuccess ? (
                  <div className="text-center py-8 space-y-4 animate-in zoom-in fade-in duration-300">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-green-500">Request Sent Successfully!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your access request is pending admin approval. You will be notified once it is approved.
                    </p>
                    <Button className="w-full mt-4" onClick={() => {
                      setCheckoutFolder(null);
                      setPaymentSuccess(false);
                    }}>Close</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(!paymentConfig || (paymentConfig.bankEnabled && paymentConfig.cardEnabled)) && (
                      <div className="flex gap-2 p-1 bg-secondary/20 rounded-lg">
                        <button 
                          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'bank' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => setPaymentMethod('bank')}
                        >
                          Bank Transfer
                        </button>
                        <button 
                          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'card' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => setPaymentMethod('card')}
                        >
                          Card Payment
                        </button>
                      </div>
                    )}

                    {(!paymentConfig && paymentMethod === 'bank') || (paymentConfig && paymentMethod === 'bank' && paymentConfig.bankEnabled) ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-4">
                          <p className="text-sm font-medium text-blue-400">Please transfer Rs. {checkoutFolder.price} to {paymentConfig?.bank2Enabled ? 'one of the following accounts:' : 'the following account:'}</p>
                          
                          <div className="space-y-3">
                            <div className="font-mono text-sm space-y-1 bg-background/50 p-3 rounded border border-blue-500/10 relative overflow-hidden">
                              <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500/20 text-blue-500 text-[10px] font-bold rounded-bl">Option 1</div>
                              <div className="flex justify-between mt-1"><span className="text-muted-foreground">Bank:</span> <span className="font-bold">{paymentConfig?.bankName || 'Bank of Ceylon'}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Branch:</span> <span className="font-bold">{paymentConfig?.branchName || 'Rakwana Branch'}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Account No:</span> <span className="font-bold text-primary">{paymentConfig?.accountNo || '0008766934'}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-bold">{paymentConfig?.accountName || 'MRM arshath'}</span></div>
                            </div>
                            
                            {paymentConfig?.bank2Enabled && (
                              <div className="font-mono text-sm space-y-1 bg-background/50 p-3 rounded border border-blue-500/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500/20 text-blue-500 text-[10px] font-bold rounded-bl">Option 2</div>
                                <div className="flex justify-between mt-1"><span className="text-muted-foreground">Bank:</span> <span className="font-bold">{paymentConfig?.bank2Name}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Branch:</span> <span className="font-bold">{paymentConfig?.bank2BranchName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Account No:</span> <span className="font-bold text-primary">{paymentConfig?.bank2AccountNo}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-bold">{paymentConfig?.bank2AccountName}</span></div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pb-4">
                          <Label>Upload Payment Receipt</Label>
                          <div className="border-2 border-dashed border-secondary rounded-lg p-6 text-center hover:bg-secondary/10 transition-colors cursor-pointer relative">
                            {receiptFile ? (
                              <div className="space-y-2">
                                <FileText className="w-8 h-8 text-primary mx-auto" />
                                <p className="text-sm font-medium text-primary">{receiptFile.name}</p>
                                <p className="text-xs text-muted-foreground">Click to change file</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                  <ChevronDown className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium">Click to upload deposit slip</p>
                                <p className="text-xs text-muted-foreground">JPEG, PNG, or PDF</p>
                              </div>
                            )}
                            <input 
                              type="file" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setReceiptFile(e.target.files[0]);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (paymentConfig && paymentMethod === 'qr' && paymentConfig.qrEnabled) ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-4">
                          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-4 text-center">
                            <p className="text-sm font-medium text-green-400">Please scan the Lanka QR code to transfer Rs. {checkoutFolder.price}</p>
                            
                            {paymentConfig.qrImageUrl ? (
                              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-xl border border-green-500/30 shadow-lg relative overflow-hidden group flex items-center justify-center">
                                <img src={paymentConfig.qrImageUrl} alt="Lanka QR" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500 py-8">QR Code not uploaded by admin yet.</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Upload Payment Receipt</Label>
                            <div className="border-2 border-dashed border-secondary rounded-lg p-6 text-center hover:bg-secondary/10 transition-colors cursor-pointer relative">
                              {receiptFile ? (
                                <div className="space-y-2">
                                  <FileText className="w-8 h-8 text-primary mx-auto" />
                                  <p className="text-sm font-medium text-primary">{receiptFile.name}</p>
                                  <p className="text-xs text-muted-foreground">Click to change file</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                    <ChevronDown className="w-6 h-6" />
                                  </div>
                                  <p className="text-sm font-medium">Click to upload deposit slip</p>
                                  <p className="text-xs text-muted-foreground">JPEG, PNG, or PDF</p>
                                </div>
                              )}
                              <input 
                                type="file" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setReceiptFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (paymentConfig?.cardEnabled !== false) ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-4 text-center py-8">
                          <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-lg text-foreground">Secure Online Checkout</h3>
                          <p className="text-sm text-muted-foreground">You will be redirected to the secure payments.lk gateway to complete your transaction.</p>
                        </div>
                      ) : (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-red-400 font-medium">
                        No payment methods are currently available. Please contact the administrator.
                      </div>
                    )}

                    <Button 
                      className="w-full h-12 text-lg font-bold" 
                      onClick={handlePaymentSubmit}
                      disabled={
                        isSubmittingPayment || 
                        (paymentMethod === 'bank' && !receiptFile) || 
                        (paymentConfig && !paymentConfig.bankEnabled && !paymentConfig.cardEnabled)
                      }
                    >
                      {isSubmittingPayment ? "Processing..." : paymentMethod === 'bank' ? "Submit Receipt" : `Pay Rs. ${checkoutFolder.price}`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    )}
  </>
  );
}



















