"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2 } from "lucide-react";

export default function LiveChat({ liveClassId }: { liveClassId: string }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sentMsg, setSentMsg] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'live_chats'), {
        liveClassId,
        userId: user.uid,
        userName: user.name || user.email?.split('@')[0] || "Student",
        userAvatar: user.photoUrl || null,
        message: message.trim(),
        createdAt: serverTimestamp()
      });
      setMessage("");
      setSentMsg(true);
      setTimeout(() => setSentMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-secondary/10 border-t border-border/50">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        Ask the Teacher 
        <span className="text-xs font-normal text-muted-foreground border border-border/50 bg-background px-2 py-0.5 rounded-full">Only Admin can see this</span>
      </h3>
      <form onSubmit={handleSend} className="flex gap-2 relative">
        <Input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Type your question here..." 
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={!message.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
        {sentMsg && (
          <div className="absolute right-14 top-1.5 text-green-500 flex items-center gap-1 text-sm font-bold bg-background/90 px-2 py-1 rounded shadow backdrop-blur animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4" /> Sent securely
          </div>
        )}
      </form>
    </div>
  );
}
