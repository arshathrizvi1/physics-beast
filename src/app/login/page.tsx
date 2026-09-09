"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { AlertCircle, Flame, Clock, Target, Award, BookOpen, ChevronRight, CheckCircle2, XCircle, Edit2, Check, FileText, Sparkles, Zap, Timer, ShieldAlert, Eye, EyeOff, Loader2, Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { formatSeconds, calculateXpLevel } from "@/lib/xp";
import ReportIssueModal from "@/components/ReportIssueModal";
import PasskeySettings from "@/components/PasskeySettings";

export default function LoginPage() {
  const { user, loading, login, signup, updateProfilePicture, updateProfileName, resetPassword, logout, googleSignIn, completeGoogleSignup, loginWithCustomToken } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [nicNumber, setNicNumber] = useState("");
  const [nicFile, setNicFile] = useState<File | null>(null);
  
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [gender, setGender] = useState("");
  const [stream, setStream] = useState("");
  
  const [batches, setBatches] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  
  const [isUploadingPfp, setIsUploadingPfp] = useState(false);
  const [error, setError] = useState("");
  const [resetSuccessEmail, setResetSuccessEmail] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isGoogleSignupForm, setIsGoogleSignupForm] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          setIsWebAuthnSupported(true);
          return;
        }
      } catch (e) {}

      if (typeof window !== 'undefined' && !!(window.PublicKeyCredential || (window.navigator && window.navigator.credentials))) {
        setIsWebAuthnSupported(true);
      }
    };
    checkSupport();
  }, []);

  // Real Student Dashboard Stats
  const studyMins = user?.totalStudyTimeMins || 0;
  const studyHours = Math.floor(studyMins / 60);
  const studyRemainingMins = studyMins % 60;
  const studyTimeString = studyHours > 0 ? `${studyHours}h ${studyRemainingMins}m` : `${studyRemainingMins}m`;

  let todayMins = 0;
  if (user?.lastStudyDate === new Date().toISOString().split('T')[0]) {
    todayMins = (user as any).todayStudyTimeMins || 0;
  }
  const todayHours = Math.floor(todayMins / 60);
  const todayRemainingMins = todayMins % 60;
  const todayStudyTimeString = todayHours > 0 ? `${todayHours}h ${todayRemainingMins}m` : `${todayRemainingMins}m`;

  const stats = {
    streakDays: user?.streakDays || 0,
    studyTimeString,
    todayStudyTimeString,
    averageGrade: user?.averageGrade || 0,
    examsDone: user?.examsDone || 0,
    examsMissed: user?.examsMissed || 0,
    xpLevel: user?.xpLevel || 1,
    totalXp: user?.totalXp || 0
  };

  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [fetchingExams, setFetchingExams] = useState(true);
  const [showStudyHistoryModal, setShowStudyHistoryModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'teacher') {
      router.push('/admin');
    }

    // Fetch real exam history for student
    if (user && user.role === 'student') {
      const fetchExamHistory = async () => {
        try {
          const q = query(collection(db, 'examResults'), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Sort by timestamp descending (since we can't easily orderBy on a different field than where without an index)
          results.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
          
          setExamHistory(results);
        } catch (err) {
          console.error("Failed to fetch exam history", err);
        } finally {
          setFetchingExams(false);
        }
      };
      fetchExamHistory();
    } else {
      setFetchingExams(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!isLogin || isGoogleSignupForm) {
      const fetchBatches = async () => {
        try {
          const snapshot = await getDocs(query(collection(db, 'batches'), orderBy('createdAt', 'desc')));
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setBatches(data);
          if (data.length > 0 && graduationYear === "2026") {
            setGraduationYear(data[0].year);
          }
        } catch (e) {
          console.error("Failed to fetch batches", e);
        }
      };
      
      const fetchStreams = async () => {
        try {
          const snapshot = await getDocs(query(collection(db, 'streams'), orderBy('createdAt', 'desc')));
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          setStreams(data);
          if (data.length > 0 && !stream) {
            setStream(data[0].name);
          }
        } catch (e) {
          console.error("Failed to fetch streams", e);
        }
      };
      
      fetchBatches();
      fetchStreams();
    }
  }, [isLogin, isGoogleSignupForm]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse text-xl text-primary font-bold">Authenticating...</p>
      </div>
    );
  }

  const handlePasskeyLogin = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const resp = await fetch('/api/passkey/generate-auth-options', { method: 'POST' });
      let data;
      try {
        data = await resp.json();
      } catch (e) {
        throw new Error(`Server returned status ${resp.status}`);
      }
      if (!resp.ok || !data?.options) {
        throw new Error(data?.error || "Could not generate passkey options");
      }

      const { options, challengeId } = data;
      const authResp = await startAuthentication(options);

      const verificationResp = await fetch('/api/passkey/verify-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResp, challengeId }),
      });

      let verificationResult;
      try {
        verificationResult = await verificationResp.json();
      } catch (e) {
        throw new Error(`Verification service returned status ${verificationResp.status}`);
      }

      if (verificationResp.ok && verificationResult.verified && verificationResult.customToken) {
        const success = await loginWithCustomToken(verificationResult.customToken);
        if (!success) {
          throw new Error("Failed to authenticate with passkey token.");
        }
      } else {
        throw new Error(verificationResult?.error || "Passkey verification failed.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Passkey login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email or Student ID first to reset your password.");
      setResetSuccessEmail(null);
      return;
    }
    setError("");
    setResetSuccessEmail(null);
    setIsResetting(true);

    try {
      const res = await resetPassword(email);
      if (res.success && res.email) {
        setResetSuccessEmail(res.email);
        setError("");
        alert(`Password reset link sent to ${res.email}!\n\nPlease check your Inbox.\n\n⚠️ IMPORTANT: If you do not see the email in your Inbox within a few minutes, please check your Spam / Junk mail folder!`);
      } else {
        setError(res.error || "Failed to send reset email. Make sure the email is correct.");
      }
    } catch (err: any) {
      setError("Failed to send reset email. Make sure the email is correct.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setPhoneError("");
    setIsSubmitting(true);
    try {
      const res = await googleSignIn();
      if (res.success) {
        if (res.isNewUser) {
          if (isLogin) {
            // Student tried to LOGIN with Google but has no account yet
            // Sign them out of Firebase Auth since they aren't registered
            await logout();
            setError("This Google account hasn't been registered yet. Please sign up first to create your account.");
          } else {
            // Student is on the signup page — show the extended form
            setIsGoogleSignupForm(true);
            if (res.googleUser?.email) setEmail(res.googleUser.email);
            if (res.googleUser?.name) setName(res.googleUser.name);
            setPassword("");
          }
        } else {
          // Existing user — dashboard handles the view
        }
      } else {
        if (res.error?.includes('auth/popup-closed-by-user')) {
           setError("Google sign-in was cancelled.");
        } else {
           setError(res.error || "Google sign-in failed.");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred during Google sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneError("");
    setIsSubmitting(true);
    
    let success = false;
    try {
      if (isLogin) {
        success = await login(email, password);
      } else {
        // Validate all required fields before submitting
        const missingFields: string[] = [];
        if (!name.trim()) missingFields.push("Full Name");
        if (!dob.trim()) missingFields.push("Date of Birth");
        if (!school.trim()) missingFields.push("School");
        if (!gender) missingFields.push("Gender");
        if (!stream) missingFields.push("Stream");
        if (!address.trim()) missingFields.push("Address");
        if (!phone.trim()) missingFields.push("Your Phone Number");
        if (!parentPhone.trim()) missingFields.push("Parent's Phone Number");
        if (!nicNumber.trim()) missingFields.push("NIC Number");
        if (!nicFile) missingFields.push("NIC Image");
        if (!email.trim()) missingFields.push("Email");
        if (!password.trim()) missingFields.push("Password");

        if (missingFields.length > 0) {
          setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
          setIsSubmitting(false);
          return;
        }

        if (phone.trim() === parentPhone.trim()) {
          setError("Your Phone and Parent's Phone cannot be the same number.");
          setIsSubmitting(false);
          return;
        }
        const profileData = { name, dob, school, gender, stream, graduationYear, address, phone, parentPhone, nicNumber };
        if (isGoogleSignupForm) {
          success = await completeGoogleSignup(profileData, nicFile, password);
        } else {
          success = await signup(email, password, profileData, nicFile);
        }
      }
      
      if (!success) {
        setError(isLogin ? "Invalid student email or password" : "Failed to create account. Email may be in use.");
        setIsSubmitting(false);
      } else if (!isLogin) {
        // Successfully signed up!
        alert("Account created successfully! Your account is pending admin approval. You can log in once approved.");
        await logout();
        setIsLogin(true);
        setIsGoogleSignupForm(false);
        // Clear form
        setEmail("");
        setPassword("");
        setIsSubmitting(false);
      }
      // If success && isLogin, we intentionally leave isSubmitting=true so the button keeps spinning 
      // until the AuthContext fires and flips the UI to the dashboard.
    } catch (err: any) {
      if (err.message === "PHONE_DUPLICATE") {
        setPhoneError("This number has already been used.");
      } else {
        setError("Failed to create account.");
      }
      setIsSubmitting(false);
    }
  };



  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingPfp(true);
      const success = await updateProfilePicture(e.target.files[0]);
      if (!success) {
        alert("Failed to upload profile picture. Ensure the image is valid and try again.");
      }
      setIsUploadingPfp(false);
    }
  };

  if (user) {
    if (user.role === 'admin' || user.role === 'teacher') {
      return (
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="animate-pulse text-xl text-primary font-bold">
            Redirecting to {user.role === 'admin' ? 'Admin' : 'Teacher'} Dashboard...
          </p>
        </div>
      );
    }

    if (user.isApproved === false) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center">
          <Card className="w-full max-w-md border-secondary/50 shadow-lg text-center p-8">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6 animate-pulse" />
            <CardTitle className="text-2xl font-bold text-primary mb-2">
              {user.pendingReason === 'New Device Login' ? 'New Device Detected' : 
               user.pendingReason === 'Network Error' ? 'Connection Error' : 
               user.pendingReason === 'Access Suspended' ? 'Access Suspended' : 'Account Pending Approval'}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground mb-6">
              {user.pendingReason === 'New Device Login' ? (
                <>
                  You have logged in from a new device or browser. To protect your account from unauthorized access, we have temporarily locked your portal. 
                  <br /><br />
                  Please wait for an administrator to approve this new device.
                </>
              ) : user.pendingReason === 'Network Error' ? (
                <>
                  We couldn't reach the database to verify your account status. This is likely because the server is experiencing high traffic or your internet is unstable.
                  <br /><br />
                  Please try refreshing the page or come back later.
                </>
              ) : user.pendingReason === 'Access Suspended' ? (
                <>
                  Your account has been suspended contact the admin or teachers.
                </>
              ) : (
                <>
                  Your registration is currently under review by our administration team. We are verifying your NIC details.
                  <br /><br />
                  Please check back later!
                </>
              )}
            </CardDescription>
            <Button variant="outline" onClick={logout}>Sign Out</Button>
          </Card>
        </div>
      );
    }

    // Student Dashboard View
    return (
      <div className="max-w-5xl mx-auto space-y-8 px-4 md:px-6 pt-6">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 bg-secondary/10 p-4 sm:p-6 rounded-2xl border border-secondary/30">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 w-full md:w-auto">
            <label className="relative group cursor-pointer shrink-0">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="Profile" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-primary/50 object-cover" />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/20 border-4 border-primary/50 flex items-center justify-center text-3xl font-bold text-primary">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] sm:text-xs text-foreground font-bold">{isUploadingPfp ? "Uploading..." : "Change PFP"}</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePfpUpload} disabled={isUploadingPfp} />
            </label>
            <div className="flex flex-col items-center sm:items-start max-w-full overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{user.name || user.email.split('@')[0]}</h1>
                <button 
                  onClick={() => router.push('/profile')}
                  className="p-2 hover:bg-secondary/20 rounded-full text-muted-foreground hover:text-primary shrink-0 transition-colors"
                  title="Edit Profile"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-center sm:text-left w-full">
                {user.studentId && (
                  <p className="text-primary font-mono bg-primary/10 inline-block px-2 py-0.5 rounded text-xs sm:text-sm">{user.studentId}</p>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">Brilliant Academy Student {user.graduationYear ? `(Batch ${user.graduationYear})` : ''}</p>
                {user.school && <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.school}</p>}
                {user.phone && <p className="text-xs sm:text-sm text-muted-foreground">{user.phone}</p>}
                {user.address && <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.address}</p>}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-xs sm:text-sm font-medium">
                <Award className="w-4 h-4 text-primary" /> Level {stats.xpLevel}
              </div>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => router.push('/profile')} className="text-xs gap-2">
                  <Edit2 className="w-3 h-3" /> Edit Profile Details
                </Button>
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 space-y-2 mt-4 md:mt-0">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">XP to Level {stats.xpLevel + 1}</span>
              <span className="font-bold">{stats.totalXp} / {stats.xpLevel * 500}</span>
            </div>
            <Progress value={(stats.totalXp / (stats.xpLevel * 500)) * 100} className="h-2 [&>div]:bg-primary" />
          </div>
        </div>

        {/* Technical Support Action Banner */}
        <Card className="border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-foreground">Facing Technical Issues or Glitches?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Report video loading errors, quality issues, or exam glitches directly to System Administrators.</p>
              </div>
            </div>
            <Button 
              onClick={() => setIsReportModalOpen(true)}
              className="bg-amber-500 text-black font-bold hover:bg-amber-400 shrink-0 gap-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] w-full sm:w-auto"
            >
              <ShieldAlert className="w-4 h-4" /> Report Issue to Admin
            </Button>
          </CardContent>
        </Card>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-4 md:p-6 flex flex-col items-center text-center space-y-2">
              <Flame className="w-8 h-8 text-orange-500 mb-1" />
              <div className="text-xl md:text-2xl font-bold">{stats.streakDays} Days</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Continuous Streak</p>
            </CardContent>
          </Card>
          
          <div onClick={() => setShowStudyHistoryModal(true)} className="cursor-pointer transition-transform hover:scale-105">
            <Card className="border-secondary/50 bg-card hover:bg-primary/10 transition-colors h-full">
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center space-y-2 relative">
                <Timer className="w-8 h-8 text-purple-500 mb-1" />
                <div className="text-xl md:text-2xl font-bold">{stats.todayStudyTimeString}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground font-semibold text-primary underline underline-offset-4 decoration-primary/30">Today's Study Time</p>
                <div className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-4 md:p-6 flex flex-col items-center text-center space-y-2">
              <Clock className="w-8 h-8 text-blue-500 mb-1" />
              <div className="text-xl md:text-2xl font-bold">{stats.studyTimeString}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Total Study Time</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-4 md:p-6 flex flex-col items-center text-center space-y-2">
              <Target className="w-8 h-8 text-green-500 mb-1" />
              <div className="text-xl md:text-2xl font-bold text-green-500">{stats.averageGrade}%</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Average Grade</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-4 md:p-6 flex flex-col items-center text-center space-y-2">
              <BookOpen className="w-8 h-8 text-primary mb-1" />
              <div className="text-xl md:text-2xl font-bold">{stats.examsDone} / {stats.examsMissed}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Exams Done / Missed</p>
            </CardContent>
          </Card>
        </div>

        {/* Study History Modal overlay */}
        {showStudyHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md border-secondary/50 shadow-2xl overflow-hidden relative">
              <CardHeader className="bg-primary/10 border-b border-primary/20 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Timer className="w-5 h-5 text-primary" /> Daily Study History
                  </CardTitle>
                  <button onClick={() => setShowStudyHistoryModal(false)} className="p-1 hover:bg-black/10 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[60vh] overflow-y-auto">
                  {!user?.studyHistory || Object.keys(user.studyHistory).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Timer className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No study history found yet.</p>
                      <p className="text-xs mt-1">Start watching videos to log time!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {Object.entries(user.studyHistory)
                        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // Sort descending
                        .map(([date, mins]) => (
                          <div key={date} className="flex items-center justify-between p-4 border-b border-secondary/20 hover:bg-secondary/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                <p className="text-xs text-muted-foreground">Session Record</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold font-mono bg-secondary/20 px-2 py-1 rounded text-sm">
                                {Math.floor(mins / 60)}h {mins % 60}m
                              </p>
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 p-4 justify-between border-t border-secondary/20">
                <p className="text-xs text-muted-foreground">Updates dynamically.</p>
                <Button variant="outline" size="sm" onClick={() => setShowStudyHistoryModal(false)}>Close</Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Detailed Exam History */}
        <Card className="border-secondary/50 shadow-md">
          <CardHeader className="bg-primary/5 border-b border-primary/20">
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" /> Recent Exam History
            </CardTitle>
            <CardDescription>Review your past performance and missed exams.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="space-y-0 min-w-[600px] p-6">
              {/* Table Header */}
              <div className="grid grid-cols-12 text-sm font-bold text-muted-foreground px-4 pb-3 border-b border-secondary/30">
                <div className="col-span-4">Exam Name</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Time Taken</div>
                <div className="col-span-2 text-center">Grade</div>
                <div className="col-span-2 text-right">XP Earned</div>
              </div>
              
              {/* Real History Rows */}
              {fetchingExams ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Loading exam history...</div>
              ) : examHistory.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic">You haven't completed any exams yet.</div>
              ) : (
                examHistory.map((exam) => (
                  <div key={exam.id} className="grid grid-cols-12 items-center px-4 py-4 border-b border-secondary/20 last:border-0 hover:bg-secondary/10 transition-colors">
                    <div className="col-span-4 font-medium flex items-center gap-2">
                      {exam.status === "done" ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                      <span className="truncate">{exam.title || exam.examTitle || "Untitled Exam"}</span>
                    </div>
                    <div className="col-span-2 text-center font-bold">
                      {exam.score !== undefined ? `${exam.score}%` : "-"}
                      {exam.rawScore !== undefined && exam.totalQuestions ? (
                        <span className="text-xs text-muted-foreground font-normal block">({exam.rawScore}/{exam.totalQuestions})</span>
                      ) : null}
                    </div>
                    <div className="col-span-2 text-center text-xs text-muted-foreground font-mono">
                      {exam.timeTakenSeconds || exam.timeSeconds ? formatSeconds(exam.timeTakenSeconds || exam.timeSeconds) : "-"}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        (exam.grade || '').includes('A') ? 'bg-green-500/20 text-green-500' :
                        (exam.grade || '').includes('B') ? 'bg-blue-500/20 text-blue-500' :
                        (exam.grade || '').includes('C') ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-destructive/20 text-destructive'
                      }`}>
                        {exam.grade || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      {exam.xpEarned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                          <Sparkles className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          +{exam.xpEarned} XP
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

          <PasskeySettings />
          <ReportIssueModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
      </div>
    );
  }

  // Login/Signup View
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md border-secondary/50 shadow-lg shadow-primary/5">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">{isGoogleSignupForm ? "Complete Your Registration" : isLogin ? "Student Login" : "Create Account"}</CardTitle>
          <CardDescription>{isGoogleSignupForm ? "Please fill in all the required details below to complete your registration." : isLogin ? "Login to access your courses and exams." : "Join Brilliant Academy and master physics."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {resetSuccessEmail && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-sm p-4 rounded-xl space-y-2.5 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  Password Reset Email Sent!
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We've sent a password reset link to: <br />
                  <strong className="text-foreground font-semibold text-sm break-all">{resetSuccessEmail}</strong>
                </p>
                <div className="flex items-start gap-2 pt-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <span className="font-bold">Check your Inbox & Spam:</span> If you don't see the email within 1–2 minutes, please be sure to <strong>check your Spam / Junk mail folder</strong>!
                  </div>
                </div>
              </div>
            )}

            {!isGoogleSignupForm && (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-11 mb-2 bg-card hover:bg-secondary/10"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {isLogin ? "Sign in with Google" : "Sign up with Google"}
                </Button>

                {isLogin && isWebAuthnSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 mb-4 bg-background/50 hover:bg-background border-primary/20 text-primary transition-all duration-300"
                    onClick={handlePasskeyLogin}
                    disabled={isSubmitting}
                  >
                    <Fingerprint className="w-5 h-5" />
                    Sign in with Passkey / Biometrics
                  </Button>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-secondary/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-semibold">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}
            
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="student-name">Full Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="student-name" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    readOnly={isGoogleSignupForm && !!name}
                    className={isGoogleSignupForm && name ? "bg-secondary/30 text-muted-foreground focus-visible:ring-0 cursor-not-allowed" : ""}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-dob">Date of Birth <span className="text-red-500">*</span></Label>
                    <Input 
                      id="student-dob" 
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender <span className="text-red-500">*</span></Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-school">School <span className="text-red-500">*</span></Label>
                    <Input 
                      id="student-school" 
                      placeholder="Your School Name" 
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stream <span className="text-red-500">*</span></Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={stream}
                      onChange={(e) => setStream(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Stream</option>
                      {streams.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="student-address">Address <span className="text-red-500">*</span></Label>
                  <Input 
                    id="student-address" 
                    placeholder="123 Main St, City" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-phone">Your Phone <span className="text-red-500">*</span></Label>
                    <Input 
                      id="student-phone" 
                      type="number"
                      placeholder="077..." 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required 
                    />
                    {phoneError && (
                      <p className="text-xs text-destructive font-semibold">{phoneError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-parent-phone">Parent's Phone <span className="text-red-500">*</span></Label>
                    <Input 
                      id="student-parent-phone" 
                      type="number"
                      placeholder="077..." 
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                {!isLogin && phone && parentPhone && phone === parentPhone && (
                  <p className="text-xs text-destructive font-semibold">Your phone and Parent's phone cannot be the same.</p>
                )}

                <div className="space-y-2">
                  <Label>Batch <span className="text-red-500">*</span></Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  >
                    {batches.length === 0 ? (
                      <option value="2026">Loading batches...</option>
                    ) : (
                      batches.map(b => (
                        <option key={b.id} value={b.year}>{b.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-nic-number">NIC Number <span className="text-red-500">*</span></Label>
                    <Input 
                      id="student-nic-number" 
                      type="number"
                      placeholder="e.g. 2005..." 
                      value={nicNumber}
                      onChange={(e) => setNicNumber(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-nic">NIC Image <span className="text-red-500">*</span></Label>
                    <Input 
                      id="student-nic" 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setNicFile(e.target.files ? e.target.files[0] : null)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="student-email">{isLogin ? "Email or Student ID" : <span>Email <span className="text-red-500">*</span></span>}</Label>
              <Input 
                id="student-email" 
                type={isLogin ? "text" : "email"}
                placeholder={isLogin ? "student@gmail.com or PB-1234" : "student@gmail.com"} 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetSuccessEmail(null);
                }}
                required
                readOnly={isGoogleSignupForm}
                className={isGoogleSignupForm ? "bg-secondary/30 text-muted-foreground focus-visible:ring-0 cursor-not-allowed" : ""}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="student-password">Password {!isLogin && <span className="text-red-500">*</span>}</Label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={handleResetPassword}
                    disabled={isResetting}
                    className="text-xs text-primary hover:underline font-medium disabled:opacity-50 transition-opacity"
                  >
                    {isResetting ? "Sending reset email..." : "Forgot Password?"}
                  </button>
                )}
              </div>
              <Input 
                id="student-password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button 
              type="submit" 
              className="w-full font-bold" 
              size="lg"
              disabled={isSubmitting || (!isLogin && !!phone && !!parentPhone && phone === parentPhone)}
            >
              {isSubmitting ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>
        </CardContent>
        {!isGoogleSignupForm && (
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"} 
            <Button 
              variant="link" 
              className="px-1 text-primary" 
              onClick={() => {
                setIsLogin(!isLogin);
                setIsGoogleSignupForm(false);
                setResetSuccessEmail(null);
                setError("");
              }}
            >
              {isLogin ? "Sign up" : "Log in"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}


