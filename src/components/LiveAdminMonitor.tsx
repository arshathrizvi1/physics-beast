"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Eye, MessageSquare, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import AdminLiveChat from "@/components/AdminLiveChat";

export default function LiveAdminMonitor({ liveClassId }: { liveClassId: string }) {
  const [viewers, setViewers] = useState(0);
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

    return () => {
      unsubPresence();
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
          <MessageSquare className="w-4 h-4" /> {expanded ? "Hide Chat" : "Student Chat"}
        </button>
      </div>

      {expanded && (
        <Card className="mt-2 border-primary/30 shadow-inner bg-secondary/5 flex flex-col">
          <div className="p-3 border-b bg-secondary/10 flex items-center justify-between">
            <span className="text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Student Chat / QA</span>
            <span className="text-xs text-muted-foreground">Students can ask questions here</span>
          </div>
          <AdminLiveChat liveClassId={liveClassId} />
        </Card>
      )}
    </div>
  );
}
