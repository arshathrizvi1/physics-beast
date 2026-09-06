"use client";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2, Paperclip, X, FileIcon, ImageIcon, ExternalLink } from "lucide-react";

export default function LiveChat({ liveClassId }: { liveClassId: string }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sentMsg, setSentMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!liveClassId || !user) return;
    const q = query(
      collection(db, 'live_chats'), 
      where('liveClassId', '==', liveClassId),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setHistory(msgs);
    });
    return () => unsub();
  }, [liveClassId, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !attachment) || !user) return;
    setSending(true);
    try {
      let attachmentBase64 = null;
      let attachmentName = null;
      let attachmentType = null;

      if (attachment) {
        attachmentName = attachment.name;
        attachmentType = attachment.type.startsWith('image/') ? 'image' : 'file';

        if (attachmentType === 'file') {
          if (attachment.size > 800 * 1024) {
            alert("File is too large (max 800KB). Please upload a smaller file.");
            setSending(false);
            return;
          }
          attachmentBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(attachment);
          });
        } else {
          attachmentBase64 = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(attachment);
            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              const MAX = 800;
              let { width, height } = img;
              if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
            img.src = objectUrl;
          });
        }
      }

      await addDoc(collection(db, 'live_chats'), {
        liveClassId,
        userId: user.uid,
        userName: user.name || user.email?.split('@')[0] || "Student",
        userAvatar: user.photoUrl || null,
        message: message.trim(),
        attachmentBase64,
        attachmentName,
        attachmentType,
        createdAt: serverTimestamp()
      });
      setMessage("");
      setAttachment(null);
      setSentMsg(true);
      setTimeout(() => setSentMsg(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleViewAttachment = (url: string) => {
    if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const renderAttachment = (url: string, name: string, type: string) => {
    if (!url) return null;
    return (
      <div className="mt-2 bg-secondary/20 p-2 rounded flex items-center gap-3 border border-border/50 max-w-sm cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => handleViewAttachment(url)}>
        {type === 'image' ? (
          <div className="w-10 h-10 rounded bg-black flex-shrink-0 overflow-hidden relative border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary border border-primary/20">
            <FileIcon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" title={name}>{name}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">Click to view <ExternalLink className="w-3 h-3" /></p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-secondary/10 border-t border-border/50 h-full max-h-[500px]">
      <div className="p-4 border-b border-border/50">
        <h3 className="text-sm font-bold flex items-center gap-2">
          Ask the Teacher 
          <span className="text-xs font-normal text-muted-foreground border border-border/50 bg-background px-2 py-0.5 rounded-full">Only Admin can see this</span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-4">No questions asked yet. Type below to ask!</p>
        ) : (
          history.map(msg => (
            <div key={msg.id} className="bg-background border border-border/50 rounded-lg p-3 text-sm">
              <div className="font-semibold text-primary mb-1">You <span className="text-[10px] text-muted-foreground font-normal ml-2">{msg.createdAt ? new Date(msg.createdAt.toMillis()).toLocaleTimeString() : ''}</span></div>
              {msg.message && <p className="text-foreground/90">{msg.message}</p>}
              
              {msg.attachmentBase64 && renderAttachment(msg.attachmentBase64, msg.attachmentName, msg.attachmentType)}
              
              {msg.replies && msg.replies.length > 0 && (
                <div className="mt-3 pl-3 border-l-2 border-green-500/50 space-y-2">
                  {msg.replies.map((r: any, i: number) => (
                    <div key={i} className="text-green-500 font-bold text-xs bg-green-500/10 p-2 rounded">
                      Teacher: <span className="font-normal text-foreground/90">{r.text}</span>
                      {r.attachmentBase64 && renderAttachment(r.attachmentBase64, r.attachmentName, r.attachmentType)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-background border-t border-border/50">
        {attachment && (
          <div className="mb-2 p-2 bg-secondary/20 rounded flex items-center justify-between border border-border/50">
            <div className="flex items-center gap-2 truncate text-xs font-medium">
              {attachment.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileIcon className="w-4 h-4 text-primary" />}
              <span className="truncate">{attachment.name}</span>
            </div>
            <Button size="icon" variant="ghost" className="h-5 w-5 rounded-full" onClick={() => setAttachment(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type your question..." 
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={(!message.trim() && !attachment) || sending}>
            {sending ? <span className="animate-spin text-xs">...</span> : <Send className="w-4 h-4" />}
          </Button>
          {sentMsg && (
            <div className="absolute right-14 top-[-30px] text-green-500 flex items-center gap-1 text-sm font-bold bg-background/90 px-2 py-1 rounded shadow border border-green-500/20 backdrop-blur animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-4 h-4" /> Sent
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
