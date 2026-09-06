"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Home, BookOpen, FileText } from "lucide-react";

export function MobileBottomNav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Only show for logged in students
  if (loading || !user || user.role !== 'student') {
    return null;
  }

  // Hide on admin routes or auth routes just in case
  if (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const links = [
    { name: "Home", href: "/", icon: Home },
    { name: "Courses", href: "/courses", icon: BookOpen },
    { name: "Exams", href: "/exams", icon: FileText },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-[#d4af37]" : "text-zinc-500 hover:text-foreground/90"
              }`}
            >
              <link.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" : ""}`} />
              <span className="text-[10px] font-medium tracking-wide">
                {link.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

