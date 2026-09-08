"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, GraduationCap, X } from "lucide-react";

export default function TeacherSignupPage() {
  const { user, loading, googleSignIn, signupTeacher, completeGoogleTeacherSignup, logout } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSignupForm, setIsGoogleSignupForm] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    if (user && user.isApproved && !error && !signupSuccess) {
      if (user.role === 'admin' || user.role === 'teacher') {
        router.push('/admin');
      } else {
        router.push('/login');
      }
    }
  }, [user, router, error, signupSuccess]);

  if (loading && !error && !signupSuccess) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse text-xl text-primary font-bold">Loading...</p>
      </div>
    );
  }

  if (signupSuccess) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-green-500/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-500">Registration Successful!</CardTitle>
            <CardDescription className="text-base mt-2">
              Your teacher account has been created and is now <strong className="text-yellow-500">pending admin approval</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Once the admin approves your account, you will be able to log in and access the teacher dashboard.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              Go to Login Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is logged in but not approved (pending teacher)
  if (user && !user.isApproved && user.role === 'teacher' && !isGoogleSignupForm && !error && !signupSuccess) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md border-yellow-500/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-yellow-500">Pending Approval</CardTitle>
            <CardDescription className="text-base mt-2">
              Your teacher account is waiting for admin approval. Please check back later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => { logout(); router.push('/login'); }}>
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGoogleAuth = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await googleSignIn();
      if (res.success) {
        if (res.isNewUser) {
          // New Google user — show the form to complete registration
          setIsGoogleSignupForm(true);
          if (res.googleUser?.email) setEmail(res.googleUser.email);
          if (res.googleUser?.name) setName(res.googleUser.name);
          setPassword("");
        } else {
          // Existing user — they already have an account
          setError("This Google account is already registered. Please log in from the main login page.");
          await logout();
        }
      } else {
        let msg = res.error || "Google sign-in failed.";
        if (res.error?.includes('auth/popup-closed-by-user')) {
          msg = "Google sign-in was cancelled (popup closed).";
        } else if (res.error?.includes('auth/unauthorized-domain')) {
          msg = "Firebase Error: Unauthorized Domain. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.";
        }
        setError(msg);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during Google sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validate fields
    const missingFields: string[] = [];
    if (!name.trim()) missingFields.push("Full Name");
    if (!subject.trim()) missingFields.push("Subject");
    if (!email.trim()) missingFields.push("Email");
    if (!password.trim() && !isGoogleSignupForm) missingFields.push("Password");

    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(", ")}`);
      setIsSubmitting(false);
      return;
    }

    if (!isGoogleSignupForm && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsSubmitting(false);
      return;
    }

    let success = false;
    try {
      if (isGoogleSignupForm) {
        success = await completeGoogleTeacherSignup({ name: name.trim(), subject: subject.trim() }, password || undefined);
      } else {
        success = await signupTeacher(email.trim(), password, { name: name.trim(), subject: subject.trim() });
      }

      if (success) {
        setSignupSuccess(true);
        await logout();
      } else {
        setError("Failed to create account. Email may already be in use.");
      }
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-secondary/50 shadow-lg shadow-primary/5">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {isGoogleSignupForm ? "Complete Teacher Registration" : "Teacher Registration"}
          </CardTitle>
          <CardDescription>
            {isGoogleSignupForm
              ? "Please fill in the details below to complete your teacher account."
              : "Create your teacher account for Brilliant Academy."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive border border-destructive/30 text-sm p-4 rounded-lg flex items-start justify-between gap-3 shadow-md my-2 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setError("")} 
                  className="text-destructive/70 hover:text-destructive p-1 rounded hover:bg-destructive/10 shrink-0"
                  title="Dismiss error message"
                >
                  <X className="w-4 h-4" />
                </button>
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
                  Sign up with Google
                </Button>

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

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="teacher-name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="teacher-name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                readOnly={isGoogleSignupForm && !!name}
                className={isGoogleSignupForm && name ? "bg-secondary/30 text-muted-foreground focus-visible:ring-0 cursor-not-allowed" : ""}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="teacher-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="teacher-email"
                type="email"
                placeholder="teacher@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={isGoogleSignupForm}
                className={isGoogleSignupForm ? "bg-secondary/30 text-muted-foreground focus-visible:ring-0 cursor-not-allowed" : ""}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="teacher-password">
                Password {isGoogleSignupForm ? "(Optional — set if you also want email login)" : <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="teacher-password"
                type="password"
                placeholder={isGoogleSignupForm ? "Optional backup password" : "Create a password (min 6 chars)"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isGoogleSignupForm}
                minLength={isGoogleSignupForm ? undefined : 6}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="teacher-subject">Subject You Teach <span className="text-red-500">*</span></Label>
              <Input
                id="teacher-subject"
                placeholder="e.g. Physics, Chemistry, Biology"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Teacher Account"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Your account will need admin approval before you can access the dashboard. 2FA can be configured after approval from your profile settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
