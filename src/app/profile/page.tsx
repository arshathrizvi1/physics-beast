"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PasskeySettings from "@/components/PasskeySettings";
import { LogOut, User, GraduationCap, Phone, MapPin, Mail, Award, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-secondary/30 border border-border rounded-xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#d4af37] overflow-hidden bg-background flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#d4af37] text-4xl font-bold">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-foreground mb-1">{user.name || 'Student'}</h1>
            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mb-4">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold uppercase tracking-wider">
                {user.role}
              </span>
              {user.studentId && (
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">
                  ID: {user.studentId}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Button onClick={logout} variant="destructive" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Details */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">Profile Details</h2>
            <div className="space-y-4 bg-secondary/10 border border-border rounded-lg p-6">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">School & Stream</p>
                  <p className="text-muted-foreground text-sm">{user.school || 'N/A'} - {user.stream || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Contact Info</p>
                  <p className="text-muted-foreground text-sm">{user.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Address</p>
                  <p className="text-muted-foreground text-sm">{user.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats & Settings */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">Stats & Security</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/10 border border-border rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <Award className="w-8 h-8 text-[#d4af37] mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">XP LEVEL</p>
                <p className="text-2xl font-bold">{user.xpLevel || 1}</p>
              </div>
              <div className="bg-secondary/10 border border-border rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <Timer className="w-8 h-8 text-[#d4af37] mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">STUDY TIME</p>
                <p className="text-2xl font-bold">{Math.round((user.totalStudyTimeMins || 0) / 60)} hrs</p>
              </div>
            </div>

            {/* Passkey Integration! */}
            <PasskeySettings />

          </div>
        </div>
      </div>
    </div>
  );
}
