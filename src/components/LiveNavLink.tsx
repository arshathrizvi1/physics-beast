"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { usePathname } from "next/navigation";

export default function LiveNavLink() {
  const [isLive, setIsLive] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const q = query(collection(db, 'live_classes'), where('status', '==', 'live'));
    const unsub = onSnapshot(q, (snap) => {
      setIsLive(!snap.empty);
    }, (err) => {
      console.log("Could not fetch live status", err);
    });
    return () => unsub();
  }, []);

  const isActive = pathname === "/live";

  return (
    <Link 
      href="/live" 
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 relative ${isActive ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-zinc-400 hover:text-[#d4af37] hover:bg-[#d4af37]/10'}`}
    >
      Live 
      {isLive && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
      )}
    </Link>
  );
}
