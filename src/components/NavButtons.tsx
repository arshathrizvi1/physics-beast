"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function NavButtons() {
  const { user, logout } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <Link 
          href={user.role === 'admin' || user.role === 'teacher' ? "/admin" : "/login"} 
          className="text-xs md:text-sm text-primary font-bold hover:underline whitespace-nowrap"
        >
          {user.role === 'admin' ? 'Admin Dashboard' : user.role === 'teacher' ? 'Teacher Dashboard' : 'My Profile'}
        </Link>
        <Button variant="outline" size="sm" onClick={logout} className="whitespace-nowrap h-8 px-2 md:px-4 text-xs md:text-sm">
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
