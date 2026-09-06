"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDescription, setEditDescription] = useState("");
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
      unsubLive();
    };
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !link || !scheduledFor) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'live_classes'), {
        title,
        description,
        platform,
        link,
        scheduledFor: new Date(scheduledFor).getTime(),
        courseId: courseId === "all" ? null : courseId,
        batchId: batchId === "all" ? null : batchId,
        status: 'scheduled',
        createdAt: serverTimestamp()
      });
      
      setTitle("");
      setDescription("");
      setLink("");
      setScheduledFor("");
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
        link: editLink
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
              <CardTitle>Schedule Broadcast</CardTitle>
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
                  <Select value={platform} onValueChange={(val: any) => setPlatform(val as any)}>
                  <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube Live (Embeds Native)</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="meet">Google Meet</SelectItem>
                    <SelectItem value="other">Other Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Live Link *</Label>
                <Input value={link} onChange={e => setLink(e.target.value)} required type="url" />
              </div>
              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} required type="datetime-local" />
              </div>
            </CardContent>
            <CardFooter className="bg-secondary/5 border-t border-border/50 py-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Scheduling..." : "Schedule Class"}
              </Button>
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
                        cls.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                        cls.status === 'scheduled' ? 'bg-blue-500/20 text-blue-500' : 'bg-zinc-800 text-zinc-400'
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
                    {cls.status === 'scheduled' && (
                      <Button size="sm" onClick={() => updateStatus(cls.id, 'live')} className="bg-red-600 hover:bg-red-700 text-white w-full">
                        <PlayCircle className="w-4 h-4 mr-2" /> GO LIVE
                      </Button>
                    )}
                    {cls.status === 'live' && (
                      <Button size="sm" onClick={() => updateStatus(cls.id, 'ended')} variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white w-full">
                        <StopCircle className="w-4 h-4 mr-2" /> End Broadcast
                      </Button>
                    )}
                    {cls.status === 'ended' && (
                      <Button size="sm" onClick={() => updateStatus(cls.id, 'scheduled')} variant="secondary" className="w-full">
                        <RefreshCw className="w-3.5 h-3.5 mr-2" /> Re-schedule
                      </Button>
                    )}
                    
                    <div className="flex gap-2 w-full">
                      <a href={cls.link} target="_blank" rel="noreferrer" className="flex-1">
                        <Button size="sm" variant="outline" className="w-full h-8"><ExternalLink className="w-3 h-3 mr-1"/> Test</Button>
                      </a>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingClass(cls);
                        setEditTitle(cls.title);
                        setEditDescription(cls.description || "");
                        setEditLink(cls.link);
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
      {editingClass && (
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
