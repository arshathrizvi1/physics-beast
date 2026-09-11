"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayCircle, Lock, Eye, ShieldAlert, Folder, ChevronDown, ChevronUp, ChevronRight, FileText, Play, Pause, Volume2, VolumeX, Maximize, Settings, X, Download, Video, CheckCircle2, HelpCircle, Send, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, use, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, increment, onSnapshot, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { calculateXpLevel, XP_PER_STUDY_MINUTE } from "@/lib/xp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from 'next/dynamic';
const PdfViewer = dynamic(() => import("@/components/ui/pdf-viewer").then(mod => mod.PdfViewer), { ssr: false });
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const getDailymotionId = (url: string) => {
  if (!url) return null;
  const match = url.trim().match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  return match ? match[1] : null;
};

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, updateVideoProgress } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [courseNotFound, setCourseNotFound] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pastLiveClasses, setPastLiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
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
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'card'>('bank');
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
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wmRef = useRef<HTMLDivElement>(null);
  const readyFiredRef = useRef<Set<string>>(new Set());
  const syllabusScrollRef = useRef<HTMLDivElement>(null);
  const [bunnyEmbedUrl, setBunnyEmbedUrl] = useState<string>('');

  // Fetch signed embed URL for Bunny videos (supports Token Authentication if enabled)
  useEffect(() => {
    if (activeVideo?.platform === 'bunny' && activeVideo?.url) {
      const match = activeVideo.url.match(/embed\/(\d+)\/([a-zA-Z0-9-]+)/);
      const vid = match ? match[2] : activeVideo.url;
      const lib = match ? match[1] : '748058';

      fetch(`/api/bunny/sign?videoId=${encodeURIComponent(vid)}&libraryId=${encodeURIComponent(lib)}`)
        .then(res => res.json())
        .then(data => {
          if (data.url) setBunnyEmbedUrl(data.url);
          else setBunnyEmbedUrl(activeVideo.url);
        })
        .catch(() => setBunnyEmbedUrl(activeVideo.url));
    } else {
      setBunnyEmbedUrl('');
    }
  }, [activeVideo?.id, activeVideo?.url, activeVideo?.platform]);

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
        setLocalVideoProgress(prev => ({ ...JSON.parse(raw), ...prev }));
      }
    } catch {}
  }, [user?.uid]);

  // Record progress callback with throttling
  const recordProgress = useCallback((videoId: string, percent: number) => {
    if (!videoId) return;
    const clean = Math.min(100, Math.max(0, Math.round(percent)));
    // If student watched 90% or more, count as 100% completed
    const finalPct = clean >= 90 ? 100 : clean;

    setLocalVideoProgress(prev => {
      const current = prev[videoId] || 0;
      if (finalPct <= current) return prev;
      return { ...prev, [videoId]: finalPct };
    });

    const prevSaved = lastSavedProgressRef.current[videoId] || 0;
    if (finalPct - prevSaved >= 3 || finalPct === 100) {
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
          if (quality === 'Auto') {
            hls.nextLevel = -1;
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
              // Use nextLevel to prevent video freeze and buffer flushing
              hls.nextLevel = levelIndex;
            }
          }
          return true; // Applied successfully
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

  // DVD-style bouncing watermark — covers full player
  useEffect(() => {
    let x = 10 + Math.random() * 60;
    let y = 10 + Math.random() * 60;
    // Randomize direction per axis so it doesn't go diagonally forever
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

    // Anti-IDM / Downloader Extension DOM removal
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node: any) => {
          if (node.nodeType === 1) { // Element node
            const id = (node.id || '').toLowerCase();
            const className = (typeof node.className === 'string' ? node.className : '').toLowerCase();
            if (id.includes('idm') || className.includes('idm') || id.includes('fdm') || id.includes('download-panel')) {
              try { node.remove(); } catch (e) {}
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    // Unlock orientation when exiting fullscreen (e.g. via hardware back button)
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      if (unsubCourse) unsubCourse();
      if (unsubFolders) unsubFolders();
      if (unsubVideos) unsubVideos();
      if (unsubLive) unsubLive();
      if (unsubConfig) unsubConfig();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      observer.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (!user || folders.length === 0 || activeFolderId) return;
    const accessibleFolders = folders.filter((f: any) => {
      const exp = user.folderAccess?.[f.id];
      return user.role === 'admin' || user.role === 'teacher' || (user.accessibleCourses && user.accessibleCourses.includes(id)) || (exp && exp > Date.now());
    });

    if (accessibleFolders.length > 0) {
      const firstFolder = accessibleFolders[0];
      setActiveFolderId(firstFolder.id);
      if (videos.length > 0) {
        const firstFolderVideos = videos.filter((v: any) => v.folderId === firstFolder.id);
        if (firstFolderVideos.length > 0) {
          setActiveVideo(firstFolderVideos[0]);
        }
      }
    }
  }, [folders, videos, user, activeFolderId, id]);

  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  const activeVideoRef = useRef(activeVideo);
  useEffect(() => { activeVideoRef.current = activeVideo; }, [activeVideo]);
  const lastStudyDateRef = useRef(user?.lastStudyDate || new Date().toISOString().split('T')[0]);

  // Heartbeat & Presence Logic (Tracks Real "Students Watching" and Updates "Total Study Time")
  useEffect(() => {
    if (!user?.uid) return;
    lastStudyDateRef.current = user.lastStudyDate || new Date().toISOString().split('T')[0];

    // Ping every 60 seconds of wall-clock time, but only increment if video is currently playing
    const heartbeat = setInterval(() => {
      const currentVideo = activeVideoRef.current;
      if (!currentVideo) return;
      
      const presenceRef = doc(db, 'presence', `${currentVideo.id}_${user.uid}`);
      setDoc(presenceRef, { videoId: currentVideo.id, userId: user.uid, lastActive: Date.now() }, { merge: true });
      
      if (playingRef.current || currentVideo.type === 'resource') {
        const userRef = doc(db, 'users', user.uid);
        const newXp = (user.totalXp || 0) + XP_PER_STUDY_MINUTE;
        const nowStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        const isSameDay = lastStudyDateRef.current === nowStr;
        if (!isSameDay) {
          lastStudyDateRef.current = nowStr;
        }
        
        updateDoc(userRef, {
          totalStudyTimeMins: increment(1),
          todayStudyTimeMins: isSameDay ? increment(1) : 1,
          [`studyHistory.${nowStr}`]: increment(1),
          totalXp: increment(XP_PER_STUDY_MINUTE),
          xpLevel: calculateXpLevel(newXp),
          lastStudyPing: Date.now(),
          lastStudyDate: nowStr
        }).catch(e => console.error("Failed to update study time and XP", e));
      }
    }, 60000);

    return () => {
      clearInterval(heartbeat);
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

  const legacyCourseAccess = user?.accessibleCourses && user.accessibleCourses.includes(id);
  const courseFolders = folders;
  const hasFolderAccess = courseFolders.some(f => {
    const exp = user?.folderAccess?.[f.id];
    return exp && exp > Date.now();
  });
  const hasAccess = user?.role === 'admin' || user?.role === 'teacher' || legacyCourseAccess || hasFolderAccess;

  const handlePaymentSubmit = async () => {
    if (!user || !checkoutFolder) return;
    
    if (paymentMethod === 'bank' && !receiptFile) {
      alert("Please upload your bank transfer receipt.");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      let receiptBase64 = "";

      if (paymentMethod === 'bank' && receiptFile) {
        const isPdf = receiptFile.type === 'application/pdf' || receiptFile.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          // Check file size (Firestore document limit is 1MB, so max 800KB for PDF)
          if (receiptFile.size > 800 * 1024) {
            alert("❌ PDF file is too large (max 800KB). Please upload a smaller PDF or a screenshot image of your payment slip.");
            setIsSubmittingPayment(false);
            return;
          }

          try {
            receiptBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Failed to read PDF file"));
              reader.readAsDataURL(receiptFile);
            });
          } catch (pdfErr: any) {
            alert(`❌ Failed to process PDF: ${pdfErr.message}`);
            setIsSubmittingPayment(false);
            return;
          }
        } else {
          // Compress image in-browser and convert to base64 (no Firebase Storage needed)
          try {
            receiptBase64 = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              const objectUrl = URL.createObjectURL(receiptFile);
              img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                // Scale down to max 900px wide while keeping aspect ratio
                const MAX = 900;
                let { width, height } = img;
                if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                // Compress to JPEG at 70% quality → typically 50–150KB
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(base64);
              };
              img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
              img.src = objectUrl;
            });
          } catch (compressError: any) {
            alert(`❌ Failed to process receipt image: ${compressError.message}`);
            setIsSubmittingPayment(false);
            return;
          }
        }
      }

      // Save payment record to Firestore (receipt stored as compressed base64)
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
          receiptUrl: "",         // kept for schema compatibility
          receiptBase64,          // compressed image stored directly in Firestore
          status: paymentMethod === 'card' ? 'approved' : 'pending',
          createdAt: Date.now()
        });

        // Notify Admin of payment / pending payment receipt
        const studentLabel = user.name ? `${user.name}${user.studentId ? ` (${user.studentId})` : ''}` : (user.studentId || user.email || 'A student');
        const paymentTypeLabel = paymentMethod === 'bank' ? 'Bank Transfer' : paymentMethod.toUpperCase();
        
        addDoc(collection(db, "notifications"), {
          target: "admin",
          title: paymentMethod === 'bank' ? "New Pending Payment Receipt 💳" : "Payment Received (Card) 💳",
          message: `${studentLabel} submitted a ${paymentTypeLabel} payment of Rs. ${checkoutFolder.price || 0} for "${checkoutFolder.name}". Pending payment verification.`,
          link: "/admin#payments",
          timestamp: Date.now(),
          type: "payment",
          readBy: []
        }).catch(err => console.error("Failed to notify admin of payment:", err));
      } catch (writeError: any) {
        if (writeError.code === 'permission-denied') {
          alert("❌ Permission Denied: Your Firestore Rules are blocking payment submissions.\n\nPlease update Firestore Rules in Firebase Console to allow authenticated writes.");
          setIsSubmittingPayment(false);
          return;
        }
        throw writeError;
      }

      if (paymentMethod === 'card') {
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
          title: `New Student Doubt 🤔 - ${course.name}`,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      {/* Video Player Area */}
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
              ) : !activeVideo.isReady || activeVideo.processingStatus === 'downloading' ? (
                <div className="w-full h-full absolute inset-0 z-10 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Video is Processing</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    This video is currently being downloaded or optimized by the cloud server. It will be available to watch shortly!
                  </p>
                </div>
              ) : activeVideo.transcodeStatus === 'processing' ? (
                <div className="w-full h-full absolute inset-0 z-10 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Optimizing Video for Smooth Playback</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    AWS MediaConvert is generating 1080p, 720p, 480p, and 144p quality formats. This takes 1–2 minutes after uploading. It will start playing automatically once ready!
                  </p>
                </div>
              ) : (
                <div 
                  ref={playerContainerRef} 
                  className="w-full h-full absolute inset-0 z-0 bg-black group/player overflow-hidden"
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => setShowControls(false)}
                >
                  {activeVideo.platform === 'bunny' && (
                    <iframe 
                      src={bunnyEmbedUrl || activeVideo.url} 
                      className="w-full h-full border-0 relative z-[50]"
                      allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                      allowFullScreen={true}
                    />
                  )}
                  <div className={`absolute inset-0 pointer-events-none w-full h-full scale-[1.05] ${activeVideo.platform === 'bunny' ? 'hidden' : ''}`}>
                    <ReactPlayer
                      ref={playerRef}
                      url={activeVideo.url}
                      width="100%"
                      height="100%"
                      playing={playing}
                      playbackRate={playbackRate}
                      volume={volume}
                      muted={muted}
                      onProgress={(state) => {
                        setPlayed(state.played);
                        if (activeVideo && user?.uid) {
                          localStorage.setItem(`video_progress_${activeVideo.id}_${user.uid}`, state.playedSeconds.toString());
                        }
                        if (activeVideo?.id && state.played != null) {
                          const pct = Math.min(100, Math.round(state.played * 100));
                          recordProgress(activeVideo.id, pct);
                        }
                      }}
                      onDuration={(dur) => setDuration(dur)}
                      onReady={() => {
                        if (activeVideo && user?.uid && playerRef.current) {
                          if (!readyFiredRef.current.has(activeVideo.id)) {
                            readyFiredRef.current.add(activeVideo.id);
                            const saved = localStorage.getItem(`video_progress_${activeVideo.id}_${user.uid}`);
                            if (saved) {
                              playerRef.current.seekTo(parseFloat(saved), 'seconds');
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

                        // Apply quality on ready
                        const hls = playerRef.current?.getInternalPlayer('hls');
                        if (hls && hls.levels && hls.levels.length > 0) {
                          if (quality === 'Auto') {
                            hls.nextLevel = -1;
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
                              hls.nextLevel = levelIndex;
                            }
                          }
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
                            controls: 0, 
                            rel: 0, 
                            modestbranding: 1,
                            disablekb: 1,
                            iv_load_policy: 3,
                            cc_load_policy: 3
                          }
                        },
                        file: {
                          attributes: {
                            controlsList: "nodownload",
                            onContextMenu: (e: any) => e.preventDefault(),
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
                  </div>

                {/* Big Center Play Button Overlay when !playing */}
                {!playing && (
                  <div 
                    className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-20 h-20 bg-primary/90 text-white rounded-full flex items-center justify-center pl-2 shadow-2xl drop-shadow-2xl">
                      <Play className="w-10 h-10 fill-current" />
                    </div>
                  </div>
                )}
                
                {/* Anti-Piracy Click-to-Play Catcher with Double Tap to Seek */}
                <div className={`absolute inset-0 z-10 cursor-pointer flex ${activeVideo.platform === 'bunny' ? 'hidden' : ''}`}>
                  <div 
                    className="w-1/2 h-full"
                    onClick={(e) => {
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
                          setShowSpeedMenu(false);
                        }, 250);
                      }
                    }}
                  />
                  <div 
                    className="w-1/2 h-full"
                    onClick={(e) => {
                      if (clickTimeoutRef.current) {
                        clearTimeout(clickTimeoutRef.current);
                        clickTimeoutRef.current = null;
                        // Double click Right: Seek +10s
                        if (playerRef.current) {
                          const ct = playerRef.current.getCurrentTime();
                          playerRef.current.seekTo(Math.min(duration, ct + 10), 'seconds');
                        }
                      } else {
                        clickTimeoutRef.current = setTimeout(() => {
                          clickTimeoutRef.current = null;
                          setPlaying(!playing);
                          setShowSpeedMenu(false);
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
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-3 z-20 ${activeVideo.platform === 'bunny' ? 'hidden' : ''} ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
                    
                    {/* Progress Bar */}
                    <div className="w-full flex items-center group/progress h-4 cursor-pointer relative"
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        setPlayed(percentage);
                        playerRef.current?.seekTo(percentage, 'fraction');
                      }}
                    >
                      <div className="absolute w-full h-1 bg-white/20 rounded-full group-hover/progress:h-2 transition-all" />
                      <div className="absolute h-1 bg-primary rounded-full group-hover/progress:h-2 transition-all" style={{ width: `${played * 100}%` }} />
                      <div className="absolute h-3 w-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 shadow-md" style={{ left: `calc(${played * 100}% - 6px)` }} />
                    </div>

                    <div className="flex items-center justify-between text-foreground mt-1">
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
                                setShowQualityMenu(!showQualityMenu);
                                setShowSpeedMenu(false);
                              }}
                            >
                              {quality} <Settings className="w-4 h-4 ml-1" />
                            </button>
                            {showQualityMenu && (
                              <div className="absolute bottom-full right-0 mb-3 flex flex-col z-50">
                                <div className="bg-black/90 rounded border border-white/10 overflow-hidden shadow-2xl pb-1 w-28">
                                  <div className="flex justify-between items-center border-b border-white/10 mb-1 px-2">
                                    <span className="text-xs text-foreground/50 font-medium py-2">Quality</span>
                                    <X className="w-3 h-3 text-foreground/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowQualityMenu(false); }} />
                                  </div>
                                  {['Auto', '1080p', '720p', '480p', '360p', '144p'].map(q => (
                                    <button 
                                      key={q} 
                                      onClick={(e) => { e.stopPropagation(); setQuality(q); setShowQualityMenu(false); }}
                                      className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${quality === q ? 'text-primary font-bold bg-primary/10' : 'text-foreground'}`}
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
                              <div className="bg-black/90 rounded border border-white/10 overflow-hidden shadow-2xl pb-1 w-28">
                                <div className="flex justify-between items-center border-b border-white/10 mb-1 px-2">
                                  <span className="text-xs text-foreground/50 font-medium py-2">Speed</span>
                                  <X className="w-3 h-3 text-foreground/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(false); }} />
                                </div>
                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                  <button 
                                    key={rate} 
                                    onClick={(e) => { e.stopPropagation(); setPlaybackRate(rate); setShowSpeedMenu(false); }}
                                    className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${playbackRate === rate ? 'text-primary font-bold bg-primary/10' : 'text-foreground'}`}
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
            <div className="flex items-center gap-3">
              {activeVideo && activeVideo.type !== 'resource' && (
                <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full animate-pulse">
                  <Eye className="w-4 h-4" />
                  {viewersCount} student{viewersCount !== 1 ? 's' : ''} watching right now
                </div>
              )}
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
                        onClick={() => syllabusScrollRef.current?.scrollBy({ top: -180, behavior: 'smooth' })}
                        className="p-1 rounded bg-secondary/15 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer border border-secondary/20"
                        title="Scroll syllabus up"
                        aria-label="Scroll syllabus up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => syllabusScrollRef.current?.scrollBy({ top: 180, behavior: 'smooth' })}
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
            <div 
              ref={syllabusScrollRef}
              data-lenis-prevent="true"
              className="h-[520px] overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-2 custom-scrollbar overscroll-contain select-none"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(212, 175, 55, 0.75) rgba(255, 255, 255, 0.05)',
              }}
            >
                {folders.length === 0 ? (
                  <p className="p-4 text-muted-foreground text-sm text-center">No folders available for this course yet.</p>
                ) : (
                  folders.map((folder) => {
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
                                                  vPct >= 90
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
                                    type: cls.platform === 'zoom' ? 'resource' : 'video' // If zoom, make it a resource so it opens in a new tab
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
              </div>
          </CardContent>
        </Card>

        {user ? (
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

      {/* Checkout Modal */}
      {checkoutFolder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-center items-start overflow-y-auto p-4 sm:p-6">
          <div className="my-auto w-full max-w-md py-8">
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
                    ) : (paymentConfig?.cardEnabled !== false) ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-4">
                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
                          <p className="text-xs text-orange-400 font-medium flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                            This is a secure mock payment gateway. No real charges will be made.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label>Card Number</Label>
                            <Input placeholder="0000 0000 0000 0000" className="font-mono" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label>Expiry Date</Label>
                              <Input placeholder="MM/YY" className="font-mono" />
                            </div>
                            <div className="space-y-1">
                              <Label>CVC</Label>
                              <Input placeholder="123" type="password" maxLength={3} className="font-mono" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label>Cardholder Name</Label>
                            <Input placeholder="Name on card" />
                          </div>
                        </div>
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
    </div>
  );
}

