"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { AlertCircle, Flame, Clock, Target, Award, BookOpen, ChevronRight, CheckCircle2, XCircle, Edit2, Check, FileText, Sparkles, Zap, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { formatSeconds, calculateXpLevel } from "@/lib/xp";

export default function LoginPage() {
  const { user, loading, login, signup, updateProfilePicture, updateProfileName, resetPassword, logout } = useAuth();
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
  
  const [isUploadingPfp, setIsUploadingPfp] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);

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
    if (user?.role === 'admin') {
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

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset your password.");
      return;
    }
    const success = await resetPassword(email);
    if (success) {
      alert("Password reset email sent! Check your inbox.");
      setError("");
    } else {
      setError("Failed to send reset email. Make sure the email is correct.");
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
        if (phone.trim() === parentPhone.trim()) {
          setError("Your Phone and Parent's Phone cannot be the same number.");
          setIsSubmitting(false);
          return;
        }
        const profileData = { name, graduationYear, address, phone, parentPhone, nicNumber };
        success = await signup(email, password, profileData, nicFile);
      }
      
      if (!success) {
        setError(isLogin ? "Invalid student email or password" : "Failed to create account. Email may be in use.");
        setIsSubmitting(false);
      } else if (!isLogin) {
        // Successfully signed up!
        alert("Account created successfully! Your account is pending admin approval. You can log in once approved.");
        await logout();
        setIsLogin(true);
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

  const handleSaveName = async () => {
    if (editNameValue.trim() && editNameValue !== user?.name) {
      const success = await updateProfileName(editNameValue.trim());
      if (!success) {
        alert("Failed to update name.");
      }
    }
    setIsEditingName(false);
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
    if (user.role === 'admin') {
      return (
        <div className="flex min-h-[70vh] items-center justify-center">
          <p className="animate-pulse text-xl text-primary">Redirecting to Admin Portal...</p>
        </div>
      );
    }

    if (user.isApproved === false && user.role !== 'teacher') {
      return (
        <div className="flex min-h-[70vh] items-center justify-center">
          <Card className="w-full max-w-md border-secondary/50 shadow-lg text-center p-8">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6 animate-pulse" />
            <CardTitle className="text-2xl font-bold text-primary mb-2">
              {user.pendingReason === 'New Device Login' ? 'New Device Detected' : 
               user.pendingReason === 'Network Error' ? 'Connection Error' : 'Account Pending Approval'}
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
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-secondary/10 p-6 rounded-2xl border border-secondary/30">
          <div className="flex items-center gap-6">
            <label className="relative group cursor-pointer">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-primary/50 object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 border-4 border-primary/50 flex items-center justify-center text-3xl font-bold text-primary">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-bold">{isUploadingPfp ? "Uploading..." : "Change PFP"}</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePfpUpload} disabled={isUploadingPfp} />
            </label>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        value={editNameValue} 
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="text-xl h-10 w-64 bg-background border-primary/50"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveName} disabled={isSubmitting}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 group/name">
                      <h1 className="text-3xl font-bold">{user.name || user.email.split('@')[0]}</h1>
                      <button 
                        onClick={() => { 
                          const lastChange = user.lastNameChangeDate || 0;
                          const daysSince = (Date.now() - lastChange) / (1000 * 60 * 60 * 24);
                          if (daysSince < 30) {
                            alert(`Name change locked. You recently changed your name. You can change it again in ${Math.ceil(30 - daysSince)} days.`);
                            return;
                          }
                          setEditNameValue(user.name || user.email.split('@')[0]); 
                          setIsEditingName(true); 
                        }}
                        className="opacity-0 group-hover/name:opacity-100 transition-opacity p-2 hover:bg-secondary/20 rounded-full text-muted-foreground hover:text-primary"
                        title="Edit Display Name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {user.studentId && (
                  <p className="text-primary font-mono bg-primary/10 inline-block px-2 py-0.5 rounded text-sm mb-2">{user.studentId}</p>
                )}
                <p className="text-muted-foreground">Physics Beast Student {user.graduationYear ? `(Batch ${user.graduationYear})` : ''}</p>
              <div className="flex items-center gap-2 mt-2 text-sm font-medium">
                <Award className="w-4 h-4 text-primary" /> Level {stats.xpLevel}
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">XP to Level {stats.xpLevel + 1}</span>
              <span className="font-bold">{stats.totalXp} / {stats.xpLevel * 500}</span>
            </div>
            <Progress value={(stats.totalXp / (stats.xpLevel * 500)) * 100} className="h-2 [&>div]:bg-primary" />
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <Flame className="w-8 h-8 text-orange-500 mb-1" />
              <div className="text-2xl font-bold">{stats.streakDays} Days</div>
              <p className="text-xs text-muted-foreground">Continuous Streak</p>
            </CardContent>
          </Card>
          
          <div onClick={() => setShowStudyHistoryModal(true)} className="cursor-pointer transition-transform hover:scale-105">
            <Card className="border-secondary/50 bg-card hover:bg-primary/10 transition-colors h-full">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-2 relative">
                <Timer className="w-8 h-8 text-purple-500 mb-1" />
                <div className="text-2xl font-bold">{stats.todayStudyTimeString}</div>
                <p className="text-xs text-muted-foreground font-semibold text-primary underline underline-offset-4 decoration-primary/30">Today's Study Time</p>
                <div className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <Clock className="w-8 h-8 text-blue-500 mb-1" />
              <div className="text-2xl font-bold">{stats.studyTimeString}</div>
              <p className="text-xs text-muted-foreground">Total Study Time</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <Target className="w-8 h-8 text-green-500 mb-1" />
              <div className="text-2xl font-bold text-green-500">{stats.averageGrade}%</div>
              <p className="text-xs text-muted-foreground">Average Grade</p>
            </CardContent>
          </Card>
          <Card className="border-secondary/50 bg-card hover:bg-secondary/5 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
              <BookOpen className="w-8 h-8 text-primary mb-1" />
              <div className="text-2xl font-bold">{stats.examsDone} / {stats.examsMissed}</div>
              <p className="text-xs text-muted-foreground">Exams Done / Missed</p>
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
      </div>
    );
  }

  // Login/Signup View
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md border-secondary/50 shadow-lg shadow-primary/5">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">{isLogin ? "Student Login" : "Create Account"}</CardTitle>
          <CardDescription>{isLogin ? "Login to access your courses and exams." : "Join Physics Beast and master physics."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="student-name">Full Name</Label>
                  <Input 
                    id="student-name" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="student-address">Address</Label>
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
                    <Label htmlFor="student-phone">Your Phone</Label>
                    <Input 
                      id="student-phone" 
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
                    <Label htmlFor="student-parent-phone">Parent's Phone</Label>
                    <Input 
                      id="student-parent-phone" 
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
                  <Label>Batch</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  >
                    <option value="2025">Class of 2025</option>
                    <option value="2026">Class of 2026</option>
                    <option value="2027">Class of 2027</option>
                    <option value="2028">Class of 2028</option>
                    <option value="2029">Class of 2029</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-nic-number">NIC Number</Label>
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
                    <Label htmlFor="student-nic">NIC Image</Label>
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
              <Label htmlFor="student-email">{isLogin ? "Email or Student ID" : "Email"}</Label>
              <Input 
                id="student-email" 
                type={isLogin ? "text" : "email"}
                placeholder={isLogin ? "student@gmail.com or PB-1234" : "student@gmail.com"} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="student-password">Password</Label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={handleResetPassword}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot Password?
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
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"} 
          <Button variant="link" className="px-1 text-primary" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign up" : "Log in"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
