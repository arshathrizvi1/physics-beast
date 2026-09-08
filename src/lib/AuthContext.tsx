"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { calculateXpLevel } from './xp';

const safeStorage = {
  local: {
    getItem: (key: string) => { try { return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null; } catch { return null; } },
    setItem: (key: string, value: string) => { try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); } catch {} },
    removeItem: (key: string) => { try { if (typeof window !== 'undefined') window.localStorage.removeItem(key); } catch {} }
  },
  session: {
    getItem: (key: string) => { try { return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null; } catch { return null; } },
    setItem: (key: string, value: string) => { try { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value); } catch {} },
    removeItem: (key: string) => { try { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); } catch {} }
  }
};

export type UserRole = 'student' | 'admin' | 'teacher';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  batchId?: string;
  graduationYear?: string;
  address?: string;
  phone?: string;
  parentPhone?: string;
  nicNumber?: string;
  nicUrl?: string;
  photoUrl?: string;
  isApproved?: boolean;
  pendingReason?: string;
  deviceId?: string;
  deviceName?: string;
  totpSecret?: string | null;
  // Real Student Stats
  totalStudyTimeMins?: number;
  todayStudyTimeMins?: number;
  studyHistory?: Record<string, number>;
  lastStudyDate?: string;
  createdAt?: number;
  lastStudyPing?: number;
  lastOnlinePing?: number;
  streakDays?: number;
  averageGrade?: number; // 0-100 percentage
  examsDone?: number;
  examsMissed?: number;
  xpLevel?: number;
  totalXp?: number;
  lastLoginDate?: string;
  lastNameChangeDate?: number; // timestamp
  studentId?: string; // e.g. PB-0001
  accessibleCourses?: string[]; // array of course IDs they can access
  folderAccess?: Record<string, number>; // folderId -> expiration timestamp
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, profileData: any, nicFile: File | null) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfilePicture: (file: File) => Promise<boolean>;
  updateProfileName: (newName: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ success: boolean; email?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  signup: async () => false,
  logout: async () => {},
  updateProfilePicture: async () => false,
  updateProfileName: async () => false,
  resetPassword: async () => ({ success: false }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // SAFETY TIMEOUT: If Firebase Auth hangs or is slow, force unblock after 2 seconds
    const authTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);

    if (typeof window !== 'undefined') {
      // 1. Optimistic Cache for Students (Instant Relogin)
      const cachedProfile = safeStorage.local.getItem('cachedUserProfile');
      if (cachedProfile) {
        try {
          setUser(JSON.parse(cachedProfile));
          setLoading(false);
        } catch (e) {
          console.error("Failed to parse cached profile");
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Fetch custom user profile from Firestore
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          
          // STRICT 2-SECOND TIMEOUT: If Firestore WebSockets are blocked or slow, don't leave the user hanging!
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 2000)
          );
          
          const docSnap = await Promise.race([
            getDoc(docRef),
            timeoutPromise
          ]);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check for multi-device login (only for students, admins bypass this)
            const localDeviceId = safeStorage.local.getItem('localDeviceId');
            const isLoggingIn = safeStorage.session.getItem('isLoggingIn') === 'true';
            
            // If this browser doesn't have a localDeviceId yet, assign one
            if (!localDeviceId && typeof window !== 'undefined') {
              const newId = Math.random().toString(36).substring(2, 15);
              safeStorage.local.setItem('localDeviceId', newId);
            }

            // Check if deviceId was cleared or revoked by admin (or no device is bound yet)
            const wasRevokedOrEmpty = data.deviceId === 'REVOKED' || data.deviceId === null || data.deviceId === '';
            const isMismatched = !wasRevokedOrEmpty && data.deviceId && localDeviceId && data.deviceId !== localDeviceId;

            // If session was revoked by admin, treat this login as an authorized new device binding!
            if (data.role !== 'admin' && data.role !== 'teacher' && wasRevokedOrEmpty && localDeviceId) {
              console.log("Device session was revoked or unassigned. Binding current device as authorized device.");
              updateDoc(docRef, {
                deviceId: localDeviceId,
                isApproved: true,
                pendingReason: null
              }).catch(console.error);
              data.deviceId = localDeviceId;
              data.isApproved = true;
              data.pendingReason = null;
            } else if (data.role !== 'admin' && data.role !== 'teacher' && !isLoggingIn && isMismatched) {
              // Active session accessed from another unauthorized device
              console.log("Logged out because session was accessed on another device.");
              await firebaseSignOut(auth);
              setUser(null);
              setLoading(false);
              alert("You have been logged out because your account was accessed from another device.");
              return;
            }

            const initialXp = data.totalXp ?? 0;
            const initialLevel = data.xpLevel || calculateXpLevel(initialXp);

            let finalProfile = {
              ...data,
              totalXp: initialXp,
              xpLevel: initialLevel,
              totalStudyTimeMins: data.totalStudyTimeMins ?? 0,
              examsDone: data.examsDone ?? 0,
              averageGrade: data.averageGrade ?? 0,
              name: data.name || firebaseUser.email?.split('@')[0] || 'Student'
            } as UserProfile;

            // Streak Calculation
            if (finalProfile.role === 'student') {
              const now = new Date();
              // Offset by local timezone to get the correct YYYY-MM-DD
              const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
              const lastLoginStr = finalProfile.lastLoginDate || "";
              
              if (lastLoginStr !== todayStr) {
                let newStreak = finalProfile.streakDays || 0;
                
                if (lastLoginStr) {
                  const lastLogin = new Date(lastLoginStr);
                  // Calculate difference in days (ignoring time)
                  const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(lastLoginStr).getTime());
                  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays === 1) {
                    newStreak += 1;
                  } else if (diffDays > 1) {
                    newStreak = 1; // Reset streak if missed a day
                  }
                } else {
                  newStreak = 1; // First ever recorded login for streak
                }
                
                finalProfile = { ...finalProfile, streakDays: newStreak, lastLoginDate: todayStr };
                // Update Firestore in background silently
                updateDoc(docRef, { streakDays: newStreak, lastLoginDate: todayStr }).catch(console.error);
              }
            }

            setUser(finalProfile);
            if (typeof window !== 'undefined') {
              safeStorage.local.setItem('cachedUserProfile', JSON.stringify(finalProfile));
            }

            // ── REAL-TIME ACCESS & STATS SYNC ──────────────────────────────────
            // When an admin updates access, or when the student earns study XP / completes exams,
            // Firestore updates the student's doc. This listener picks up all changes live!
            const unsubAccess = onSnapshot(docRef, (snap) => {
              if (!snap.exists()) return;
              const fresh = snap.data();
              
              // Device Collision & Admin Remote Sign-Out Check (students only)
              if (typeof window !== 'undefined') {
                const localDeviceId = safeStorage.local.getItem('localDeviceId');
                const isRevoked = fresh.deviceId === 'REVOKED' || fresh.deviceId === null || fresh.deviceId === '';
                const isMismatched = fresh.deviceId && localDeviceId && fresh.deviceId !== localDeviceId;

                if (fresh.role !== 'admin' && fresh.role !== 'teacher' && (isRevoked || isMismatched)) {
                  console.log("Logged out because session was revoked by admin or accessed on another device.");
                  firebaseSignOut(auth).catch(() => {});
                  setUser(null);
                  safeStorage.local.removeItem('cachedUserProfile');
                  alert(isRevoked 
                    ? "You have been signed out from this device by the administrator." 
                    : "You have been logged out because your account was accessed from another device.");
                  return;
                }
              }

              setUser(prev => {
                if (!prev) return prev;
                const freshXp = fresh.totalXp ?? prev.totalXp ?? 0;
                const freshLevel = fresh.xpLevel ?? calculateXpLevel(freshXp);
                const updated = {
                  ...prev,
                  role: fresh.role || prev.role,
                  name: fresh.name || prev.name,
                  folderAccess: fresh.folderAccess ?? prev.folderAccess,
                  accessibleCourses: fresh.accessibleCourses ?? prev.accessibleCourses,
                  isApproved: fresh.isApproved ?? prev.isApproved,
                  totalXp: freshXp,
                  xpLevel: freshLevel,
                  totalStudyTimeMins: fresh.totalStudyTimeMins ?? prev.totalStudyTimeMins ?? 0,
                  streakDays: fresh.streakDays ?? prev.streakDays ?? 0,
                  averageGrade: fresh.averageGrade ?? prev.averageGrade ?? 0,
                  examsDone: fresh.examsDone ?? prev.examsDone ?? 0,
                  examsMissed: fresh.examsMissed ?? prev.examsMissed ?? 0,
                  studyHistory: fresh.studyHistory ?? prev.studyHistory ?? {},
                  totpSecret: fresh.totpSecret ?? null,
                };
                // Keep cache in sync so fast-reloads also reflect the new access & XP
                if (typeof window !== 'undefined') {
                  safeStorage.local.setItem('cachedUserProfile', JSON.stringify(updated));
                }
                return updated;
              });
            });
            // Store unsub so it's cleaned up when auth state changes (e.g. logout)
            // We attach it to the outer unsubscribe chain via a module-level ref trick
            (window as any).__pbAccessUnsub?.();
            (window as any).__pbAccessUnsub = unsubAccess;
            // ──────────────────────────────────────────────────────────────────
          } else {
            // Auto-admin for the creator
            const role = firebaseUser.email === 'arshathrizvi1010@gmail.com' ? 'admin' : 'student';
            const fallbackUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
              role: role,
              isApproved: role === 'admin'
            };
            
            // Skip saving fallback if we are currently in the middle of signup
            const isSigningUp = safeStorage.session.getItem('isSigningUp') === 'true';
            
            if (!isSigningUp) {
              // Try to save this fallback profile to Firestore
              try {
                await setDoc(docRef, fallbackUser);
              } catch (e) {
                console.log("Could not save initial profile to Firestore");
              }
            }
            
            setUser(fallbackUser);
            if (typeof window !== 'undefined') {
              safeStorage.local.setItem('cachedUserProfile', JSON.stringify(fallbackUser));
            }
          }
        } catch (error: any) {
          console.log("Error fetching user profile from Firestore:", error);
          
          if (typeof window !== 'undefined') {
            const cachedProfile = safeStorage.local.getItem('cachedUserProfile');
            if (cachedProfile) {
              // Keep the cached profile instead of overwriting with a dummy one!
              setUser(JSON.parse(cachedProfile));
              setLoading(false);
              return;
            }
          }
          
          // No cache available and network failed
          const fallbackUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
            role: firebaseUser.email === 'arshathrizvi1010@gmail.com' ? 'admin' : 'student',
            isApproved: false,
            pendingReason: 'Network Error'
          };
          setUser(fallbackUser);
        }
      } else {
        if (typeof window !== 'undefined') {
          safeStorage.local.removeItem('cachedUserProfile');
        }
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // Global Online Presence Heartbeat
  useEffect(() => {
    if (!user?.uid) return;
    
    // Initial ping
    updateDoc(doc(db, 'users', user.uid), { lastOnlinePing: Date.now() }).catch(() => {});
    
    // Ping every 60 seconds
    const interval = setInterval(() => {
      updateDoc(doc(db, 'users', user.uid), { lastOnlinePing: Date.now() }).catch(() => {});
    }, 60000);
    
    return () => clearInterval(interval);
  }, [user?.uid]);

  const login = async (loginId: string, password: string) => {
    let email = loginId.trim();
    
    // Check if the user entered a Student ID (e.g. PB-1234 or doesn't have an @)
    if (!email.includes('@')) {
      // Query the users collection to find the email associated with this studentId
      const usersRef = collection(db, 'users');
      // They might type PB-1234 or pb-1234 or just 1234
      let formattedId = email.toUpperCase();
      if (!formattedId.startsWith('PB-') && /^\d+$/.test(formattedId)) {
        formattedId = `PB-${formattedId}`;
      }
      
      const qId = query(usersRef, where("studentId", "==", formattedId));
      const idSnapshot = await getDocs(qId);
      
      if (!idSnapshot.empty) {
        email = idSnapshot.docs[0].data().email;
      } else {
        // Fallback: try querying without PB- if they just typed numbers, or as is
        const qIdRaw = query(usersRef, where("studentId", "==", email));
        const rawSnapshot = await getDocs(qIdRaw);
        if (!rawSnapshot.empty) {
           email = rawSnapshot.docs[0].data().email;
        } else {
           // Not found. Let it fail in Firebase Auth (which requires an email)
           email = loginId; 
        }
      }
    }

    // Admin login special path
    if (email === "arshathrizvi1010@gmail.com") {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (e: any) {
        // If the account doesn't exist, we can try to create it if they are using the default setup password
        if (password === "Arshath2007") {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            return true;
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              console.log("Admin account exists but password was wrong");
              return false;
            }
          }
        }
        return false;
      }
    }

    try {
      safeStorage.session.setItem('isLoggingIn', 'true');

      let currentLocalDeviceId = typeof window !== 'undefined' ? safeStorage.local.getItem('localDeviceId') : null;
      if (!currentLocalDeviceId && typeof window !== 'undefined') {
        currentLocalDeviceId = Math.random().toString(36).substring(2, 15);
        safeStorage.local.setItem('localDeviceId', currentLocalDeviceId);
        safeStorage.local.setItem('localDeviceIdTime', Date.now().toString());
      }

      const userCred = await signInWithEmailAndPassword(auth, email, password);

      // Check if this is a new device or multiple login attempt
      const userDocRef = doc(db, 'users', userCred.user.uid);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 2000)
      );
      
      const userDoc = await Promise.race([
        getDoc(userDocRef),
        timeoutPromise
      ]);
      
      if (userDoc && userDoc.exists()) {
        const data = userDoc.data();
        if (data.role !== 'admin' && data.role !== 'teacher') {
          // If the admin explicitly revoked/signed out the student's previous device (or if there was no device bound yet),
          // bind this current device seamlessly so the student can log in from their new/replacement phone or same device!
          const wasRevokedByAdmin = data.deviceId === 'REVOKED' || !data.deviceId;

          if (wasRevokedByAdmin) {
            console.log("Admin cleared/revoked device session. Binding new device seamlessly!");
            updateDoc(userDocRef, {
              deviceId: currentLocalDeviceId,
              isApproved: true,
              pendingReason: null
            }).catch(e => console.log("Could not update deviceId in DB:", e));

            const updatedProfile = {
              ...data,
              deviceId: currentLocalDeviceId,
              isApproved: true,
              pendingReason: null
            } as unknown as UserProfile;
            setUser(updatedProfile);
            if (typeof window !== 'undefined') {
              safeStorage.local.setItem('cachedUserProfile', JSON.stringify(updatedProfile));
            }
          } else if (data.deviceId !== currentLocalDeviceId) {
            console.log("New device detected without prior admin signout. Requiring admin approval.");
            // Require Admin Approval for unapproved device collisions
            updateDoc(userDocRef, { 
              deviceId: currentLocalDeviceId,
              isApproved: false,
              pendingReason: 'New Device Login'
            }).catch(e => console.log("Could not update deviceId in DB (quota or network):", e));
            
            const updatedProfile = { 
              ...data, 
              deviceId: currentLocalDeviceId,
              isApproved: false,
              pendingReason: 'New Device Login'
            } as UserProfile;
            setUser(updatedProfile);
            if (typeof window !== 'undefined') {
              safeStorage.local.setItem('cachedUserProfile', JSON.stringify(updatedProfile));
            }
          }
        }
      }

      safeStorage.session.removeItem('isLoggingIn');
      return true;
    } catch (error: any) {
      safeStorage.session.removeItem('isLoggingIn');
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password') {
         console.log("Login failed: Invalid credentials");
      } else {
         console.log("Login failed:", error?.message || "Unknown error");
      }
      return false;
    }
  };

  const signup = async (email: string, password: string, profileData: any, nicFile: File | null) => {
    try {
      safeStorage.session.setItem('isSigningUp', 'true');
      const usersRef = collection(db, 'users');
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 5000)
      );

      // 1. Check if NIC number already exists (duplicate check)
      if (profileData.nicNumber) {
        const qNic = query(usersRef, where("nicNumber", "==", profileData.nicNumber));
        const nicSnapshot = await Promise.race([getDocs(qNic), timeoutPromise]) as any;
        if (!nicSnapshot.empty) {
          throw new Error("NIC_DUPLICATE");
        }
      }

      // 2. Check if student phone number already exists
      if (profileData.phone) {
        const qPhone = query(usersRef, where("phone", "==", profileData.phone));
        const phoneSnapshot = await Promise.race([getDocs(qPhone), timeoutPromise]) as any;
        if (!phoneSnapshot.empty) {
          throw new Error("PHONE_DUPLICATE");
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      let nicUrl = "";
      if (nicFile) {
        try {
          nicUrl = await new Promise<string>((resolve, reject) => {
            if (nicFile.type === 'application/pdf') {
              if (nicFile.size > 800 * 1024) return reject(new Error("PDF too large"));
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(nicFile);
              return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 900;
                if (width > MAX_WIDTH) {
                  height = Math.round((height * MAX_WIDTH) / width);
                  width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.7));
                } else {
                  resolve(e.target?.result as string);
                }
              };
              img.onerror = reject;
              if (e.target?.result) img.src = e.target.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(nicFile);
          });
        } catch (uploadError) {
          console.error("NIC base64 conversion failed:", uploadError);
          // Continue anyway, maybe they can upload later
        }
      }

      const newDeviceId = Math.random().toString(36).substring(2, 15);
      if (typeof window !== 'undefined') {
        safeStorage.local.setItem('localDeviceId', newDeviceId);
        safeStorage.local.setItem('localDeviceIdTime', Date.now().toString());
      }

      let studentId = "";
      if (email !== 'arshathrizvi1010@gmail.com') {
        try {
          const qStudents = query(collection(db, 'users'), where("role", "==", "student"));
          const countSnap = await getCountFromServer(qStudents);
          const nextId = countSnap.data().count + 1;
          studentId = `PB-${nextId.toString().padStart(4, '0')}`;
        } catch (e) {
          console.error("Failed to generate student ID", e);
          studentId = `PB-${Math.floor(Math.random() * 9000) + 1000}`; // fallback
        }
      }

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: email,
        name: profileData.name,
        role: email === 'arshathrizvi1010@gmail.com' ? 'admin' : 'student',
        isApproved: email === 'arshathrizvi1010@gmail.com', // Admins are auto-approved, students must be reviewed
        pendingReason: email === 'arshathrizvi1010@gmail.com' ? undefined : 'ID Verification',
        graduationYear: profileData.graduationYear,
        address: profileData.address,
        phone: profileData.phone,
        parentPhone: profileData.parentPhone,
        nicNumber: profileData.nicNumber,
        nicUrl: nicUrl,
        deviceId: newDeviceId,
        totalStudyTimeMins: 0,
        streakDays: 0,
        averageGrade: 0,
        examsDone: 0,
        examsMissed: 0,
        xpLevel: 1,
        totalXp: 0,
        studentId: studentId,
        accessibleCourses: [],
        createdAt: Date.now()
      };

      // Create document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      
      // Update local state immediately (onAuthStateChanged might have fired too early before setDoc finished)
      setUser(newProfile);
      if (typeof window !== 'undefined') {
        safeStorage.local.setItem('cachedUserProfile', JSON.stringify(newProfile));
      }
      
      safeStorage.session.removeItem('isSigningUp');
      return true;
    } catch (error: any) {
      safeStorage.session.removeItem('isSigningUp');
      if (error.message === "NIC_DUPLICATE") {
        alert("Registration Failed: This NIC Number is already registered to another account!");
        return false;
      }
      if (error.message === "PHONE_DUPLICATE") {
        throw error;
      }
      if (error.code === 'auth/configuration-not-found') {
        alert("Firebase Setup Required:\n\nYou must enable 'Email/Password' authentication in the Firebase Console!\n\nGo to Firebase Console -> Authentication -> Sign-in Method -> Enable Email/Password.");
      }
      console.log("Signup failed:", error?.message || "Unknown error");
      return false;
    }
  };

  const updateProfilePicture = async (file: File) => {
    if (!user) return false;
    try {
      const photoUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_WIDTH = 400; // Small size for profile pics
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            } else {
              resolve(e.target?.result as string);
            }
          };
          img.onerror = reject;
          if (e.target?.result) img.src = e.target.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      await updateDoc(doc(db, 'users', user.uid), { photoUrl });
      
      const updatedUser = { ...user, photoUrl };
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        safeStorage.local.setItem('cachedUserProfile', JSON.stringify(updatedUser));
      }
      return true;
    } catch (error: any) {
      console.log("Profile picture upload failed:", error?.message || "Unknown error");
      return false;
    }
  };

  const resetPassword = async (emailOrId: string): Promise<{ success: boolean; email?: string; error?: string }> => {
    let targetEmail = emailOrId.trim();

    if (!targetEmail) {
      return { success: false, error: "Please enter your email or Student ID." };
    }

    // If user provided Student ID instead of email, look it up in Firestore
    if (!targetEmail.includes('@')) {
      try {
        const usersRef = collection(db, 'users');
        let formattedId = targetEmail.toUpperCase();
        if (!formattedId.startsWith('PB-') && /^\d+$/.test(formattedId)) {
          formattedId = `PB-${formattedId}`;
        }
        
        const qId = query(usersRef, where("studentId", "==", formattedId));
        const idSnapshot = await getDocs(qId);
        
        if (!idSnapshot.empty) {
          targetEmail = idSnapshot.docs[0].data().email;
        } else {
          const qIdRaw = query(usersRef, where("studentId", "==", emailOrId.trim()));
          const rawSnapshot = await getDocs(qIdRaw);
          if (!rawSnapshot.empty) {
            targetEmail = rawSnapshot.docs[0].data().email;
          } else {
            return { success: false, error: `Student ID "${emailOrId}" not found. Please enter your registered email.` };
          }
        }
      } catch (e: any) {
        console.error("Student ID lookup failed during password reset:", e);
      }
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      return { success: true, email: targetEmail };
    } catch (error: any) {
      console.log("Password reset failed:", error?.message || "Unknown error");
      let message = "Failed to send reset email. Please verify your email address.";
      if (error?.code === 'auth/user-not-found') {
        message = "No account found with this email address.";
      } else if (error?.code === 'auth/invalid-email') {
        message = "The email address is invalid.";
      } else if (error?.code === 'auth/too-many-requests') {
        message = "Too many reset attempts. Please wait a few minutes before trying again.";
      }
      return { success: false, error: message };
    }
  };

  const updateProfileName = async (newName: string) => {
    if (!user) return false;
    try {
      const now = Date.now();
      const updatedUser = { ...user, name: newName, lastNameChangeDate: now };
      await updateDoc(doc(db, 'users', user.uid), { name: newName, lastNameChangeDate: now });
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        safeStorage.local.setItem('cachedUserProfile', JSON.stringify(updatedUser));
      }
      return true;
    } catch (error: any) {
      console.log("Profile name update failed:", error?.message || "Unknown error");
      return false;
    }
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      safeStorage.local.removeItem('cachedUserProfile');
      sessionStorage.removeItem('admin_2fa_passed');
      // Stop the real-time access listener when logging out
      (window as any).__pbAccessUnsub?.();
      (window as any).__pbAccessUnsub = null;
    }
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfilePicture, updateProfileName, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

