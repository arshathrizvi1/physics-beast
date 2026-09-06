"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function NavButtons() {
  const { user, logout } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <Link 
          href={user.role === 'admin' || user.role === 'teacher' ? "/admin" : "/login"} 
          className="text-sm text-primary font-bold hover:underline"
        >
          {user.role === 'admin' ? 'Admin Dashboard' : user.role === 'teacher' ? 'Teacher Dashboard' : 'My Profile'}
        </Link>
        <Button variant="outline" onClick={logout}>
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
