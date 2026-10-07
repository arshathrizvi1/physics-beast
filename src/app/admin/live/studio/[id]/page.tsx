"use client";

import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FullscreenShell from '@/components/FullscreenShell';

const LiveKitPlayer = dynamic(() => import('@/components/LiveKitPlayer'), { ssr: false });

export default function AdminStudio(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classData, setClassData] = useState<any>(null);
  const [loadingClass, setLoadingClass] = useState(true);

  const allowed = !!user && (user.role === 'admin' || user.role === 'teacher');

  useEffect(() => {
    if (!loading && !allowed) {
      router.push('/login');
    }
  }, [allowed, loading, router]);

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
    if (allowed && params.id) {
      fetchClass();
    }
  }, [params.id, allowed]);

  if (loading || loadingClass) {
    return (
      <FullscreenShell>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      </FullscreenShell>
    );
  }

  if (!classData) {
    return (
      <FullscreenShell>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Class not found</h1>
          <Button onClick={() => router.push('/admin/live')} variant="outline" className="text-black">
            Go Back
          </Button>
        </div>
      </FullscreenShell>
    );
  }

  return (
    <FullscreenShell>
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/live')}
            className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-base font-bold">
              <Video className="h-4 w-4 text-emerald-500" /> Broadcasting Studio
            </h1>
            <p className="truncate text-xs text-zinc-400">{classData.title}</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold uppercase text-red-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500"></span> Live
        </span>
      </header>

      <main className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <LiveKitPlayer roomName={classData.id} user={user} isAdmin />
        </div>
      </main>
    </FullscreenShell>
  );
}
