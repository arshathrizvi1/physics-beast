"use client";

import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LiveKitPlayer = dynamic(() => import('@/components/LiveKitPlayer'), { ssr: false });

export default function AdminStudio({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classData, setClassData] = useState<any>(null);
  const [loadingClass, setLoadingClass] = useState(true);

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'admin' && user.role !== 'teacher'))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const docRef = doc(db, 'live_classes', params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setClassData({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingClass(false);
      }
    };
    if (user && (user.role === 'admin' || user.role === 'teacher')) {
      fetchClass();
    }
  }, [params.id, user]);

  if (loading || loadingClass) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-white gap-4">
        <h1 className="text-2xl font-bold">Class not found</h1>
        <Button onClick={() => router.push('/admin/live')} variant="outline">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-white">
      {/* Studio Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/live')} className="hover:bg-zinc-800 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-500" /> WebRTC Broadcasting Studio
            </h1>
            <p className="text-sm text-zinc-400">Class: {classData.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-bold uppercase bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> Live Server Active
          </span>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="flex-1 p-6 flex flex-col">
        <div className="flex-1 w-full max-w-7xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-black relative">
          <LiveKitPlayer 
            roomName={classData.id} 
            user={user} 
            isAdmin={true} 
          />
        </div>
        
        {/* Helper Instructions below player */}
        <div className="max-w-7xl mx-auto w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <h3 className="font-bold text-emerald-400 mb-1">Camera & Mic</h3>
            <p className="text-sm text-zinc-400">Use the controls inside the video player above to enable your camera and microphone. Students will see you instantly.</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <h3 className="font-bold text-blue-400 mb-1">Screen Share</h3>
            <p className="text-sm text-zinc-400">Click the screen icon in the control bar to share your presentation or entire screen with the class.</p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <h3 className="font-bold text-red-400 mb-1">Ending the Class</h3>
            <p className="text-sm text-zinc-400">When finished, leave the room using the red phone button, then return to the Admin Panel to mark the session as Ended.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
