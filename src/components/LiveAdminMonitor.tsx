"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { Eye, MessageSquare, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LiveAdminMonitor({ liveClassId }: { liveClassId: string }) {
  const [viewers, setViewers] = useState(0);
  const [chats, setChats] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // 1. Monitor Viewers
    const qPresence = query(collection(db, 'presence'), where('liveClassId', '==', liveClassId));
    const unsubPresence = onSnapshot(qPresence, (snap) => {
      const now = Date.now();
      let count = 0;
      snap.forEach(d => {
        if (now - d.data().lastActive < 45000) count++; // active in last 45s
      });
      setViewers(count);
    });

    // 2. Monitor Chats
    const qChats = query(collection(db, 'live_chats'), where('liveClassId', '==', liveClassId), orderBy('createdAt', 'desc'), limit(50));
    const unsubChats = onSnapshot(qChats, (snap) => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubPresence();
      unsubChats();
    };
  }, [liveClassId]);

  return (
    <div className="w-full mt-4">
      <div className="flex gap-2">
        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2">
          <Eye className="w-4 h-4 animate-pulse" /> {viewers} Viewers
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${expanded ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
        >
          <MessageSquare className="w-4 h-4" /> {expanded ? "Hide Chat" : "View Secret Chat"} ({chats.length})
        </button>
      </div>

      {expanded && (
        <Card className="mt-2 border-primary/30 shadow-inner bg-secondary/5 h-[300px] flex flex-col">
          <div className="p-3 border-b bg-secondary/10 flex items-center justify-between">
            <span className="text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Q&A Channel</span>
            <span className="text-xs text-muted-foreground">Only you can see this</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto flex flex-col-reverse gap-3">
            {chats.length === 0 ? (
              <div className="m-auto text-muted-foreground text-sm flex flex-col items-center gap-2 opacity-50">
                <Users className="w-8 h-8" />
                No questions asked yet.
              </div>
            ) : (
              chats.map(chat => (
                <div key={chat.id} className="bg-background border border-border p-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-primary">{chat.userName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {chat.createdAt?.toDate ? chat.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm">{chat.message}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
