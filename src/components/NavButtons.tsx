"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function NavButtons() {
  const { user, logout } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-4 shrink-0">
        <Link 
          href={user.role === 'admin' || user.role === 'teacher' ? "/admin" : "/login"} 
          className="text-xs md:text-sm text-[#d4af37] font-bold hover:text-[#b5952f] transition-colors whitespace-nowrap"
        >
          {user.role === 'admin' ? 'Admin Dashboard' : user.role === 'teacher' ? 'Teacher Dashboard' : 'My Profile'}
        </Link>
        <Button 
          onClick={logout} 
          className="bg-secondary text-foreground hover:bg-zinc-800 border border-border rounded-lg whitespace-nowrap h-9 px-4 text-xs md:text-sm font-semibold transition-colors shadow-none"
        >
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
      Login
    </Link>
  );
}

