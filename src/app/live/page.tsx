"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Calendar, PlayCircle, Clock, ExternalLink } from "lucide-react";
import LiveChat from "@/components/LiveChat";

export default function StudentLivePortal() {
  const { user, loading } = useAuth();
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [fetchingClasses, setFetchingClasses] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    
    const fetchData = async () => {
      let folderCourseMap = new Map<string, string>();
      try {
        // Fetch all folders to map folder -> courseId
        const { getDocs } = require('firebase/firestore');
        
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
        const q = query(
          collection(db, 'live_classes'),
          where('status', 'in', ['scheduled', 'live'])
        );
        
        const unsub = onSnapshot(q, (snap) => {
          let classes = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
          
          classes = classes.filter(cls => {
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

    const { updateDoc, doc, increment, setDoc } = require('firebase/firestore');
    const { calculateXpLevel } = require('@/lib/xp');

    const studyHeartbeat = setInterval(() => {
      const nowStr = new Date().toISOString().split('T')[0];
      const newXp = (user.totalXp || 0) + 10;
      updateDoc(doc(db, 'users', user.uid), {
        totalStudyTimeMins: increment(1),
        [`studyHistory.${nowStr}`]: increment(1),
        totalXp: increment(10),
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

  // Utility to extract YouTube video ID from various link formats
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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
                        <span className="bg-red-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse shadow-lg flex items-center gap-1.5">
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
                  {cls.status === 'live' && cls.platform !== 'youtube' && (
                    <a href={cls.link} target="_blank" rel="noreferrer" className="shrink-0">
                      <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold w-full md:w-auto h-14 px-8 text-lg animate-pulse">
                        <PlayCircle className="w-6 h-6 mr-2" /> JOIN {cls.platform.toUpperCase()} MEETING
                      </Button>
                    </a>
                  )}
                  {cls.status === 'scheduled' && (
                     <div className="shrink-0 p-4 bg-background rounded-xl border border-border shadow-inner text-center">
                       <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                       <p className="text-sm font-bold">Waiting for host to start...</p>
                     </div>
                  )}
                </div>
              </div>

              {/* YouTube Native Player Section */}
              {cls.platform === 'youtube' && cls.status === 'live' && (
                <div className="aspect-video w-full bg-black">
                  {getYouTubeId(cls.link) ? (
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${getYouTubeId(cls.link)}?autoplay=1&rel=0`} 
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-900 border-t border-zinc-800">
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
