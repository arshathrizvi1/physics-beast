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
    { 
      name: "Home", 
      href: "/", 
      icon: Home,
      isActive: pathname === "/" 
    },
    { 
      name: "Study", 
      href: "/courses", 
      icon: BookOpen,
      isActive: pathname === "/courses" || pathname.startsWith("/course/") 
    },
    { 
      name: "Exams", 
      href: "/exams", 
      icon: FileText,
      isActive: pathname.startsWith("/exam") 
    },
    { 
      name: "Live", 
      href: "/live", 
      icon: Video,
      isActive: pathname.startsWith("/live") 
    },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-auto">
      <div className="bg-[#1a1a1a]/95 border border-white/10 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] rounded-[32px] flex items-center justify-between px-2.5 py-1.5 h-[68px] max-w-sm mx-auto">
        {links.map((link) => {
          const isActive = link.isActive;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className="flex-1 flex justify-center items-center h-full"
            >
              <div 
                className={`flex flex-col items-center justify-center w-full max-w-[76px] h-[54px] rounded-[22px] transition-all duration-300 ${
                  isActive 
                    ? "bg-[#F5BF42] text-black shadow-[0_4px_20px_rgba(245,191,66,0.35)]" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <link.icon 
                  className={`w-5 h-5 mb-0.5 ${isActive ? "text-black stroke-[2.4px]" : "stroke-[1.8px]"}`} 
                />
                <span className={`text-[10px] ${isActive ? "font-bold text-black" : "font-medium"}`}>
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

