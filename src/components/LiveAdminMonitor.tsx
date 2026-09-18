"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Hand, Eye, MessageSquare, Users, Maximize2, Minimize2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminLiveChat from "@/components/AdminLiveChat";

export default function LiveAdminMonitor({ liveClassId }: { liveClassId: string }) {
  const [viewers, setViewers] = useState(0);
  const [raisedHands, setRaisedHands] = useState<{userId: string, name: string}[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    // Monitor Viewers and Hands
    const qPresence = query(collection(db, 'presence'), where('liveClassId', '==', liveClassId));
    const unsubPresence = onSnapshot(qPresence, (snap) => {
      const now = Date.now();
      let count = 0;
      const hands: {userId: string, name: string}[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (now - data.lastActive < 45000) {
          count++; // active in last 45s
          if (data.handRaised) {
            hands.push({ userId: data.userId, name: data.studentName || 'Student' });
          }
        }
      });
      setViewers(count);
      setRaisedHands(hands);
    });

    return () => unsubPresence();
  }, [liveClassId]);

  const content = (
    <div className={`flex flex-col h-full w-full ${isFullScreen ? 'p-6 gap-6' : 'mt-2 gap-2'}`}>
        {/* Header / Stats row */}
        <div className="flex gap-2 items-center justify-between flex-wrap">
           <div className="flex gap-2">
             <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2">
               <Eye className="w-4 h-4 animate-pulse" /> {viewers} Viewers
             </div>
             
             <div className="relative group">
                <div className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${raisedHands.length > 0 ? 'bg-yellow-500 text-black animate-pulse' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}>
                   <Hand className="w-4 h-4" /> {raisedHands.length} Hands
                </div>
                {raisedHands.length > 0 && (
                   <div className="absolute top-full left-0 mt-2 w-56 bg-background border border-border shadow-2xl rounded-lg p-3 z-50 hidden group-hover:block transition-all">
                     <div className="text-xs font-bold text-muted-foreground mb-2">Students with hands raised:</div>
                     <ul className="text-sm space-y-1.5 max-h-64 overflow-y-auto">
                        {raisedHands.map(h => (
                           <li key={h.userId} className="flex items-center justify-between truncate bg-secondary/20 px-2 py-1.5 rounded font-medium">
                             {h.name}
                             <Button size="icon" variant="ghost" className="h-5 w-5 hover:bg-red-500/20" onClick={async () => {
                                // Lower hand from admin
                                const { doc, setDoc } = await import("firebase/firestore");
                                setDoc(doc(db, 'presence', `live_${liveClassId}_${h.userId}`), { handRaised: false }, { merge: true });
                             }}><X className="w-3.5 h-3.5 text-red-500" /></Button>
                           </li>
                        ))}
                     </ul>
                   </div>
                )}
             </div>

             {!isFullScreen && (
                <button 
                  onClick={() => setExpanded(!expanded)}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${expanded ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
                >
                  <MessageSquare className="w-4 h-4" /> {expanded ? "Hide Chat" : "Student Chat"}
                </button>
             )}
           </div>

           {(expanded || isFullScreen) && (
              <Button size="sm" variant={isFullScreen ? "default" : "outline"} onClick={() => setIsFullScreen(!isFullScreen)} className={isFullScreen ? "bg-red-600 hover:bg-red-700 font-bold" : ""}>
                {isFullScreen ? <><Minimize2 className="w-4 h-4 mr-2" /> Exit Fullscreen</> : <><Maximize2 className="w-4 h-4 mr-2" /> Fullscreen Dashboard</>}
              </Button>
           )}
        </div>

        {(expanded || isFullScreen) && (
          <Card className={`border-primary/30 shadow-inner bg-secondary/5 flex flex-col overflow-hidden ${isFullScreen ? 'flex-1 mt-4' : 'mt-2'}`}>
            <div className="p-4 border-b bg-secondary/10 flex items-center justify-between">
              <span className="text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Student Chat / QA</span>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">Students can ask questions here</span>
            </div>
            <div className={`bg-background/50 ${isFullScreen ? 'h-full flex-1 overflow-hidden flex flex-col' : ''}`}>
               <AdminLiveChat liveClassId={liveClassId} fullHeight={isFullScreen} />
            </div>
          </Card>
        )}
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md overflow-hidden flex flex-col">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full mt-4">
      {content}
    </div>
  );
}
