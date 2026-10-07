"use client";

import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FullscreenShell from '@/components/FullscreenShell';

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
        const docSnap = await getDoc(doc(db, 'live_classes', params.id));
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
      <FullscreenShell>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      </FullscreenShell>
    );
  }

  if (!classData || classData.status !== 'live') {
    return (
      <FullscreenShell>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Class is not active</h1>
          <Button onClick={() => router.push('/live')} variant="outline" className="text-black">
            Back to Live Classes
          </Button>
        </div>
      </FullscreenShell>
    );
  }

  return (
    <FullscreenShell>
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <h1 className="truncate text-sm font-bold">{classData.title}</h1>
        <span className="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold uppercase text-red-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500"></span> Live
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <LiveKitPlayer roomName={classData.id} user={user} />
        </div>
      </div>
    </FullscreenShell>
  );
}
