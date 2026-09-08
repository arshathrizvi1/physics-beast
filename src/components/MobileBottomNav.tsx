"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Home, BookOpen, FileText, Video } from "lucide-react";

export function MobileBottomNav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Hide on admin routes or auth routes
  if (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/signup' || pathname === '/teacher-signup') {
    return null;
  }

  // Only show if loading finishes and user exists (allow both student role or default logged in user)
  if (loading) {
    return null;
  }

  if (user && user.role && user.role !== 'student') {
    return null;
  }

  const links = [
    { name: "Home", href: "/", icon: Home },
    { name: "Courses", href: "/courses", icon: BookOpen },
    { name: "Exams", href: "/exams", icon: FileText },
    { name: "Live", href: "/live", icon: Video },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-50 pointer-events-auto">
      <div className="bg-[#1a1a1a] border border-white/10 backdrop-blur-xl shadow-2xl rounded-[32px] flex items-center justify-between px-2 py-1.5 h-16 max-w-md mx-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className="flex-1 flex justify-center items-center h-full"
            >
              <div 
                className={`flex flex-col items-center justify-center w-[72px] h-[64px] rounded-3xl transition-all duration-300 ${
                  isActive 
                    ? "bg-[#ffc107] text-black shadow-[0_0_20px_rgba(255,193,7,0.3)]" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <link.icon className={`w-5 h-5 mb-1 ${isActive ? "fill-current" : ""}`} />
                <span className={`text-[10px] font-semibold ${isActive ? "text-black" : ""}`}>
                  {link.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

