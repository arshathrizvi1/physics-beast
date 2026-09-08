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
      name: "Exam", 
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
      <div className="bg-black border border-[#C0C0C0]/20 shadow-[0_8px_32px_rgba(0,0,0,0.9)] rounded-[32px] flex items-center justify-between px-2 py-1.5 h-16 max-w-md mx-auto">
        {links.map((link) => {
          const isActive = link.isActive;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className="flex-1 flex justify-center items-center h-full"
            >
              <div 
                className={`flex flex-col items-center justify-center w-[72px] h-[58px] rounded-[24px] transition-all duration-300 ${
                  isActive 
                    ? "bg-gradient-to-tr from-[#FFD700] to-[#FDB931] text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]" 
                    : "text-[#C0C0C0] hover:text-white"
                }`}
              >
                <link.icon 
                  className={`w-5 h-5 mb-1 ${isActive ? "fill-black/10 stroke-[2.5px]" : "stroke-[2px]"}`} 
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

