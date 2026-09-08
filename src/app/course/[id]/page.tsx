"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayCircle, Lock, Eye, ShieldAlert, Folder, ChevronDown, ChevronRight, FileText, Play, Pause, Volume2, VolumeX, Maximize, Settings, X, Download, Video, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, use, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, increment, onSnapshot, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { calculateXpLevel, XP_PER_STUDY_MINUTE } from "@/lib/xp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const formatVideoUrl = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();

  // Dailymotion link cleaning: handle embed, dai.ly, and standard video links
  if (cleanUrl.includes('dailymotion.com/embed/video/')) {
    const videoId = cleanUrl.split('dailymotion.com/embed/video/')[1]?.split('?')[0];
    if (videoId) return `https://www.dailymotion.com/video/${videoId}`;
  }
  if (cleanUrl.includes('dai.ly/')) {
    const videoId = cleanUrl.split('dai.ly/')[1]?.split('?')[0];
    if (videoId) return `https://www.dailymotion.com/video/${videoId}`;
  }

  // Google Drive link cleaning: convert file/d/ ID to direct stream URL
  if (cleanUrl.includes('drive.google.com/file/d/')) {
    const fileId = cleanUrl.split('/file/d/')[1]?.split('/')[0];
    if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return cleanUrl;
};

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [pastLiveClasses, setPastLiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [viewersCount, setViewersCount] = useState(0);
  
  // Checkout States
  const [checkoutFolder, setCheckoutFolder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'card'>('bank');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  // Video Player States
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wmRef = useRef<HTMLDivElement>(null);

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
    if (!user) return; // wait for auth

    const fetchData = async () => {
      try {
        // Fetch course details
        const courseSnap = await getDoc(doc(db, "courses", id));
        if (courseSnap.exists()) {
          setCourse({ id: courseSnap.id, ...courseSnap.data() });
        }

        // Fetch folders for this course
        const qFolders = query(collection(db, "folders"), where("courseId", "==", id));
        const foldersSnap = await getDocs(qFolders);
        const foldersData = foldersSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.createdAt - b.createdAt);
        setFolders(foldersData);

        // Fetch videos for this course
        const qVideos = query(collection(db, "videos"), where("courseId", "==", id));
        const videosSnap = await getDocs(qVideos);
        const videosData = videosSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.createdAt - b.createdAt);
        setVideos(videosData);

        // Fetch past live classes for this course
        const qLive = query(collection(db, "live_classes"), where("courseId", "==", id), where("status", "==", "ended"));
        const liveSnap = await getDocs(qLive);
        const pastLiveClassesData = liveSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.scheduledFor - a.scheduledFor);
        setPastLiveClasses(pastLiveClassesData);

        // Fetch payment config
        const configSnap = await getDoc(doc(db, "siteConfig", "payments"));
        if (configSnap.exists()) {
          const conf = configSnap.data();
          setPaymentConfig(conf);
          if (conf.cardEnabled && !conf.bankEnabled) setPaymentMethod('card');
          else if (!conf.cardEnabled && conf.bankEnabled) setPaymentMethod('bank');
        }

        // Auto-select first folder and video if available
        const accessibleFolders = foldersData.filter((f: any) => {
          const exp = user.folderAccess?.[f.id];
          return user.role === 'admin' || user.role === 'teacher' || (user.accessibleCourses && user.accessibleCourses.includes(id)) || (exp && exp > Date.now());
        });

        if (accessibleFolders.length > 0) {
          const firstFolder = accessibleFolders[0];
          setActiveFolderId(firstFolder.id);
          const firstFolderVideos = videosData.filter((v: any) => v.folderId === firstFolder.id);
          if (firstFolderVideos.length > 0) {
            setActiveVideo(firstFolderVideos[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load course data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Anti-piracy shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.shiftKey && e.key === '3')) {
        e.preventDefault();
        alert("Screenshots are disabled for this copyrighted content.");
      }
    };
    window.addEventListener('keydown', handleKeyDown);

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
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      observer.disconnect();
    };
  }, [id, user]);

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

  if (loading) {
    return <div className="p-12 text-center animate-pulse">Loading Course Data...</div>;
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
          amount: checkoutFolder.price || 0,
          method: paymentMethod,
          receiptUrl: "",         // kept for schema compatibility
          receiptBase64,          // compressed image stored directly in Firestore
          status: paymentMethod === 'card' ? 'approved' : 'pending',
          createdAt: Date.now()
        });
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

  if (!course) {
    return <div className="p-12 text-center text-red-500">Course not found.</div>;
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
                <div className="w-full h-full absolute inset-0 z-0 bg-secondary/10 flex flex-col items-center justify-center p-8 text-center border-4 border-secondary/20 rounded-xl">
                  <FileText className="w-24 h-24 text-primary mb-6" />
                  <h2 className="text-2xl font-bold mb-2">{activeVideo.title}</h2>
                  <p className="text-muted-foreground mb-8 max-w-md">This is a course resource file. You can view or download it to study along with the course.</p>
                  <div className="flex gap-4">
                    <Button onClick={() => {
                       try {
                         if (activeVideo.url.startsWith('data:')) {
                           // Convert data URI to blob URL (works in all browsers)
                           const arr = activeVideo.url.split(',');
                           const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
                           const bstr = atob(arr[1]);
                           let n = bstr.length;
                           const u8arr = new Uint8Array(n);
                           while (n--) u8arr[n] = bstr.charCodeAt(n);
                           const blob = new Blob([u8arr], { type: mime });
                           const blobUrl = URL.createObjectURL(blob);
                           window.open(blobUrl, '_blank');
                         } else {
                           window.open(activeVideo.url, '_blank');
                         }
                       } catch (err) {
                         console.error('Failed to open resource', err);
                         alert('Could not open resource. Please try the Download button instead.');
                       }
                     }} size="lg">
                      View Resource
                    </Button>
                    <Button onClick={() => {
                      const a = document.createElement('a');
                      a.href = activeVideo.url;
                      a.download = activeVideo.title || "resource";
                      a.click();
                    }} variant="outline" size="lg">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  ref={playerContainerRef} 
                  className="w-full h-full absolute inset-0 z-0 bg-black group/player overflow-hidden"
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => setShowControls(false)}
                >
                  {/* The pointer-events-none wrapper completely disables ANY interaction with the underlying YouTube iframe */}
                  <div className="absolute inset-0 pointer-events-none w-full h-full scale-[1.05]">
                    <ReactPlayer
                      ref={playerRef}
                      url={formatVideoUrl(activeVideo.url)}
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
                    }}
                    onDuration={(dur) => setDuration(dur)}
                    onReady={() => {
                      if (activeVideo && user?.uid && playerRef.current) {
                        const saved = localStorage.getItem(`video_progress_${activeVideo.id}_${user.uid}`);
                        if (saved) {
                          playerRef.current.seekTo(parseFloat(saved), 'seconds');
                        }
                      }
                      
                      const internal = playerRef.current?.getInternalPlayer();
                      if (internal && typeof internal.unloadModule === 'function') {
                        try {
                          internal.unloadModule("captions");
                          internal.unloadModule("cc");
                        } catch (e) {}
                      }
                    }}
                    config={{
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
                      dailymotion: {
                        params: {
                          controls: false,
                          'ui-start-screen-info': false,
                          'ui-logo': false,
                          autoplay: false
                        }
                      },
                      file: {
                        attributes: {
                          controlsList: "nodownload",
                          onContextMenu: (e: any) => e.preventDefault(),
                          disablePictureInPicture: true
                        }
                      }
                    }}
                  />
                </div>
                
                {/* Anti-Piracy Click-to-Play Catcher with Double Tap to Seek */}
                <div className="absolute inset-0 z-10 cursor-pointer flex">
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
                          setShowQualityMenu(false);
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
                          setShowQualityMenu(false);
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

                {/* Big Center Play Button Overlay when paused */}
                {!playing && (
                  <div className="absolute inset-0 z-[15] pointer-events-none flex items-center justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-2xl backdrop-blur-sm animate-pulse">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                    </div>
                  </div>
                )}

                {/* Custom Controls Overlay */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-3 z-20 ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
                  
                  {/* Progress Bar */}
                  <div className="w-full flex items-center group/progress h-4 cursor-pointer relative"
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, x / rect.width));
                      setPlayed(percentage);
                      playerRef.current?.seekTo(percentage);
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
                      {/* Quality Control (Hidden for YouTube) */}
                      {activeVideo?.platform !== 'youtube' && (
                        <div className="relative flex items-center">
                          <button 
                            className="text-sm font-bold hover:text-primary transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowQualityMenu(!showQualityMenu);
                              setShowSpeedMenu(false);
                            }}
                          >
                            {quality}
                          </button>
                          {showQualityMenu && (
                            <div className="absolute bottom-full right-0 mb-3 flex flex-col z-50">
                              <div className="bg-black/90 rounded border border-white/10 overflow-hidden shadow-2xl pb-1 w-28">
                                <div className="flex justify-between items-center border-b border-white/10 mb-1 px-2">
                                  <span className="text-xs text-foreground/50 font-medium py-2">Quality</span>
                                  <X className="w-3 h-3 text-foreground/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowQualityMenu(false); }} />
                                </div>
                                {['Auto', '1080p', '720p', '480p'].map(q => (
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
                                if (screen.orientation && screen.orientation.lock) {
                                  try {
                                    await screen.orientation.lock('landscape');
                                  } catch (e) {
                                    console.log("Orientation lock failed/unsupported", e);
                                  }
                                }
                              }
                            } else {
                              await document.exitFullscreen();
                              if (screen.orientation && screen.orientation.unlock) {
                                screen.orientation.unlock();
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
            <h1 className="text-2xl font-bold">{activeVideo ? activeVideo.title : course.name}</h1>
            {activeVideo && (
              <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full animate-pulse">
                <Eye className="w-4 h-4" />
                {viewersCount} student{viewersCount !== 1 ? 's' : ''} watching right now
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            {activeVideo ? "Currently playing from the course syllabus." : "Course overview."}
          </p>
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
      </div>

      {/* Course Sidebar */}
      <div className="space-y-6">
        <Card className="border-secondary/50">
          <CardHeader>
            <CardTitle>Course Syllabus</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="flex flex-col p-2 gap-2">
                {folders.length === 0 ? (
                  <p className="p-4 text-muted-foreground text-sm text-center">No folders available for this course yet.</p>
                ) : (
                  folders.map((folder) => {
                    const isExpanded = activeFolderId === folder.id;
                    const folderVideos = videos.filter(v => v.folderId === folder.id);
                    
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
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-bold text-sm">
                              {hasSpecificFolderAccess ? <Folder className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-red-500" />}
                              {folder.name}
                              {folder.price ? <span className="ml-2 text-xs bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-mono">Rs. {folder.price}</span> : null}
                            </div>
                            {hasSpecificFolderAccess && user?.role !== 'admin' && !legacyCourseAccess && folderExpiration ? (
                              <p className="text-xs text-green-600 font-bold">{daysLeft} days remaining</p>
                            ) : null}
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
                            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                        
                        {isExpanded && hasSpecificFolderAccess && (
                          <div className="flex flex-col border-t border-secondary/30">
                            {folderVideos.length === 0 ? (
                              <p className="p-3 text-xs text-muted-foreground italic">No items in this folder.</p>
                            ) : (
                              folderVideos.map((video) => {
                                const isPlaying = activeVideo?.id === video.id;
                                const isResource = video.type === 'resource';
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
                                      isResource ? (
                                        <FileText className={`w-4 h-4 shrink-0 ${isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
                                      ) : (
                                        <PlayCircle className={`w-4 h-4 shrink-0 ${isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
                                      )
                                    )}
                                    <span className={`truncate ${isPlaying ? 'font-bold text-primary' : ''}`}>
                                      {video.title}
                                    </span>
                                  </button>
                                );
                              })
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
            </ScrollArea>
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

