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
import { Settings, Video, Trash2, ExternalLink, Calendar, PlayCircle, StopCircle, RefreshCw, Copy } from "lucide-react";
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
  const [folders, setFolders] = useState<any[]>([]);
  const [allowDirectJoin, setAllowDirectJoin] = useState(true);
  const [rtmpStreamKey, setRtmpStreamKey] = useState("");
  const [rtmpServerUrl, setRtmpServerUrl] = useState("rtmp://13.60.252.104:1935/live");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editMultiStreams, setEditMultiStreams] = useState<any>(null);
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

  const handleDeleteAll = async () => {
    if (!confirm("WARNING: Are you absolutely sure you want to DELETE ALL live sessions? This cannot be undone.")) return;
    try {
      const batch = writeBatch(db);
      liveClasses.forEach(cls => {
        batch.delete(doc(db, 'live_classes', cls.id));
      });
      await batch.commit();
    } catch (e) {
      alert("Failed to delete all. " + e);
    }
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

