"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Video, Trash2, ExternalLink, Calendar, PlayCircle, StopCircle, RefreshCw, Copy, ChevronDown, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LiveAdminMonitor from "@/components/LiveAdminMonitor";
import AdminLiveChat from "@/components/AdminLiveChat";
import { FolderSelectModal } from "@/components/FolderSelectModal";
import { CourseSelectModal } from "@/components/CourseSelectModal";

export default function AdminLiveStudio() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("youtube"); // Legacy default
  const [link, setLink] = useState(""); // Legacy default
  const [multiStreams, setMultiStreams] = useState({
    youtube: { enabled: false, link: "" },
    zoom: { enabled: false, link: "" },
    rtmp: { enabled: false, link: "" },
    direct: { enabled: false, link: "" }
  });
  const [scheduledFor, setScheduledFor] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const [batches, setBatches] = useState<any[]>([]);
  const [targetFolderId, setTargetFolderId] = useState("none");
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingForType, setCreatingForType] = useState<"new" | "edit">("new");
  const [folders, setFolders] = useState<any[]>([]);
  const [allowDirectJoin, setAllowDirectJoin] = useState(true);
  const [rtmpStreamKey, setRtmpStreamKey] = useState("");
  const [rtmpServerUrl, setRtmpServerUrl] = useState("rtmp://13.60.252.104:1935/live");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showOldRecordsModal, setShowOldRecordsModal] = useState(false);
  const [oldRecordsSearch, setOldRecordsSearch] = useState("");

  // Edit State
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editMultiStreams, setEditMultiStreams] = useState<any>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editTargetFolderId, setEditTargetFolderId] = useState("none");
  const [editAllowDirectJoin, setEditAllowDirectJoin] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTargetFolderModalOpen, setIsTargetFolderModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isEditTargetFolderModalOpen, setIsEditTargetFolderModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "admin" && user.role !== "teacher"))) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "teacher")) return;
    
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
    
    const unsubBatches = onSnapshot(collection(db, 'batches'), (snap) => {
      setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.year.localeCompare(a.year)));
    }, (err) => console.error(err));

    const unsubFolders = onSnapshot(collection(db, 'folders'), (snap) => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const q = query(collection(db, 'live_classes'));
    const unsubLive = onSnapshot(q, (snap) => {
      const cls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cls.sort((a: any, b: any) => b.scheduledFor - a.scheduledFor);
      setLiveClasses(cls);
      setLoading(false);
    }, (err) => console.error(err));

    return () => {
      unsubCourses();
      unsubBatches();
      unsubFolders();
      unsubLive();
    };
  }, [user]);

  // Check for draftId in URL
  useEffect(() => {
    const handleDrafts = () => {
      if (typeof window === 'undefined' || !liveClasses.length) return;
      
      const searchParams = new URLSearchParams(window.location.search);
      const draftId = searchParams.get('draftId');
      
      if (draftId) {
        const draft = liveClasses.find(c => c.id === draftId && c.status === 'draft');
        if (draft) {
          setEditingClass(draft);
          setTitle(draft.title || "");
          setDescription(draft.description || "");
          setPlatform(draft.platform || "zoom");
          setLink(draft.link || "");
          if (draft.multiStreams) {
            setMultiStreams(draft.multiStreams);
          } else {
            // Fallback for old drafts
            setMultiStreams({
              youtube: { enabled: draft.platform === 'youtube', link: draft.platform === 'youtube' ? draft.link : '' },
              zoom: { enabled: draft.platform === 'zoom', link: draft.platform === 'zoom' ? draft.link : '' },
              rtmp: { enabled: draft.platform === 'rtmp', link: draft.platform === 'rtmp' ? draft.link : '' },
              direct: { enabled: draft.platform === 'direct', link: draft.platform === 'direct' ? draft.link : '' }
            });
          }
          setAllowDirectJoin(draft.allowDirectJoin !== false);
          
          if (draft.scheduledFor) {
            const date = new Date(draft.scheduledFor);
            // Format for datetime-local input: YYYY-MM-DDThh:mm
            const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
            setScheduledFor(formatted);
          }
        }
      }
    };
    handleDrafts();
  }, [liveClasses]);

  // Generate a random stream key for RTMP
  const generateStreamKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'ba_';
    for (let i = 0; i < 24; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
  };

  // Auto-generate RTMP credentials when platform changes to 'rtmp'
  useEffect(() => {
    if (multiStreams.rtmp.enabled && !rtmpStreamKey) {
      const key = generateStreamKey();
      setRtmpStreamKey(key);
      const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
      const serverPort = process.env.NEXT_PUBLIC_RTMP_HTTP_PORT || '8000';
      setRtmpServerUrl(`rtmp://${serverHost}:1935/live`);
      // Auto-set the HLS link for students
      setLink(`http://${serverHost}:${serverPort}/live/${key}/index.m3u8`);
      setMultiStreams(prev => ({ ...prev, rtmp: { ...prev.rtmp, link: `http://${serverHost}:${serverPort}/live/${key}/index.m3u8` } }));
    }
  }, [multiStreams.rtmp.enabled]);

    const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledFor) return;
    
    setIsSubmitting(true);
    try {
      if (editingClass?.status === 'draft') {
        // We are publishing a draft!
        await updateDoc(doc(db, 'live_classes', editingClass.id), {
          title,
          description,
          platform: multiStreams.youtube.enabled ? 'youtube' : (multiStreams.zoom.enabled ? 'zoom' : (multiStreams.rtmp.enabled ? 'rtmp' : 'direct')),
          link: multiStreams.youtube.enabled ? multiStreams.youtube.link : (multiStreams.zoom.enabled ? multiStreams.zoom.link : (multiStreams.rtmp.enabled ? multiStreams.rtmp.link : multiStreams.direct.link)),
          multiStreams,
          scheduledFor: new Date(scheduledFor).getTime(),
          courseId: courseId === "all" ? null : courseId,
          batchId: batchId === "all" ? null : batchId,
          targetFolderId: targetFolderId === "none" ? null : targetFolderId,
          allowDirectJoin: allowDirectJoin,
          status: 'scheduled',
        });
        setEditingClass(null);
      } else {
        await addDoc(collection(db, 'live_classes'), {
          title,
          description,
          platform: multiStreams.youtube.enabled ? 'youtube' : (multiStreams.zoom.enabled ? 'zoom' : (multiStreams.rtmp.enabled ? 'rtmp' : 'direct')),
          link: multiStreams.youtube.enabled ? multiStreams.youtube.link : (multiStreams.zoom.enabled ? multiStreams.zoom.link : (multiStreams.rtmp.enabled ? multiStreams.rtmp.link : multiStreams.direct.link)),
          multiStreams,
          scheduledFor: new Date(scheduledFor).getTime(),
          courseId: courseId === "all" ? null : courseId,
          batchId: batchId === "all" ? null : batchId,
          targetFolderId: targetFolderId === "none" ? null : targetFolderId,
          allowDirectJoin: allowDirectJoin,
          ...(multiStreams.rtmp.enabled ? { streamKey: rtmpStreamKey } : {}),
          status: 'scheduled',
          createdAt: serverTimestamp()
        });
      }
      
      setTitle("");
      setDescription("");
      setPlatform("youtube");
      setLink("");
      setMultiStreams({
        youtube: { enabled: false, link: "" },
        zoom: { enabled: false, link: "" },
        rtmp: { enabled: false, link: "" },
        direct: { enabled: false, link: "" }
      });
      setScheduledFor("");
      setTargetFolderId("none");
      setAllowDirectJoin(true);
      setRtmpStreamKey("");
      setRtmpServerUrl("");
      router.push('/admin/live'); // clear draftId from URL if present
    } catch (error) {
      alert("Failed to create class.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editTitle) return;

    setIsUpdating(true);
    try {
      const isYoutube = editMultiStreams?.youtube?.enabled;
      const isZoom = editMultiStreams?.zoom?.enabled;
      const isRtmp = editMultiStreams?.rtmp?.enabled;
      const isDirect = editMultiStreams?.direct?.enabled;
      
      const newPlatform = isYoutube ? 'youtube' : (isZoom ? 'zoom' : (isRtmp ? 'rtmp' : (isDirect ? 'direct' : editingClass.platform)));
      const newLink = isYoutube ? editMultiStreams.youtube.link : (isZoom ? editMultiStreams.zoom.link : (isRtmp ? editMultiStreams.rtmp.link : editMultiStreams.direct.link));

      await updateDoc(doc(db, 'live_classes', editingClass.id), {
        title: editTitle,
        description: editDescription,
        platform: newPlatform,
        link: newLink,
        multiStreams: editMultiStreams || editingClass.multiStreams || null,
        targetFolderId: editTargetFolderId === "none" ? null : editTargetFolderId,
        allowDirectJoin: editAllowDirectJoin
      });
      setEditingClass(null);
    } catch (err) {
      alert("Failed to update class.");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'ended') {
        updateData.endedAt = Date.now();
      }
      await updateDoc(doc(db, 'live_classes', id), updateData);

      if (newStatus === 'live') {
        const cls = liveClasses.find(c => c.id === id);
        if (cls) {
          await addDoc(collection(db, 'notifications'), {
            title: "🔴 LIVE Class Started!",
            message: `"${cls.title}" is now LIVE! Click here to join the broadcast.`,
            type: "live_class",
            target: "all_students",
            link: "/live",
            timestamp: Date.now(),
            createdAt: Date.now(),
            readBy: []
          });
        }
      }

      if (newStatus === 'ended') {
        const cls = liveClasses.find(c => c.id === id);
        if (cls && cls.targetFolderId && cls.targetFolderId !== 'none') {
          let inputTrimmed = "";
          let isYoutubeOrZoom = false;
          let isZoom = false;

          if (cls.multiStreams) {
             if (cls.multiStreams.youtube?.enabled && cls.multiStreams.youtube?.link) {
               inputTrimmed = cls.multiStreams.youtube.link.trim();
               isYoutubeOrZoom = true;
             } else if (cls.multiStreams.zoom?.enabled && cls.multiStreams.zoom?.link) {
               inputTrimmed = cls.multiStreams.zoom.link.trim();
               isYoutubeOrZoom = true;
               isZoom = true;
             }
          } else {
             inputTrimmed = cls.link ? cls.link.trim() : "";
             isYoutubeOrZoom = inputTrimmed.includes('youtube.com') || inputTrimmed.includes('youtu.be') || inputTrimmed.includes('zoom.us/rec');
             isZoom = inputTrimmed.includes('zoom.us/rec');
          }
          
          
          
          if (isYoutubeOrZoom) {
            // Trigger automatic background download and Bunny upload
            // isZoom determined above
            let videoPassword = "";
            
            // Note: If Zoom has a password, we can't easily prompt during auto-end unless we add a prompt here.
            // But since this happens on 'End Broadcast', we can prompt just in case it's Zoom.
            if (isZoom) {
               videoPassword = prompt(`(Optional) Enter the Zoom Passcode for background download:`, "") || "";
            }

            const videoDocId = doc(collection(db, 'videos')).id;
            const metadata = {
              videoDocId,
              videoTitle: `${cls.title} (Recorded Live)`,
              videoDescription: cls.description || '',
              selectedItemType: cls.courseId ? 'course' : 'folder',
              selectedCourseId: cls.courseId || 'none',
              selectedCourseFolderId: cls.targetFolderId,
              selectedFolderId: cls.targetFolderId
            };

            fetch('/api/bunny/aws-download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                url: inputTrimmed, 
                password: videoPassword,
                title: `${cls.title} (Recorded Live)`,
                metadata
              })
            }).catch(e => console.error("Auto background download failed to start:", e));
            
            // We do NOT add the raw link to the folder. The webhook will handle adding it!
          } else {
            // Old fallback: Just add the raw link to the folder directly (e.g., if it's already a Bunny link or custom)
            const folderRef = doc(db, 'folders', cls.targetFolderId);
            const folderSnap = await getDoc(folderRef);
            
            let actualCourseId = cls.courseId || null;
            if (folderSnap.exists()) {
              actualCourseId = folderSnap.data().courseId || actualCourseId;
              const items = folderSnap.data().items || [];
              
              const videoRef = doc(collection(db, 'videos'));
              await setDoc(videoRef, {
                id: videoRef.id,
                title: `${cls.title} (Recorded Live)`,
                description: cls.description || '',
                url: cls.link,
                platform: cls.platform,
                courseId: actualCourseId,
                folderId: cls.targetFolderId,
                type: 'video',
                createdAt: Date.now(),
                views: 0
              });

              await updateDoc(folderRef, {
                items: [...items, { id: videoRef.id, type: 'video' }]
              });
            }
          }
        }
      }
    } catch (e) {
      alert("Failed to update status. Quota exceeded?");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this live class?")) return;
    try {
      await deleteDoc(doc(db, 'live_classes', id));
    } catch (e) { }
  };

  const executeDeleteAll = async () => {
    try {
      const batch = writeBatch(db);
      liveClasses.forEach(cls => {
        batch.delete(doc(db, 'live_classes', cls.id));
      });
      await batch.commit();
      setShowDeleteAllModal(false);
    } catch (e) {
      alert("Failed to delete all. " + e);
    }
  };

  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  
  const recentClasses = liveClasses.filter(c => {
    if (c.status !== 'ended') return true;
    if (!c.endedAt) return false;
    return now - c.endedAt <= ONE_HOUR;
  });

  const archivedClasses = liveClasses.filter(c => {
    if (c.status !== 'ended') return false;
    if (!c.endedAt) return true;
    return now - c.endedAt > ONE_HOUR;
  });

  const filteredArchivedClasses = archivedClasses.filter(c => 
    c.title?.toLowerCase().includes(oldRecordsSearch.toLowerCase()) || 
    (c.description || "").toLowerCase().includes(oldRecordsSearch.toLowerCase())
  );

  if (loading || !user || (user.role !== "admin" && user.role !== "teacher")) {
    return <div className="flex h-[50vh] items-center justify-center"><p className="animate-pulse text-primary font-bold">Loading...</p></div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Video className="w-8 h-8" /> Live Studio
          </h1>
          <p className="text-muted-foreground mt-1">Schedule and manage live broadcasting sessions.</p>
        </div>
        <Link href="/admin">
          <Button variant="outline"><Settings className="w-4 h-4 mr-2" /> Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Form */}
        <Card className="lg:col-span-1 border-primary/20 shadow-md h-fit">
          <form onSubmit={handleCreateClass}>
            <CardHeader className="bg-secondary/5 border-b border-border/50">
              <CardTitle>{editingClass?.status === 'draft' ? "Publish Zoom Draft" : "Schedule Broadcast"}</CardTitle>
              {editingClass?.status === 'draft' && (
                <CardDescription>Assign this Zoom meeting to a course and folder, then publish it.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>Class Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsCourseModalOpen(true)}
                      className="flex h-10 flex-1 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-secondary/10 transition-colors"
                    >
                      <span className="truncate text-foreground font-medium">
                        {courseId === "all" ? "Global (All Courses)" : (courses.find(c => c.id === courseId)?.name || 'Select Course...')}
                      </span>
                      <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                    </button>
                    <Select value={batchId} onValueChange={(val: any) => setBatchId(val)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Global (All Batches)</SelectItem>
                        {batches.map(b => <SelectItem key={b.id} value={b.year}>{b.year}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={(val: any) => setPlatform(val as any)} disabled={editingClass?.status === 'draft'}>
                  <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rtmp">📡 RTMP Stream (OBS / Zoom Pro / StreamYard)</SelectItem>
                    <SelectItem value="youtube">YouTube Live (OBS Recommended)</SelectItem>
                    <SelectItem value="zoom">Zoom App Integration (Auto-Draft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {platform === "youtube" && (
                <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-primary flex items-center gap-1.5 text-sm">
                    <span>🚀</span> OBS Streaming (Internet Worldwide)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Uses YouTube RTMPS as the backend. Vercel cannot host RTMP. Students get high-speed adaptive quality (1080p, 720p).
                  </p>
                  <div className="bg-background/80 p-2.5 rounded-lg border border-border/50 space-y-1.5">
                    <div><strong>🎥 From OBS:</strong> Settings &rarr; Stream &rarr; Select <em>YouTube - RTMPS</em> &rarr; Paste your YouTube stream key &rarr; Click <em>Start Streaming</em>.</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    👉 Then paste your YouTube unlisted video link in the <strong>Live Link</strong> box below.
                  </div>
                </div>
              )}
              
              {platform === "zoom" && (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-blue-500 flex items-center gap-1.5 text-sm">
                    <span>📹</span> Zoom Webhook Integration
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    When you start a meeting in your Zoom account, the link is <strong>automatically drafted</strong> here via webhook.
                    <br />You just need to click the notification, select a folder, and hit Publish!
                  </p>
                </div>
              )}
              
              {platform === "rtmp" && (
                <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-xs space-y-3">
                  <div className="font-bold text-green-500 flex items-center gap-1.5 text-sm">
                    <span>📡</span> RTMP Direct Stream (Auto-Record & Auto-Upload)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Stream directly from <strong>OBS</strong>, <strong>Zoom Pro</strong> (Custom Live Streaming), or <strong>StreamYard</strong> to your own server. When you end the stream, the recording is <strong>automatically uploaded to BunnyCDN</strong> and appears in your course folder!
                  </p>
                  
                  <div className="bg-background/80 p-3 rounded-lg border border-border/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-muted-foreground font-medium mb-0.5">RTMP Server URL</div>
                        <code className="text-xs text-green-400 font-mono bg-black/30 px-2 py-1 rounded">{rtmpServerUrl || 'rtmp://13.60.252.104:1935/live'}</code>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]"
                        onClick={() => { navigator.clipboard.writeText(rtmpServerUrl); }}
                      >📋 Copy</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-muted-foreground font-medium mb-0.5">Stream Key</div>
                        <code className="text-xs text-green-400 font-mono bg-black/30 px-2 py-1 rounded">{rtmpStreamKey}</code>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]"
                        onClick={() => { navigator.clipboard.writeText(rtmpStreamKey); }}
                      >📋 Copy</Button>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <div><strong>🎥 OBS:</strong> Settings → Stream → Select <em>Custom</em> → Paste Server URL & Stream Key → Start Streaming</div>
                    <div><strong>📹 Zoom Pro:</strong> More (...) → Live on Custom Live Streaming → Paste Server URL & Stream Key → Go Live</div>
                    <div><strong>🎬 StreamYard:</strong> Add Destination → Custom RTMP → Paste Server URL & Stream Key → Go Live</div>
                  </div>
                </div>
              )}
              
              {platform !== "rtmp" && (
              <div className="space-y-2">
                <Label>
                  {platform === "zoom" 
                    ? "Zoom Meeting Link *" 
                    : platform === "youtube" 
                    ? "YouTube Live / Video Link *" 
                    : "Live Stream Link *"}
                </Label>
                <Input 
                  value={link} 
                  onChange={e => setLink(e.target.value)} 
                  required 
                  disabled={editingClass?.status === 'draft'} 
                  placeholder={
                    platform === "zoom" 
                      ? "https://zoom.us/j/... (or start in Zoom to auto-fill)" 
                      : platform === "youtube" 
                      ? "https://www.youtube.com/watch?v=..." 
                      : "https://..."
                  }
                />
                {platform === "zoom" && (
                  <p className="text-[11px] text-muted-foreground">
                    💡 <em>Tip: If you start a meeting directly in Zoom, this link is <strong>automatically filled</strong> for you!</em>
                  </p>
                )}
              </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Save Recorded Video to Folder</span>
                  <span className="text-[11px] text-muted-foreground font-normal">Auto-saves when ended</span>
                </Label>
                <button 
                  type="button"
                  onClick={() => setIsTargetFolderModalOpen(true)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-secondary/10 transition-colors"
                >
                  <span className="truncate text-foreground font-medium">
                    {targetFolderId === "none" ? "Don't save automatically" : (folders.find(f => f.id === targetFolderId)?.name || 'Select a folder...')}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                </button>
              </div>

              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} required type="datetime-local" />
              </div>

              {platform === "zoom" && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <div className="space-y-0.5 pr-3">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-500">
                      <span>📹</span> Direct Zoom Join (Option 1)
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {allowDirectJoin 
                        ? "Enabled: Students see the 'JOIN ZOOM MEETING' 1-click button." 
                        : "Disabled: 1-Click button hidden. Students cannot enter your Zoom room directly."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={allowDirectJoin ? "default" : "outline"}
                    className={`h-8 px-3 text-xs font-bold shrink-0 transition-all ${
                      allowDirectJoin 
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-sm" 
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                    onClick={() => setAllowDirectJoin(!allowDirectJoin)}
                  >
                    {allowDirectJoin ? "✓ Enabled" : "✕ Disabled"}
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-secondary/5 border-t border-border/50 py-4 flex gap-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : editingClass?.status === 'draft' ? "Publish Zoom Meeting" : "Schedule Class"}
              </Button>
              {editingClass?.status === 'draft' && (
                <Button type="button" variant="outline" onClick={() => { setEditingClass(null); router.push('/admin/live'); }}>Cancel</Button>
              )}
            </CardFooter>
          </form>
        </Card>

        {/* Classes List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Managed Sessions
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowOldRecordsModal(true)} className="h-8 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 mr-1" /> Old Records
                </Button>
                {recentClasses.length > 0 && (
                  <Button size="sm" variant="destructive" onClick={() => setShowDeleteAllModal(true)} className="h-8 text-xs font-bold text-white bg-red-600 hover:bg-red-700">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete All
                  </Button>
                )}
              </div>
            </div>
            
            {recentClasses.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-secondary rounded-xl text-center text-muted-foreground">
                No active or recent live classes.
              </div>
            ) : (
              recentClasses.map(cls => (
              <Card key={cls.id} className={`overflow-hidden transition-all ${cls.status === 'live' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-secondary/30'}`}>
                <div className={`h-1.5 w-full ${
                  cls.status === 'live' ? 'bg-red-500 animate-pulse' : 
                  cls.status === 'scheduled' ? 'bg-blue-500' : 'bg-zinc-600'
                }`}></div>
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg leading-tight">{cls.title}</h3>
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                        cls.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                        cls.status === 'scheduled' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-zinc-800 text-white'
                      }`}>
                        {cls.status}
                      </span>
                    </div>
                    {cls.description && <p className="text-sm text-muted-foreground line-clamp-1">{cls.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium pt-2">
                      <span className="text-primary flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(cls.scheduledFor).toLocaleString()}
                      </span>
                      {cls.multiStreams ? (
                          <div className="flex gap-1.5 flex-wrap ml-2 border-l border-border pl-2">
                            {cls.multiStreams.youtube?.enabled && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">YOUTUBE</span>}
                            {cls.multiStreams.zoom?.enabled && <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">ZOOM</span>}
                            {cls.multiStreams.rtmp?.enabled && <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">RTMP</span>}
                            {cls.multiStreams.direct?.enabled && <span className="text-[10px] font-bold text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded">DIRECT</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground uppercase">{cls.platform}</span>
                        )}
                      <span className="text-muted-foreground truncate">{cls.courseId ? 'Specific Course' : 'Global'}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                    {cls.status === 'draft' && (
                      <Link href={`/admin/live?draftId=${cls.id}`}>
                        <Button size="sm" variant="default" className="w-full bg-blue-600 hover:bg-blue-700">
                          Configure & Publish
                        </Button>
                      </Link>
                    )}
                    {cls.status === 'scheduled' && (
                      <Button size="sm" onClick={() => updateStatus(cls.id, 'live')} className="bg-red-600 hover:bg-red-700 text-foreground w-full">
                        <PlayCircle className="w-4 h-4 mr-2" /> GO LIVE
                      </Button>
                    )}
                    {cls.status === 'live' && (
                      <Button size="sm" onClick={() => updateStatus(cls.id, 'ended')} variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-foreground w-full">
                        <StopCircle className="w-4 h-4 mr-2" /> End Broadcast
                      </Button>
                    )}
                    {cls.status === 'ended' && (
                      <div className="space-y-2 w-full">
                        <Button size="sm" onClick={() => updateStatus(cls.id, 'scheduled')} variant="secondary" className="w-full">
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Re-schedule
                        </Button>
                      </div>
                    )}
                    
                    {cls.platform === 'rtmp' && (cls.status === 'live' || cls.status === 'scheduled') && (
                      <div className="bg-zinc-900 p-3 rounded-lg border border-primary/20 text-xs text-muted-foreground w-full mt-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate"><strong className="text-foreground">RTMP URL:</strong> {process.env.NEXT_PUBLIC_RTMP_SERVER_URL || `rtmp://${process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || "13.60.252.104"}:1935/live`}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 hover:text-foreground" onClick={() => navigator.clipboard.writeText(process.env.NEXT_PUBLIC_RTMP_SERVER_URL || `rtmp://${process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || "13.60.252.104"}:1935/live`)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate"><strong className="text-foreground">Stream Key:</strong> {cls.streamKey}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 hover:text-foreground" onClick={() => navigator.clipboard.writeText(cls.streamKey)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {cls.platform === 'zoom' && (
                      <div className="w-full mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={`w-full h-8 text-xs font-bold transition-all ${
                            cls.allowDirectJoin !== false 
                              ? 'text-green-500 border-green-500/30 hover:bg-green-500/10' 
                              : 'text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                          }`}
                          onClick={async () => {
                            const newVal = cls.allowDirectJoin === false ? true : false;
                            await updateDoc(doc(db, 'live_classes', cls.id), { allowDirectJoin: newVal });
                          }}
                        >
                          {cls.allowDirectJoin !== false ? "✓ Direct Zoom Join: Enabled" : "✕ Direct Zoom Join: Disabled"}
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2 w-full mt-2">
                      {cls.platform !== 'rtmp' && (
                        <a href={cls.link} target="_blank" rel="noreferrer" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full h-8"><ExternalLink className="w-3 h-3 mr-1"/> Test</Button>
                        </a>
                      )}
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingClass(cls);
                        setEditTitle(cls.title);
                        setEditDescription(cls.description || "");
                        setEditLink(cls.link);
                        if (cls.multiStreams) {
                          setEditMultiStreams(cls.multiStreams);
                        } else {
                          setEditMultiStreams({
                            youtube: { enabled: cls.platform === 'youtube', link: cls.platform === 'youtube' ? cls.link : '' },
                            zoom: { enabled: cls.platform === 'zoom', link: cls.platform === 'zoom' ? cls.link : '' },
                            rtmp: { enabled: cls.platform === 'rtmp', link: cls.platform === 'rtmp' ? cls.link : '' },
                            direct: { enabled: cls.platform === 'direct', link: cls.platform === 'direct' ? cls.link : '' }
                          });
                        }
                        setEditTargetFolderId(cls.targetFolderId || "none");
                        setEditAllowDirectJoin(cls.allowDirectJoin !== false);
                      }} className="text-blue-500 border-blue-500/20 hover:bg-blue-500/10 px-2 h-8">
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(cls.id)} className="text-red-500 border-red-500/20 hover:bg-red-500/10 px-2 h-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
                {cls.status === 'live' && (
                  <div className="px-5 pb-5 pt-0">
                    <LiveAdminMonitor liveClassId={cls.id} />
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
      
      {/* Edit Modal */}
      {editingClass && editingClass.status !== 'draft' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/20">
            <form onSubmit={handleUpdateClass}>
              <CardHeader>
                <CardTitle>Edit Live Session</CardTitle>
                <CardDescription>Update session details for: {editingClass.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Video/Stream Link</Label>
                  <Input value={editLink} onChange={e => setEditLink(e.target.value)} required type="url" />
                </div>
                <div className="space-y-2">
                  <Label>Save Recorded Video to Folder</Label>
                  <button 
                    type="button"
                    onClick={() => setIsEditTargetFolderModalOpen(true)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-secondary/10 transition-colors"
                  >
                    <span className="truncate text-foreground font-medium">
                      {editTargetFolderId === "none" ? "Don't save automatically" : (folders.find(f => f.id === editTargetFolderId)?.name || 'Select a folder...')}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                  </button>
                </div>

                {editingClass.platform === 'zoom' && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5">
                    <div className="space-y-0.5 pr-3">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-500">
                        <span>📹</span> Direct Zoom Join (Option 1)
                      </Label>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {editAllowDirectJoin 
                          ? "Students see the 'JOIN ZOOM MEETING' 1-click button." 
                          : "1-Click button hidden. Students cannot enter your Zoom room directly."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={editAllowDirectJoin ? "default" : "outline"}
                      className={`h-8 px-3 text-xs font-bold shrink-0 transition-all ${
                        editAllowDirectJoin 
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-sm" 
                          : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                      onClick={() => setEditAllowDirectJoin(!editAllowDirectJoin)}
                    >
                      {editAllowDirectJoin ? "✓ Enabled" : "✕ Disabled"}
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditingClass(null)}>Cancel</Button>
                <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Old Records Modal */}
      {showOldRecordsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-3xl shadow-2xl border-primary/20 max-h-[85vh] flex flex-col">
            <CardHeader className="border-b pb-4 shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Past Broadcasts
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowOldRecordsModal(false)}>
                  Close
                </Button>
              </div>
              <div className="mt-4">
                <Input 
                  placeholder="Search past classes..." 
                  value={oldRecordsSearch}
                  onChange={(e) => setOldRecordsSearch(e.target.value)}
                  className="w-full"
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto p-0 flex-1">
              {filteredArchivedClasses.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No past broadcasts found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredArchivedClasses.map(cls => (
                    <div key={cls.id} className="p-4 hover:bg-secondary/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-foreground">{cls.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ended: {cls.endedAt ? new Date(cls.endedAt).toLocaleString() : new Date(cls.scheduledFor).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" onClick={() => updateStatus(cls.id, 'scheduled')} variant="secondary">
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Re-schedule
                        </Button>
                        <Button size="icon" variant="destructive" onClick={async () => {
                           if(confirm('Delete this record permanently?')) {
                             await deleteDoc(doc(db, 'live_classes', cls.id));
                           }
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete All Modal (Top Notification Style) */}
      {showDeleteAllModal && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-300 w-[90%] max-w-lg">
          <div className="bg-red-600 text-white px-5 py-4 rounded-xl shadow-2xl border border-red-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div className="text-sm">
                <p className="font-bold text-base">Confirm Deletion</p>
                <p className="opacity-90 leading-tight mt-0.5">Are you sure you want to DELETE ALL live sessions?</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white" onClick={() => setShowDeleteAllModal(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-white text-red-600 hover:bg-red-50 font-bold shadow-sm" onClick={executeDeleteAll}>
                Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <FolderSelectModal
        isOpen={isTargetFolderModalOpen}
        onClose={() => setIsTargetFolderModalOpen(false)}
        onSelect={(folderId) => setTargetFolderId(folderId)}
        selectedFolderId={targetFolderId}
        courses={courses}
        folders={folders}
        batches={batches}
        title="Select Target Folder"
        allowNone={true}
        defaultBatchId={batchId === "all" ? "all" : (batches.find(b => b.year === batchId)?.id || "all")}
      />

      <FolderSelectModal
        isOpen={isEditTargetFolderModalOpen}
        onClose={() => setIsEditTargetFolderModalOpen(false)}
        onSelect={(folderId) => setEditTargetFolderId(folderId)}
        selectedFolderId={editTargetFolderId}
        courses={courses}
        folders={folders}
        batches={batches}
        title="Select Target Folder"
        allowNone={true}
        defaultBatchId={batchId === "all" ? "all" : (batches.find(b => b.year === batchId)?.id || "all")}
      />

      <CourseSelectModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSelect={(id) => setCourseId(id)}
        selectedCourseId={courseId}
        courses={courses}
        batches={batches}
        title="Select Target Course"
        allowNone={true}
        noneLabel="Global (All Courses)"
        defaultBatchId={batchId === "all" ? "all" : (batches.find(b => b.year === batchId)?.id || "all")}
      />
    </div>
  );

}


