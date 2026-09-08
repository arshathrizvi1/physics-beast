"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);
  
  useEffect(() => {
    if (loading) return;
    
    // Non-admins/teachers shouldn't be here
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      router.replace("/");
      return;
    }

    // Check if 2FA passed for this session
    const passed2FA = sessionStorage.getItem("admin_2fa_passed") === "true";
    
    // Teachers do NOT require 2FA by default unless they have explicitly configured a totpSecret
    const isTeacherWithout2FA = user.role === "teacher" && !user.totpSecret;

    // If they haven't passed 2FA and 2FA is required for their role/account, kick them to 2FA page
    if (!passed2FA && !isTeacherWithout2FA && pathname !== "/admin/2fa") {
      router.replace("/admin/2fa");
    } else {
      setIsVerified(true);
    }
  }, [user, loading, router, pathname]);

  // Don't render the protected admin pages until we verify they passed 2FA
  // (unless they are explicitly trying to view the 2FA page itself)
  if (!isVerified && pathname !== "/admin/2fa") {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <p className="animate-pulse text-primary font-bold">Securing session...</p>
      </div>
    );
  }

  return <>{children}</>;
}
