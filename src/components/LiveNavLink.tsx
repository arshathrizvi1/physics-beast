"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function LiveNavLink() {
  const [isLive, setIsLive] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/content/live?statusOnly=1');
        if (res.ok && active) {
          const data = await res.json();
          setIsLive(Boolean(data?.hasLive));
        }
      } catch {}
    };
    checkStatus();
    const timer = setInterval(checkStatus, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const isActive = pathname === "/live";

  return (
    <Link
      href="/live"
      className={`transition-all duration-200 flex items-center gap-1.5 relative ${isActive ? 'text-[#d4af37]' : 'text-foreground/90 hover:text-[#d4af37]'}`}
    >
      Live
      {isLive && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
      )}
    </Link>
  );
}
