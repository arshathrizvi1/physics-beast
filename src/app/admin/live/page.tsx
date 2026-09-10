"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Video, Trash2, ExternalLink, Calendar, PlayCircle, StopCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LiveAdminMonitor from "@/components/LiveAdminMonitor";
import AdminLiveChat from "@/components/AdminLiveChat";

export default function AdminLiveStudio() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [link, setLink] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const [batches, setBatches] = useState<any[]>([]);
  const [targetFolderId, setTargetFolderId] = useState("none");
  const [folders, setFolders] = useState<any[]>([]);
  const [allowDirectJoin, setAllowDirectJoin] = useState(true);
  const [rtmpStreamKey, setRtmpStreamKey] = useState("");
  const [rtmpServerUrl, setRtmpServerUrl] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetFolderId, setEditTargetFolderId] = useState("none");
  const [editAllowDirectJoin, setEditAllowDirectJoin] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
    if (platform === 'rtmp' && !rtmpStreamKey) {
      const key = generateStreamKey();
      setRtmpStreamKey(key);
      const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
      const serverPort = process.env.NEXT_PUBLIC_RTMP_HTTP_PORT || '8000';
      setRtmpServerUrl(`rtmp://${serverHost}:1935/live`);
      // Auto-set the HLS link for students
      setLink(`http://${serverHost}:${serverPort}/live/${key}/index.m3u8`);
    }
  }, [platform]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledFor) return;
    if (platform !== 'rtmp' && !link) return; // RTMP auto-fills the link
    
    setIsSubmitting(true);
    try {
      if (editingClass?.status === 'draft') {
        // We are publishing a draft!
        await updateDoc(doc(db, 'live_classes', editingClass.id), {
          title,
          description,
          platform,
          link,
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
          platform,
          link,
          scheduledFor: new Date(scheduledFor).getTime(),
          courseId: courseId === "all" ? null : courseId,
          batchId: batchId === "all" ? null : batchId,
          targetFolderId: targetFolderId === "none" ? null : targetFolderId,
          allowDirectJoin: allowDirectJoin,
          ...(platform === 'rtmp' ? { streamKey: rtmpStreamKey } : {}),
          status: 'scheduled',
          createdAt: serverTimestamp()
        });
      }
      
      setTitle("");
      setDescription("");
      setLink("");
      setScheduledFor("");
      setTargetFolderId("none");
      setAllowDirectJoin(true);
      setRtmpStreamKey("");
      setRtmpServerUrl("");
      router.push('/admin/live'); // clear draftId from URL if present
    } catch (error) {
      alert("Failed to create class. Quota exceeded?");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editTitle || !editLink) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'live_classes', editingClass.id), {
        title: editTitle,
        description: editDescription,
        link: editLink,
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
      await updateDoc(doc(db, 'live_classes', id), { status: newStatus });

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
        if (cls && cls.targetFolderId) {
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
    } catch (e) {
      alert("Failed to update. Quota exceeded?");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this live class?")) return;
    try {
      await deleteDoc(doc(db, 'live_classes', id));
    } catch (e) { }
  };

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
                    <Select value={courseId} onValueChange={(val: any) => setCourseId(val)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select Course" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Global (All Courses)</SelectItem>
                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                    <SelectItem value="meet">Google Meet</SelectItem>
                    <SelectItem value="custom">Custom HLS / External Link</SelectItem>
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
                        <code className="text-xs text-green-400 font-mono bg-black/30 px-2 py-1 rounded">{rtmpServerUrl || 'rtmp://YOUR_SERVER:1935/live'}</code>
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
                    : platform === "meet" 
                    ? "Google Meet Link *" 
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
                <Select value={targetFolderId} onValueChange={(val: any) => setTargetFolderId(val)}>
                  <SelectTrigger><SelectValue placeholder="Select Folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don't save automatically</SelectItem>
                    {folders.filter(f => courseId === "all" || f.courseId === courseId).map(f => {
                      const c = courses.find(c => c.id === f.courseId);
                      return (
                        <SelectItem key={f.id} value={f.id}>
                          📁 {f.name} {c ? `(${c.name})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
          <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
            <Calendar className="w-5 h-5" /> Managed Sessions
          </h2>
          
          {liveClasses.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-secondary rounded-xl text-center text-muted-foreground">
              No live classes scheduled yet.
            </div>
          ) : (
            liveClasses.map(cls => (
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
                        cls.status === 'live' ? 'bg-red-500 text-foreground animate-pulse' : 
                        cls.status === 'scheduled' ? 'bg-blue-500/20 text-blue-500' : 'bg-zinc-800 text-muted-foreground'
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
                      <span className="text-muted-foreground uppercase">{cls.platform}</span>
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
                      <Button size="sm" onClick={() => updateStatus(cls.id, 'scheduled')} variant="secondary" className="w-full">
                        <RefreshCw className="w-3.5 h-3.5 mr-2" /> Re-schedule
                      </Button>
                    )}
                    
                    {cls.platform === 'rtmp' && (cls.status === 'live' || cls.status === 'scheduled') && (
                      <div className="bg-zinc-900 p-3 rounded-lg border border-primary/20 text-xs text-muted-foreground w-full mt-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate"><strong className="text-foreground">RTMP URL:</strong> {process.env.NEXT_PUBLIC_RTMP_SERVER_URL || "rtmp://localhost:1935/live"}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => navigator.clipboard.writeText(process.env.NEXT_PUBLIC_RTMP_SERVER_URL || "rtmp://localhost:1935/live")}>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate"><strong className="text-foreground">Stream Key:</strong> {cls.streamKey}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => navigator.clipboard.writeText(cls.streamKey)}>
                            <ExternalLink className="w-3 h-3" />
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
                  <Select value={editTargetFolderId} onValueChange={(val: any) => setEditTargetFolderId(val)}>
                    <SelectTrigger><SelectValue placeholder="Select Folder" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Don't save automatically</SelectItem>
                      {folders.map(f => {
                        const c = courses.find(c => c.id === f.courseId);
                        return (
                          <SelectItem key={f.id} value={f.id}>
                            📁 {f.name} {c ? `(${c.name})` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
    </div>
  );
}

