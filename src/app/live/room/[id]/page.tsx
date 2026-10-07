"use client";

import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LiveKitPlayer = dynamic(() => import('@/components/LiveKitPlayer'), { ssr: false });

export default function StudentFullScreenRoom(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classData, setClassData] = useState<any>(null);
  const [loadingClass, setLoadingClass] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
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
    if (user && params.id) {
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

  if (!classData || classData.status !== 'live') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-white gap-4">
        <h1 className="text-2xl font-bold">Class is not active</h1>
        <Button onClick={() => window.close()} variant="outline">Close Tab</Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black overflow-hidden flex flex-col">
      <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center text-white shrink-0">
        <h1 className="font-bold">{classData.title}</h1>
        <Button variant="destructive" size="sm" onClick={() => window.close()}>Leave Class</Button>
      </div>
      <div className="flex-1 w-full relative">
        <LiveKitPlayer 
          roomName={classData.id} 
          user={user} 
          isAdmin={user.role === 'admin' || user.role === 'teacher'} 
        />
      </div>
    </div>
  );
}
