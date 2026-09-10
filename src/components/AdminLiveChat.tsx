"use client";
import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Reply, Check, X, Paperclip, FileIcon, ImageIcon, ExternalLink } from "lucide-react";

export default function AdminLiveChat({ liveClassId, fullHeight }: { liveClassId: string, fullHeight?: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!liveClassId) return;
    const q = query(collection(db, 'live_chats'), where('liveClassId', '==', liveClassId));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setMessages(msgs);
    });
    return () => unsub();
  }, [liveClassId]);

  const sendReply = async (msgId: string) => {
    if (!replyText.trim() && !attachment) return;
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

      await updateDoc(doc(db, 'live_chats', msgId), {
        replies: arrayUnion({
          text: replyText.trim(),
          attachmentBase64,
          attachmentName,
          attachmentType,
          timestamp: Date.now()
        })
      });
      setReplyText("");
      setAttachment(null);
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send reply");
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
      <div className="mt-2 bg-secondary/30 p-2 rounded flex items-center gap-3 border border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => handleViewAttachment(url)}>
        {type === 'image' ? (
          <div className="w-8 h-8 rounded bg-black flex-shrink-0 overflow-hidden relative border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary border border-primary/20">
            <FileIcon className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" title={name}>{name}</p>
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
      </div>
    );
  };

  if (messages.length === 0) return <div className="text-sm text-muted-foreground p-4 flex-1">No questions asked yet.</div>;

  return (
    <div className={`flex flex-col gap-3 overflow-y-auto p-2 ${fullHeight ? 'flex-1 h-full' : 'max-h-[400px]'}`}>
      {messages.map(msg => (
        <div key={msg.id} className="bg-secondary/20 p-3 rounded-md text-sm border border-border/50">
          <div className="flex justify-between items-start mb-1">
            <div className="font-bold text-primary flex items-center gap-2">
              {msg.userName}
              <span className="text-[10px] text-muted-foreground font-normal">
                {msg.createdAt ? new Date(msg.createdAt.toMillis()).toLocaleTimeString() : ''}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => { setReplyingTo(msg.id); setAttachment(null); setReplyText(""); }}>
              <Reply className="w-4 h-4" />
            </Button>
          </div>
          {msg.message && <p className="text-foreground/90">{msg.message}</p>}
          {msg.attachmentBase64 && renderAttachment(msg.attachmentBase64, msg.attachmentName, msg.attachmentType)}
          
          {msg.replies && msg.replies.length > 0 && (
            <div className="mt-2 pl-3 border-l-2 border-primary/50 space-y-2">
              {msg.replies.map((r: any, i: number) => (
                <div key={i} className="text-primary font-semibold text-xs bg-primary/10 p-2 rounded">
                  Admin: <span className="font-normal text-foreground/80">{r.text}</span>
                  {r.attachmentBase64 && renderAttachment(r.attachmentBase64, r.attachmentName, r.attachmentType)}
                </div>
              ))}
            </div>
          )}

          {replyingTo === msg.id && (
            <div className="mt-3 flex flex-col gap-2">
              {attachment && (
                <div className="flex items-center justify-between bg-primary/10 p-1.5 rounded text-xs border border-primary/20">
                  <div className="flex items-center gap-2 truncate">
                    {attachment.type.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileIcon className="w-3 h-3" />}
                    <span className="truncate">{attachment.name}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => setAttachment(null)}><X className="w-3 h-3" /></Button>
                </div>
              )}
              <div className="flex gap-1 items-center relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input 
                  autoFocus
                  className="h-8 text-sm flex-1" 
                  placeholder="Type your reply..." 
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendReply(msg.id); }}
                  disabled={sending}
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => sendReply(msg.id)} disabled={(!replyText.trim() && !attachment) || sending}>
                  {sending ? <span className="animate-spin text-[10px]">...</span> : <Check className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setReplyingTo(null)} disabled={sending}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
