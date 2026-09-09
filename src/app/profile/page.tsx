"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Camera, CheckCircle2, Save, GraduationCap, MapPin, Phone } from "lucide-react";
import PasskeySettings from "@/components/PasskeySettings";
import { useRouter } from "next/navigation";

export default function StudentProfilePage() {
  const { user, loading, updateProfileName, updateProfilePicture } = useAuth();
  const router = useRouter();

  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSchool, setProfileSchool] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePhone(user.phone || "");
      setProfileSchool(user.school || "");
      setProfileAddress(user.address || "");
    }
  }, [user]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setProfilePhotoUploading(true);
    try {
      if (updateProfilePicture) {
        await updateProfilePicture(file);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload photo");
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: profileName,
        phone: profilePhone,
        school: profileSchool,
        address: profileAddress
      });
      if (profileName !== user.name && updateProfileName) {
        await updateProfileName(profileName);
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <Card className="border-primary/50 shadow-md max-w-2xl mx-auto">
          <CardHeader className="bg-primary/5 border-b border-primary/20">
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Camera className="w-5 h-5" /> My Profile
            </CardTitle>
            <CardDescription>
              Update your personal details and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">

            {/* Profile Photo Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover border-4 border-primary/40 shadow-lg"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-bold text-primary">
                      {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Upload overlay */}
                <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {profilePhotoUploading ? (
                    <span className="text-foreground text-xs font-bold animate-pulse">Uploading...</span>
                  ) : (
                    <div className="flex flex-col items-center text-foreground">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-xs font-semibold">Change</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={profilePhotoUploading}
                    onChange={handleProfilePhotoUpload}
                  />
                </label>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{user?.name || "No name set"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-bold bg-primary/20 text-primary uppercase tracking-wider">
                  {user?.role || "Student"}
                </span>
                {user?.studentId && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">ID: {user.studentId}</p>
                )}
              </div>
            </div>

            {/* Edit Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="Your full name"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-muted-foreground"/> Phone Number</Label>
                <Input
                  type="number"
                  placeholder="+94 7X XXX XXXX"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-muted-foreground"/> School</Label>
                <Input
                  placeholder="Your school name"
                  value={profileSchool}
                  onChange={e => setProfileSchool(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-muted-foreground"/> Address</Label>
                <Input
                  placeholder="Your address"
                  value={profileAddress}
                  onChange={e => setProfileAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 bg-secondary/5 py-4 justify-end gap-3">
            {profileSuccess && (
              <span className="flex items-center gap-1.5 text-green-500 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" /> Profile saved!
              </span>
            )}
            <Button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="gap-2 min-w-[140px]"
            >
              {profileSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save Profile</>}
            </Button>
          </CardFooter>
        </Card>

        <div className="max-w-2xl mx-auto mt-6">
          <PasskeySettings />
        </div>

      </div>
    </div>
  );
}
