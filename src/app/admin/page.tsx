"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, UserPlus, CreditCard, Activity, Video, FileText, FileQuestion, Upload, CheckCircle2, AlertCircle, Plus, Save, Edit, Edit2, Trash2, Eye, EyeOff, X, ExternalLink, Folder, FolderOpen, ChevronUp, ChevronDown, GraduationCap, BookOpen, UserCheck, Sparkles, RotateCcw, ShieldCheck, Camera, Globe, Printer, Info, Check, UserX, Clock, ListFilter, Trophy, LogOut, Smartphone, Search, ShieldAlert, StopCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db, storage } from "@/lib/firebase";
import Link from "next/link";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, setDoc, writeBatch, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { uploadToS3 } from "@/lib/s3Storage";

export default function AdminDashboard() {
  const { user, login, loading, updateProfilePicture, updateProfileName } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleHash = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'messages-support') {
          setActiveTab('messages');
          setMsgCategory('support');
        } else if (hash === 'messages-academic') {
          setActiveTab('messages');
          setMsgCategory('academic');
        } else if (['dashboard', 'students', 'payments', 'courses', 'content', 'exams', 'messages', 'team', 'site', 'myprofile'].includes(hash)) {
          setActiveTab(hash);
          if (hash === 'messages') setMsgCategory('support');
        }
      };

      handleHash();
      window.addEventListener('hashchange', handleHash);
      return () => window.removeEventListener('hashchange', handleHash);
    }
  }, []);

  const [activeUsers, setActiveUsers] = useState(0);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [examMessages, setExamMessages] = useState<any[]>([]);
  
  // Message Filters
  const [msgCategory, setMsgCategory] = useState<"all" | "academic" | "support">("academic");
  const [msgFilterType, setMsgFilterType] = useState("All");
  const [msgFilterCourse, setMsgFilterCourse] = useState("All");
  const [msgSearchQuery, setMsgSearchQuery] = useState("");

  const [selectedStudentForAccess, setSelectedStudentForAccess] = useState<any>(null);
  const [studentFolderAccess, setStudentFolderAccess] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<{
    url: string;
    studentName: string;
    amount: number;
    folderName: string;
    date?: number;
  } | null>(null);
  
  // Bulk Access State
  const [bulkStudentIds, setBulkStudentIds] = useState("");
  const [bulkFolderId, setBulkFolderId] = useState("");

  const [studentFilterBatch, setStudentFilterBatch] = useState("All");
  const [studentFilterStatus, setStudentFilterStatus] = useState("All");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<any>(null);

  // Open student profile automatically if navigated from Global Search
  useEffect(() => {
    if (typeof window !== 'undefined' && allStudents.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const studentIdParam = params.get('studentId');
      if (studentIdParam) {
        const found = allStudents.find((s) => s.id === studentIdParam);
        if (found) {
          setSelectedStudentInfo(found);
          setActiveTab('students');
        }
      }
    }
  }, [allStudents]);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [activeAnalyticsList, setActiveAnalyticsList] = useState<{ title: string, students: any[] } | null>(null);

  // Exam Views & Detailed Analytics State
  const [showAllExamsModal, setShowAllExamsModal] = useState(false);
  const [selectedExamDetails, setSelectedExamDetails] = useState<any | null>(null);
  const [examDetailedResults, setExamDetailedResults] = useState<any[]>([]);
  const [loadingExamDetails, setLoadingExamDetails] = useState(false);

  // Essay Grading States
  const [gradingResultId, setGradingResultId] = useState<string | null>(null);
  const [gradingScore, setGradingScore] = useState<string>('');
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [gradingPdfFile, setGradingPdfFile] = useState<File | null>(null);
  const [isGradingSubmitting, setIsGradingSubmitting] = useState(false);

  // Folder Manager State
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  
  // Inline Editing States
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderPrice, setEditFolderPrice] = useState("");

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");

  // Content Browser --- which folder is expanded in the Content tab
  const [contentBrowseCourseId, setContentBrowseCourseId] = useState<string | null>(null);
  const [contentBrowseFolderId, setContentBrowseFolderId] = useState<string | null>(null);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editingStudentData, setEditingStudentData] = useState<any>(null);
  
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchYear, setNewBatchYear] = useState("");
  const [streams, setStreams] = useState<any[]>([]);
  const [newStreamName, setNewStreamName] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseImage, setNewCourseImage] = useState<File | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderPrice, setNewFolderPrice] = useState("");
  
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'teacher') return;

    // Real-time listener for ALL Students
    const qStudents = query(collection(db, 'users'), where("role", "==", "student"));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const all: any[] = [];
      const pending: any[] = [];
      let activeCount = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        all.push({ id: doc.id, ...data });
        
        if (!data.isApproved && data.pendingReason !== 'Access Suspended') {
          pending.push({ id: doc.id, ...data });
        } else if (data.isApproved) {
          activeCount++;
        }
      });
      
      setAllStudents(all);
      setPendingStudents(pending);
      setActiveUsers(activeCount);
      setDbError(false);
    }, (error) => {
      console.log("Failed to fetch students", error);
      setDbError(true);
    });

    // Real-time listener for Exam Messages
    const qMessages = query(collection(db, 'examMessages'), orderBy('timestamp', 'desc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
      setExamMessages(messages);
    }, (error) => {
      console.log("Failed to fetch messages", error);
    });

    // Real-time listeners for Folder Manager
    const unsubBatches = onSnapshot(collection(db, 'batches'), (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubFolders = onSnapshot(collection(db, 'folders'), (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubVideos = onSnapshot(collection(db, 'videos'), (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qPayments = query(collection(db, 'payments'), where("status", "==", "pending"));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAllPayments = query(collection(db, 'payments'), orderBy("createdAt", "desc"), limit(10));
    const unsubAllPayments = onSnapshot(qAllPayments, (snapshot) => {
      setAllPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
      setPublishedExams(list);
    });

    const unsubStreams = onSnapshot(collection(db, 'streams'), (snapshot) => {
      setStreams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubMessages();
      unsubBatches();
      unsubStreams();
      unsubCourses();
      unsubFolders();
      unsubVideos();
      unsubPayments();
      unsubAllPayments();
      unsubExams();
    };
  }, [user]);

  const handleApprovePayment = async (paymentId: string, studentId: string, folderId: string) => {
    try {
      const userRef = doc(db, 'users', studentId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const folderAccess = userData.folderAccess || {};
        const now = Date.now();
        const currentExp = folderAccess[folderId] && folderAccess[folderId] > now ? folderAccess[folderId] : now;
        folderAccess[folderId] = currentExp + (30 * 24 * 60 * 60 * 1000);
        
        const batch = writeBatch(db);
        batch.update(userRef, { folderAccess });
        batch.update(doc(db, 'payments', paymentId), { status: 'approved' });
        await batch.commit();
      }
    } catch (e) {
      console.error("Failed to approve payment", e);
      alert("Failed to approve payment.");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (confirm("Are you sure you want to reject this payment receipt?")) {
      try {
        await updateDoc(doc(db, 'payments', paymentId), { status: 'rejected' });
      } catch (e) {
        console.error("Failed to reject payment", e);
        alert("Failed to reject payment.");
      }
    }
  };

  const handleSaveStudentDetails = async () => {
    if (!editingStudentData || !selectedStudentInfo) return;
    try {
      await updateDoc(doc(db, 'users', selectedStudentInfo.id), {
        name: editingStudentData.name,
        email: editingStudentData.email,
        phone: editingStudentData.phone,
        parentPhone: editingStudentData.parentPhone,
        nicNumber: editingStudentData.nicNumber,
        graduationYear: editingStudentData.graduationYear,
        address: editingStudentData.address,
        dob: editingStudentData.dob,
        school: editingStudentData.school,
        gender: editingStudentData.gender,
        stream: editingStudentData.stream,
      });
      setSelectedStudentInfo({ ...selectedStudentInfo, ...editingStudentData });
      setIsEditingStudent(false);
      alert("Student details updated successfully!");
    } catch (err) {
      console.error("Failed to update student", err);
      alert("Failed to update student details.");
    }
  };

  const handleApproveStudent = async (studentId: string) => {
    try {
      await updateDoc(doc(db, 'users', studentId), { isApproved: true, pendingReason: null });
      // Remove from pending instantly for better UX; snapshot will sync it fully.
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (err) {
      console.log("Failed to approve student", err);
    }
  };

  const handleSuspendStudent = async (studentId: string) => {
    try {
      if (!confirm("Are you sure you want to disable login access for this student? They will be moved to the Pending Approvals list.")) return;
      await updateDoc(doc(db, 'users', studentId), { isApproved: false, pendingReason: 'Access Suspended' });
      // The onSnapshot listener will automatically move them to pendingStudents.
    } catch (err) {
      console.log("Failed to suspend student", err);
    }
  };

  const handleDeleteUserAccount = async (userId: string, userName: string, role: string = "User") => {
    if (confirmingDeleteId !== userId) {
      setConfirmingDeleteId(userId);
      alert(`⚠️ DANGER: You are about to PERMANENTLY delete ${userName}'s account (${role}) and ALL their history from the database. Click the delete button again to confirm.`);
      return;
    }
    
    try {
      // 1. Delete user from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      // 2. Delete all exam results for this user
      const qExams = query(collection(db, 'examResults'), where("userId", "==", userId));
      const examSnaps = await getDocs(qExams);
      const batch = writeBatch(db);
      examSnaps.forEach(docSnap => batch.delete(docSnap.ref));
      
      // 3. Delete payments for this user
      const qPayments = query(collection(db, 'payments'), where("studentId", "==", userId));
      const paymentSnaps = await getDocs(qPayments);
      paymentSnaps.forEach(docSnap => batch.delete(docSnap.ref));
      
      await batch.commit();

      alert(`✅ Account for ${userName} (${role}) has been permanently deleted from the database. They can now sign up from the beginning.`);
      if (selectedStudentInfo?.id === userId) setSelectedStudentInfo(null);
      if (selectedTeacherDetails?.id === userId) setSelectedTeacherDetails(null);
      setConfirmingDeleteId(null);
    } catch (err) {
      alert("Failed to delete account. Please try again.");
      console.error(err);
    }
  };

  const handleDeleteStudentAccount = (studentId: string, studentName: string) => 
    handleDeleteUserAccount(studentId, studentName, "Student");

  const handleRejectStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, 'users', studentId));
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (err) {
      console.log("Failed to reject student", err);
    }
  };

  const handleSignoutStudentDevice = async (studentId: string, studentName?: string) => {
    if (!confirm(`Are you sure you want to force sign out ${studentName || 'this student'} from their currently logged-in device? They will be immediately disconnected.`)) {
      return;
    }
    try {
      await updateDoc(doc(db, 'users', studentId), {
        deviceId: 'REVOKED',
        lastForcedLogout: Date.now()
      });
      setSelectedStudentInfo((prev: any) => prev && prev.id === studentId ? { ...prev, deviceId: 'REVOKED' } : prev);
      alert(`Success: ${studentName || 'Student'} has been signed out from their logged-in device!`);
    } catch (err) {
      console.error("Failed to sign out student device:", err);
      alert("Failed to sign out student device. Please try again.");
    }
  };

  const handleAllowRedo = async (examId: string, studentId: string) => {
    if (!confirm("Are you sure you want to allow this student to redo the exam? This will completely delete their current exam submission from the database.")) return;
    try {
      const qResult = query(collection(db, 'examResults'), where('userId', '==', studentId), where('examId', '==', examId));
      const snap = await getDocs(qResult);
      const batch = writeBatch(db);
      snap.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      alert("Exam result deleted. The student can now retake the exam.");
    } catch (err) {
      console.error("Failed to allow redo", err);
      alert("Failed to allow redo.");
    }
  };

  const handleResolveMessage = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'examMessages', messageId), { status: 'read' });
    } catch (err) {
      console.error("Failed to resolve message", err);
    }
  };

  const filteredStudents = allStudents.filter(s => {
    const matchBatch = studentFilterBatch === "All" || s.graduationYear === studentFilterBatch;
    const matchStatus = studentFilterStatus === "All" || 
      (studentFilterStatus === "Active" ? s.isApproved : 
       studentFilterStatus === "Suspended" ? (!s.isApproved && s.pendingReason === 'Access Suspended') : 
       (!s.isApproved && s.pendingReason !== 'Access Suspended'));
    const matchSearch = !studentSearchTerm || 
      (s.name?.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
      (s.studentId?.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
      (s.phone?.includes(studentSearchTerm)) ||
      (s.nicNumber?.includes(studentSearchTerm));
    return matchBatch && matchStatus && matchSearch;
  });

  const handleSaveStudentAccess = async () => {
    if (!selectedStudentForAccess) return;
    try {
      await updateDoc(doc(db, 'users', selectedStudentForAccess.id), {
        folderAccess: studentFolderAccess
      });
      setSelectedStudentForAccess(null);
      alert("Student access updated successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to update access");
    }
  };

  const handleBulkAccess = async () => {
    if (!bulkStudentIds.trim() || !bulkFolderId) return;
    
    // Parse input (allow commas, spaces, or newlines)
    const rawIds = bulkStudentIds.split(/[\s,]+/).map(id => id.trim()).filter(id => id.length > 0);
    
    // Find matching users in allStudents array
    const matchedUsers = allStudents.filter(s => rawIds.includes(s.studentId) || rawIds.includes(s.email));
    
    if (matchedUsers.length === 0) {
      alert("No matching students found. Please verify the IDs.");
      return;
    }

    if (!confirm(`Are you sure you want to grant 30-days access to folder '${folders.find(f=>f.id===bulkFolderId)?.name}' for ${matchedUsers.length} students?`)) return;

    try {
      const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000;
      
      const batch = writeBatch(db);
      matchedUsers.forEach(user => {
        const userRef = doc(db, 'users', user.id);
        const currentFolderAccess = user.folderAccess || {};
        batch.update(userRef, {
          folderAccess: { ...currentFolderAccess, [bulkFolderId]: expiration }
        });
      });
      
      await batch.commit();
      alert(`Successfully granted access to ${matchedUsers.length} students!`);
      setBulkStudentIds("");
      setBulkFolderId("");
    } catch (err) {
      console.error("Bulk access failed", err);
      alert("Bulk access failed. Check console.");
    }
  };

  const handleBulkAccessFiltered = async () => {
    if (filteredStudents.length === 0 || !bulkFolderId) return;

    if (!confirm(`Are you sure you want to grant 30-days access to folder '${folders.find(f=>f.id===bulkFolderId)?.name}' for ALL ${filteredStudents.length} students currently matching your filters in the table?`)) return;

    try {
      const expiration = Date.now() + 30 * 24 * 60 * 60 * 1000;
      
      const batchOp = writeBatch(db);
      filteredStudents.forEach(user => {
        const userRef = doc(db, 'users', user.id);
        const currentFolderAccess = user.folderAccess || {};
        batchOp.update(userRef, {
          folderAccess: { ...currentFolderAccess, [bulkFolderId]: expiration }
        });
      });
      
      await batchOp.commit();
      alert(`Successfully granted access to ${filteredStudents.length} students!`);
      setBulkFolderId("");
    } catch (err) {
      console.error("Bulk access failed", err);
      alert("Bulk access failed. Check console.");
    }
  };

  // Auto-select if there's only one batch or course to save clicks and prevent confusion
  useEffect(() => {
    if (batches.length === 1 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  useEffect(() => {
    if (selectedBatchId) {
      const activeCourses = courses.filter(c => c.batchId === selectedBatchId);
      if (activeCourses.length === 1 && !selectedCourseId) {
        setSelectedCourseId(activeCourses[0].id);
      }
    }
  }, [courses, selectedBatchId, selectedCourseId]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName || !newBatchYear) return;
    try {
      // using random string or docRef for id
      const ref = doc(collection(db, 'batches'));
      await setDoc(ref, { name: newBatchName, year: newBatchYear, createdAt: Date.now() });
      setNewBatchName("");
      setNewBatchYear("");
      setSelectedBatchId(ref.id); // Auto-select so user can immediately add courses
    } catch (err) {
      console.log(err);
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName) return;
    try {
      const ref = doc(collection(db, 'streams'));
      await setDoc(ref, { name: newStreamName, createdAt: Date.now() });
      setNewStreamName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStream = async (id: string) => {
    if (confirm("Are you sure you want to delete this stream?")) {
      await deleteDoc(doc(db, 'streams', id));
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (confirm("Are you sure? This will not delete sub-courses yet in this simple version.")) {
      await deleteDoc(doc(db, 'batches', id));
      if (selectedBatchId === id) {
        setSelectedBatchId(null);
        setSelectedCourseId(null);
      }
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName || !selectedBatchId) return;
    try {
      let thumbnailUrl = "";
      if (newCourseImage) {
        thumbnailUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_WIDTH = 800;
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
          reader.readAsDataURL(newCourseImage);
        });
      }
      
      const assignedTeacher = teamMembers.find(m => m.id === newCourseTeacherId);
      const ref = doc(collection(db, 'courses'));
      await setDoc(ref, { 
        name: newCourseName, 
        description: newCourseDescription,
        batchId: selectedBatchId, 
        image: thumbnailUrl || null,
        teacherId: newCourseTeacherId || null,
        teacherName: assignedTeacher ? (assignedTeacher.name || assignedTeacher.email?.split('@')[0]) : null,
        teacherSubject: assignedTeacher?.subject || null,
        createdAt: Date.now() 
      });

      // Notify students about the new course
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        target: "all_students",
        title: "New Course Available! 🎓",
        message: `A new course "${newCourseName}" has been added to your batch.`,
        link: "/courses",
        timestamp: Date.now(),
        type: "course",
        readBy: []
      });

      setNewCourseName("");
      setNewCourseDescription("");
      setNewCourseImage(null);
      setNewCourseTeacherId("");
      setSelectedCourseId(ref.id); // Auto-select so user can immediately add folders
    } catch (err) {
      console.log(err);
      alert("Failed to create course. The image might be too large.");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (confirm("Are you sure?")) {
      await deleteDoc(doc(db, 'courses', id));
      if (selectedCourseId === id) setSelectedCourseId(null);
    }
  };

  const handleSaveCourse = async (id: string) => {
    if (!editCourseName.trim()) return;
    try {
      const updateData: any = { 
        name: editCourseName,
        description: editCourseDescription
      };
      if (editCourseTeacherId !== undefined) {
        const assignedTeacher = teamMembers.find(m => m.id === editCourseTeacherId);
        updateData.teacherId = editCourseTeacherId || null;
        updateData.teacherName = assignedTeacher ? (assignedTeacher.name || assignedTeacher.email?.split('@')[0]) : null;
        updateData.teacherSubject = assignedTeacher?.subject || null;
      }
      await updateDoc(doc(db, 'courses', id), updateData);
      setEditingCourseId(null);
      setEditCourseTeacherId("");
    } catch (e) {
      console.error("Failed to update course", e);
      alert("Failed to update course.");
    }
  };
  const handleCopyCourseDeep = async (oldCourse: any) => {
    if (!selectedBatchId) return;
    try {
      // 1. Create New Course
      const newCourseRef = doc(collection(db, 'courses'));
      await setDoc(newCourseRef, {
        name: oldCourse.name,
        batchId: selectedBatchId,
        image: oldCourse.image || oldCourse.thumbnailUrl || null,
        createdAt: Date.now()
      });

      // 2. Find old folders for this course
      const oldFolders = folders.filter(f => f.courseId === oldCourse.id);
      
      const batchOp = writeBatch(db);
      
      for (const oldFolder of oldFolders) {
        const newFolderRef = doc(collection(db, 'folders'));
        batchOp.set(newFolderRef, {
          name: oldFolder.name,
          price: oldFolder.price || 0,
          courseId: newCourseRef.id,
          batchId: selectedBatchId,
          createdAt: Date.now()
        });
        
        // 3. Find old videos for this folder
        const oldVideos = videos.filter(v => v.folderId === oldFolder.id);
        for (const oldVideo of oldVideos) {
          const newVideoRef = doc(collection(db, 'videos'));
          batchOp.set(newVideoRef, {
            title: oldVideo.title,
            vimeoUrl: oldVideo.vimeoUrl,
            description: oldVideo.description || "",
            folderId: newFolderRef.id,
            courseId: newCourseRef.id,
            batchId: selectedBatchId,
            createdAt: Date.now()
          });
        }
      }
      
      await batchOp.commit();
      setSelectedCourseId(newCourseRef.id);
    } catch (err) {
      console.error(err);
      alert("Failed to copy the course completely.");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName || !selectedCourseId) return;
    try {
      const ref = doc(collection(db, 'folders'));
      await setDoc(ref, { 
        name: newFolderName, 
        courseId: selectedCourseId, 
        price: Number(newFolderPrice) || 0,
        createdAt: Date.now() 
      });
      setNewFolderName("");
      setNewFolderPrice("");
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (confirm("Are you sure?")) {
      await deleteDoc(doc(db, 'folders', id));
    }
  };

  const handleEditFolder = (f: any) => {
    setEditingFolderId(f.id);
    setEditFolderName(f.name);
    setEditFolderPrice(f.price?.toString() || "");
  };

  const handleSaveFolder = async (id: string) => {
    try {
      await updateDoc(doc(db, 'folders', id), {
        name: editFolderName,
        price: parseFloat(editFolderPrice) || 0
      });
      setEditingFolderId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditVideo = (v: any) => {
    setEditingVideoId(v.id);
    setEditVideoTitle(v.title);
    setEditVideoUrl(v.url);
  };

  const handleSaveVideo = async (id: string) => {
    try {
      await updateDoc(doc(db, 'videos', id), {
        title: editVideoTitle,
        url: editVideoUrl
      });
      setEditingVideoId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (confirm("Delete this video?")) {
      await deleteDoc(doc(db, 'videos', id));
    }
  };

  // Simulated form states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadItemType, setUploadItemType] = useState<"video" | "resource">("video");
  const [uploadFileBase64, setUploadFileBase64] = useState<string | null>(null);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPlatform, setVideoPlatform] = useState("youtube");
  const [videoBatchId, setVideoBatchId] = useState("");
  const [videoCourseId, setVideoCourseId] = useState("");
  const [videoFolderId, setVideoFolderId] = useState("");
  
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [examSuccess, setExamSuccess] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState<"mcq" | "essay">("mcq");
  const [examPdfFile, setExamPdfFile] = useState<File | null>(null);
  const [examPdfUrl, setExamPdfUrl] = useState("");
  const [examPdfUploading, setExamPdfUploading] = useState(false);
  const [examPdfUploadProgress, setExamPdfUploadProgress] = useState(0);
  const [examBatchId, setExamBatchId] = useState("");
  const [examCourseId, setExamCourseId] = useState("");
  const [examFolderId, setExamFolderId] = useState("");
  const [examTime, setExamTime] = useState("");
  const [examStartTime, setExamStartTime] = useState("");
  const [examEndTime, setExamEndTime] = useState("");
  const [examCategory, setExamCategory] = useState("Mechanics");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [publishedExams, setPublishedExams] = useState<any[]>([]);

  // Exam Filtering States
  const [examSearchTerm, setExamSearchTerm] = useState("");
  const [examFilterCourse, setExamFilterCourse] = useState("all");
  const [examFilterFolder, setExamFilterFolder] = useState("all");
  const [examFilterType, setExamFilterType] = useState("all");
  const [examFilterDate, setExamFilterDate] = useState("all");

  // Team Management States
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [newTeamEmail, setNewTeamEmail] = useState("");
  const [newTeamRole, setNewTeamRole] = useState<"admin" | "teacher">("teacher");
  const [newTeamSubject, setNewTeamSubject] = useState("");
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);
  const [selectedTeacherDetails, setSelectedTeacherDetails] = useState<any | null>(null);
  const [editingTeacherSubjectId, setEditingTeacherSubjectId] = useState<string | null>(null);
  const [editTeacherSubjectValue, setEditTeacherSubjectValue] = useState("");

  // Course Teacher Filter & Assignment
  const [courseTeacherFilter, setCourseTeacherFilter] = useState<string>("all");
  const [newCourseTeacherId, setNewCourseTeacherId] = useState<string>("");
  const [editCourseTeacherId, setEditCourseTeacherId] = useState<string>("");

  // My Profile States
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSubject, setProfileSubject] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  // Each question has: text, image, options, correct
  const [questions, setQuestions] = useState<any[]>([{ 
    id: Date.now(), 
    text: "", 
    image: null, 
    options: { A: "", B: "", C: "", D: "" }, 
    correct: "A" 
  }]);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (!success) {
      setError("Invalid admin email or password");
    }
  };

  // Team Members - load admins and teachers
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) return;
    const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'teacher']));
    const unsub = onSnapshot(q, (snap) => {
      setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Pre-fill profile fields when user loads
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePhone((user as any).phone || "");
      setProfileSubject((user as any).subject || "");
      setProfileBio((user as any).bio || "");
    }
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      // Update name via auth helper
      if (profileName.trim() && profileName !== user.name) {
        await updateProfileName(profileName.trim());
      }
      // Update extra fields in Firestore directly
      await updateDoc(doc(db, 'users', user.uid), {
        phone: profilePhone.trim(),
        subject: profileSubject.trim(),
        bio: profileBio.trim(),
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setProfilePhotoUploading(true);
    try {
      await updateProfilePicture(e.target.files[0]);
    } catch (err) {
      alert("Photo upload failed.");
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamEmail.trim()) return;
    setIsAddingTeamMember(true);
    try {
      // Find user by email in allStudents or search Firestore
      const q = query(collection(db, 'users'), where('email', '==', newTeamEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("No account found with that email. The person must sign up first before being made a teacher/admin.");
        return;
      }
      const targetDoc = snap.docs[0];
      await updateDoc(doc(db, 'users', targetDoc.id), {
        role: newTeamRole,
        subject: newTeamSubject.trim() || (newTeamRole === 'teacher' ? 'Physics' : 'Administration'),
        isApproved: true,
        pendingReason: null,
      });
      setNewTeamEmail("");
      setNewTeamSubject("");
      alert(`✅ ${newTeamEmail} has been made a ${newTeamRole}!`);
    } catch (err) {
      alert("Failed to update user role.");
      console.error(err);
    } finally {
      setIsAddingTeamMember(false);
    }
  };

  const handleSaveTeacherSubject = async (memberId: string, subject: string) => {
    try {
      await updateDoc(doc(db, 'users', memberId), { subject: subject.trim() });
      if (selectedTeacherDetails && selectedTeacherDetails.id === memberId) {
        setSelectedTeacherDetails((prev: any) => prev ? { ...prev, subject: subject.trim() } : null);
      }
      setEditingTeacherSubjectId(null);
      alert("Teacher subject updated successfully!");
    } catch (err) {
      alert("Failed to update teacher subject.");
    }
  };

  const handleSaveTeacherProfilePicture = async (memberId: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        // Resize image before storing
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const size = 400;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          // Crop square from center
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          await updateDoc(doc(db, 'users', memberId), { profilePicture: base64 });
          setSelectedTeacherDetails((prev: any) => prev ? { ...prev, profilePicture: base64 } : null);
          alert("Profile picture updated successfully!");
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Failed to update profile picture.");
    }
  };

  const handleRemoveTeamMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team? They will become a student.`)) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { role: 'student', isApproved: false, pendingReason: 'Role removed' });
    } catch (err) {
      alert("Failed to remove team member.");
    }
  };

  const handleResetTeamMember2FA = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to reset 2FA for ${memberName}? They will be prompted to scan a new Google Authenticator QR code upon their next login.`)) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { totpSecret: null });
      if (selectedTeacherDetails && selectedTeacherDetails.id === memberId) {
        setSelectedTeacherDetails((prev: any) => prev ? { ...prev, totpSecret: null } : null);
      }
      alert(`✅ 2FA has been reset for ${memberName}. They will scan a new QR code upon next login.`);
    } catch (err) {
      alert("Failed to reset 2FA.");
      console.error(err);
    }
  };

  const handleApprovePendingTeacher = async (memberId: string, memberName: string) => {
    if (!confirm(`Approve ${memberName} as a teacher? They will gain full teacher access.`)) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { isApproved: true, pendingReason: null });
      alert(`✅ ${memberName} has been approved as a teacher!`);
    } catch (err) {
      alert("Failed to approve teacher.");
      console.error(err);
    }
  };

  const handleRejectPendingTeacher = async (memberId: string, memberName: string) => {
    if (!confirm(`Reject ${memberName}'s teacher application? Their account will be converted to a student.`)) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { role: 'student', isApproved: false, pendingReason: 'Teacher application rejected' });
      alert(`${memberName}'s teacher application has been rejected.`);
    } catch (err) {
      alert("Failed to reject teacher application.");
      console.error(err);
    }
  };

  const handleUploadItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadSuccess(false);
    try {
      let finalUrl = uploadItemType === "resource" && uploadFileBase64 ? uploadFileBase64 : videoUrl;
      let effectivePlatform = videoPlatform;
      
      if (uploadItemType === "resource" && resourceFile) {
        finalUrl = await uploadToS3(resourceFile, "course-resources");
      } else if (uploadItemType === "video" && videoPlatform === "s3" && resourceFile) {
        finalUrl = await uploadToS3(resourceFile, "course-videos");
        effectivePlatform = "direct";
      }
      
      if (!videoTitle || !finalUrl || !videoFolderId) {
        alert("Please provide a title, a folder, and either a URL or a file to upload.");
        setIsUploading(false);
        return;
      }

      const ref = doc(collection(db, 'videos')); // we keep it in 'videos' collection for simplicity, just add type
      await setDoc(ref, {
        title: videoTitle,
        url: finalUrl,
        type: uploadItemType,
        platform: uploadItemType === 'video' ? effectivePlatform : null,
        batchId: videoBatchId,
        courseId: videoCourseId,
        folderId: videoFolderId,
        createdAt: Date.now()
      });
      setIsUploading(false);
      setUploadSuccess(true);
      alert("✅ Done! File uploaded and saved successfully.");
      setVideoTitle("");
      setVideoUrl("");
      setUploadFileBase64(null);
      setResourceFile(null);
      setTimeout(() => setUploadSuccess(false), 6000);
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + (err?.message || "Unknown error"));
      setIsUploading(false);
    }
  };

  const handleQuestionChange = (id: number, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleOptionChange = (id: number, optionKey: string, value: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, options: { ...q.options, [optionKey]: value } } : q));
  };

  const handleImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        handleQuestionChange(id, 'image', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      try {
        await deleteDoc(doc(db, 'exams', id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleToggleHide = async (id: string) => {
    const exam = publishedExams.find(e => e.id === id);
    if (!exam) return;
    try {
      await updateDoc(doc(db, 'exams', id), { hidden: !exam.hidden });
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndExamNow = async (id: string, examTitle?: string) => {
    const title = examTitle || "this exam";
    if (!confirm(`Are you sure you want to END "${title}" right now? Submissions will close immediately for all students.`)) {
      return;
    }
    try {
      await updateDoc(doc(db, 'exams', id), {
        endTime: Date.now() - 1000,
      });
      alert(`✅ "${title}" has been ended now! Submissions are now closed.`);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to end exam: ${e.message || 'Unknown error'}`);
    }
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 75) return 'A';
    if (percentage >= 65) return 'B';
    if (percentage >= 55) return 'C';
    if (percentage >= 35) return 'S';
    return 'W';
  };

  const handleGradeSubmission = async (resultId: string) => {
    if (!gradingScore) {
      alert("Please enter a score.");
      return;
    }

    setIsGradingSubmitting(true);
    try {
      let correctedPdfUrl = null;
      if (gradingPdfFile) {
        correctedPdfUrl = await uploadToS3(gradingPdfFile, "grading-pdfs");
      }

      const scoreNum = parseFloat(gradingScore);
      const letterGrade = getLetterGrade(scoreNum);

      await updateDoc(doc(db, 'examResults', resultId), {
        status: 'graded',
        score: scoreNum,
        rawScore: scoreNum,
        grade: letterGrade,
        feedback: gradingFeedback,
        ...(correctedPdfUrl && { correctedPdfUrl }),
        gradedAt: new Date().toISOString()
      });

      setExamDetailedResults(prev => 
        prev.map(r => r.id === resultId ? {
          ...r, 
          status: 'graded',
          score: scoreNum,
          rawScore: scoreNum,
          grade: letterGrade,
          feedback: gradingFeedback,
          ...(correctedPdfUrl && { correctedPdfUrl })
        } : r)
      );

      setGradingResultId(null);
      setGradingScore('');
      setGradingFeedback('');
      setGradingPdfFile(null);
    } catch (e) {
      console.error("Error submitting grade:", e);
      alert("Failed to submit grade.");
    } finally {
      setIsGradingSubmitting(false);
    }
  };

  const handlePublishGrades = async () => {
    if (!selectedExamDetails) return;
    try {
      await updateDoc(doc(db, 'exams', selectedExamDetails.id), {
        gradesPublished: true
      });
      setSelectedExamDetails({...selectedExamDetails, gradesPublished: true});
      alert("Grades and ranks have been published to students!");
    } catch (e) {
      console.error(e);
      alert("Failed to publish grades.");
    }
  };

  const handleOpenExamDetails = async (exam: any) => {
    setSelectedExamDetails(exam);
    setLoadingExamDetails(true);
    setExamDetailedResults([]);
    try {
      const q = query(collection(db, 'examResults'), where('examId', '==', String(exam.id)));
      const snap = await getDocs(q);
      const results: any[] = [];
      snap.forEach(d => {
        results.push({ id: d.id, ...d.data() });
      });

      // Rank results: high score first, then quickest time
      results.sort((a, b) => {
        const scoreA = Number(a.score ?? a.rawScore ?? 0);
        const scoreB = Number(b.score ?? b.rawScore ?? 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (Number(a.timeTakenSeconds ?? a.timeSeconds ?? 999999)) - (Number(b.timeTakenSeconds ?? b.timeSeconds ?? 999999));
      });

      setExamDetailedResults(results);
    } catch (err) {
      console.error("Failed to load exam details results:", err);
    } finally {
      setLoadingExamDetails(false);
    }
  };

  const formatDatetimeLocal = (val: any) => {
    if (!val) return "";
    if (typeof val === 'string' && val.includes('T')) return val;
    const d = new Date(typeof val === 'number' ? val : Number(val) || val);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEditExam = (exam: any) => {
    setEditingExamId(exam.id);
    setExamTitle(exam.title || "");
    setExamType(exam.examType || "mcq");
    setExamPdfUrl(exam.questionPdfUrl || "");
    setExamPdfFile(null);
    setExamTime(exam.durationSeconds ? (exam.durationSeconds / 60).toString() : (exam.duration ? exam.duration.split(" ")[0] : "15"));
    setExamStartTime(formatDatetimeLocal(exam.startTimeString || exam.startTime));
    setExamEndTime(formatDatetimeLocal(exam.endTimeString || exam.endTime));
    setExamCategory(exam.category || "Mechanics");
    setExamBatchId(exam.batchId || "all");
    setExamCourseId(exam.courseId || "");
    setExamFolderId(exam.folderId || "");
    if (Array.isArray(exam.questions)) {
      setQuestions(exam.questions.map((q: any) => ({
        id: q.id, 
        text: q.text || "",
        image: q.image || null,
        options: { 
          A: q.options?.[0]?.text || q.options?.A || "", 
          B: q.options?.[1]?.text || q.options?.B || "", 
          C: q.options?.[2]?.text || q.options?.C || "", 
          D: q.options?.[3]?.text || q.options?.D || "" 
        },
        correct: q.correct || "A"
      })));
    } else {
      setQuestions([{ id: Date.now(), text: "", image: null, options: { A: "", B: "", C: "", D: "" }, correct: "A" }]);
    }
    const formEl = document.getElementById('exam-editor-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveExam = async () => {
    setIsSavingExam(true);
    setExamSuccess(false);
    
    let finalPdfUrl = examPdfUrl;
    if (examType === 'essay' && examPdfFile) {
      setExamPdfUploading(true);
      setExamPdfUploadProgress(0);
      try {
        finalPdfUrl = await uploadToS3(examPdfFile, "exam-pdfs");
      } catch (err: any) {
        console.error("PDF upload failed", err);
        alert(`Failed to upload the PDF paper. Error: ${err.message || 'Unknown error'}`);
        setIsSavingExam(false);
        setExamPdfUploading(false);
        return;
      }
      setExamPdfUploading(false);
    }
    
    // Create new exam object
    const newExam = {
      title: examTitle || "Untitled Exam",
      examType: examType,
      questionPdfUrl: finalPdfUrl,
      category: examCategory,
      batchId: examBatchId,
      courseId: examCourseId,
      folderId: examFolderId,
      startTime: examStartTime ? new Date(examStartTime).getTime() : 0,
      endTime: examEndTime ? new Date(examEndTime).getTime() : 0,
      startTimeString: examStartTime,
      endTimeString: examEndTime,
      questions: examType === 'mcq' ? questions.map((q, idx) => ({
        id: idx + 1,
        text: q.text || `Question ${idx + 1}`,
        image: q.image,
        options: [
          { id: "A", text: q.options.A || "Option A" },
          { id: "B", text: q.options.B || "Option B" },
          { id: "C", text: q.options.C || "Option C" },
          { id: "D", text: q.options.D || "Option D" },
        ],
        correct: q.correct
      })) : [],
      duration: `${examTime || 15} min`,
      durationSeconds: parseInt(examTime || "15") * 60,
      course: examCategory + " Mastery",
      updatedAt: Date.now()
    };

    try {
      if (editingExamId) {
        await updateDoc(doc(db, 'exams', editingExamId), newExam);
      } else {
        const newExamRef = doc(collection(db, 'exams'));
        await setDoc(newExamRef, { ...newExam, hidden: false, createdAt: Date.now() });
        
        // Notify students about the new exam
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          target: "all_students",
          title: "New Exam Published! 🚀",
          message: `The exam "${newExam.title}" is now available.`,
          link: "/exams",
          timestamp: Date.now(),
          type: "exam",
          readBy: []
        });
      }
      
      // Reset form
      setExamTitle("");
      setExamType("mcq");
      setExamPdfUrl("");
      setExamPdfFile(null);
      setExamTime("");
      setExamStartTime("");
      setExamEndTime("");
      setExamCategory("Mechanics");
      setEditingExamId(null);
      setQuestions([{ id: Date.now(), text: "", image: null, options: { A: "", B: "", C: "", D: "" }, correct: "A" }]);
      
      setIsSavingExam(false);
      setExamSuccess(true);
      setTimeout(() => setExamSuccess(false), 3000);
    } catch (e: any) {
      console.log("Failed to save exam", e?.message || e);
      setIsSavingExam(false);
      if (e?.code === 'resource-exhausted') {
        alert("Cannot save exam right now: Firebase daily write quota is exceeded. Please upgrade to Blaze plan or try again after quota resets at midnight.");
      } else {
        alert("Failed to save exam: " + (e?.message || "Unknown error"));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-zinc-950 -mx-4 -my-8 px-4 py-8">
        <p className="animate-pulse text-xl text-primary font-bold">Verifying Credentials...</p>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "teacher")) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-zinc-950 -mx-4 -my-8 px-4 py-8">
        <Card className="w-full max-w-md border-primary/30 bg-black shadow-2xl shadow-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
              <Settings className="w-6 h-6" /> Admin Portal
            </CardTitle>
            <CardDescription className="text-muted-foreground">Restricted system access.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-foreground/90">Admin Email</Label>
                <Input id="admin-email" type="email" placeholder="admin@physicsbeast.com" className="bg-zinc-900 border-border text-foreground" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-foreground/90">Password</Label>
                <Input id="admin-password" type="password" className="bg-zinc-900 border-border text-foreground" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-black font-bold">Authenticate</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // LIVE ANALYTICS COMPUTATIONS
  const todayStr = new Date().toISOString().split('T')[0];
  const nowMs = Date.now();
  const approvedStudents = allStudents.filter(s => s.isApproved);
  
  // Active on website in last 2 minutes
  const liveStudyingStudents = approvedStudents.filter(s => s.lastOnlinePing && (nowMs - s.lastOnlinePing) < 120000);
  const liveStudyingCount = liveStudyingStudents.length;
  
  const studiedTodayStudents = approvedStudents.filter(s => s.lastStudyDate === todayStr);
  const studiedTodayCount = studiedTodayStudents.length;
  
  const notStudiedTodayStudents = approvedStudents.filter(s => s.lastStudyDate !== todayStr);
  const notStudiedTodayCount = notStudiedTodayStudents.length;
  
  const nowObj = new Date();
  const todayStrGlobal = new Date(nowObj.getTime() - (nowObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const totalTodayStudyTimeAll = approvedStudents.reduce((sum, s) => sum + (s.lastStudyDate === todayStrGlobal ? (s.todayStudyTimeMins || 0) : 0), 0);
  const avgStudyTime = approvedStudents.length > 0 ? Math.round(totalTodayStudyTimeAll / approvedStudents.length) : 0;

  const filteredExams = publishedExams.filter((exam) => {
    if (examFilterCourse !== "all" && exam.courseId !== examFilterCourse) return false;
    if (examFilterFolder !== "all" && exam.folderId !== examFilterFolder) return false;
    if (examFilterType !== "all" && exam.examType !== examFilterType) return false;
    if (examFilterDate !== "all") {
      const examDate = exam.createdAt || exam.updatedAt || 0;
      const diff = Date.now() - examDate;
      const oneDay = 24 * 60 * 60 * 1000;
      if (examFilterDate === "today" && diff > oneDay) return false;
      if (examFilterDate === "this_week" && diff > 7 * oneDay) return false;
      if (examFilterDate === "this_month" && diff > 30 * oneDay) return false;
    }

    if (examSearchTerm) {
      const term = examSearchTerm.toLowerCase();
      const courseName = courses.find(c => c.id === exam.courseId)?.name || "";
      const folderName = folders.find(f => f.id === exam.folderId)?.name || "";
      const category = exam.category || "";
      const type = exam.examType || "";
      
      let dateString = "";
      if (exam.startTime) dateString += new Date(exam.startTime).toLocaleDateString() + " ";
      if (exam.endTime) dateString += new Date(exam.endTime).toLocaleDateString() + " ";

      const searchableText = `${exam.title || ""} ${category} ${type} ${courseName} ${folderName} ${dateString}`.toLowerCase();
      if (!searchableText.includes(term)) {
        return false;
      }
    }

    return true;
  });

  const filteredMessages = examMessages.filter((msg) => {
    const isTeacher = user?.role === 'teacher';
    
    // 1. Role-based restrictions
    const adminOnlyTypes = ['exam_exit', 'technical', 'approval', 'apprual', 'exam_issue', 'contact_us'];
    if (isTeacher && adminOnlyTypes.includes(msg.type)) {
      return false;
    }

    // Determine course ID for the message
    let msgCourseId = msg.courseId;
    if (!msgCourseId && msg.examId) {
      const exam = publishedExams.find(e => e.id === msg.examId);
      if (exam) msgCourseId = exam.courseId;
    }
    if (!msgCourseId && msg.videoId) {
      const video = videos.find(v => v.id === msg.videoId);
      if (video) msgCourseId = video.courseId;
    }

    // 2. Teacher specific course filtering
    if (isTeacher && msgCourseId) {
      const course = courses.find(c => c.id === msgCourseId);
      if (course && course.teacherId !== user.uid) {
        return false;
      }
    }

    // 3. Category Filter (Academic vs Support)
    if (msgCategory === "academic") {
      const academicTypes = ['post_exam_doubt', 'video_doubt', 'exam_issue'];
      if (msg.type && !academicTypes.includes(msg.type)) return false;
    } else if (msgCategory === "support") {
      const supportTypes = ['contact_us', 'technical', 'exam_exit', 'approval', 'apprual'];
      if (!supportTypes.includes(msg.type)) return false;
    }

    // 4. UI Filters
    if (msgFilterType !== "All" && msg.type !== msgFilterType) return false;
    if (msgFilterCourse !== "All" && msgCourseId !== msgFilterCourse) return false;

    if (msgSearchQuery.trim()) {
      const q = msgSearchQuery.toLowerCase();
      const matchName = msg.studentName?.toLowerCase().includes(q);
      const matchExam = msg.examTitle?.toLowerCase().includes(q);
      const matchMsg = msg.message?.toLowerCase().includes(q);
      if (!matchName && !matchExam && !matchMsg) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {dbError && (
        <div className="bg-red-500/10 border-2 border-red-500 p-6 rounded-xl text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-500 flex items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8" /> DATABASE IS TURNED OFF
          </h2>
          <p className="text-red-400 font-medium">
            Your Firestore Database is literally completely turned off in the Firebase Console. No students can save their data, which is why your Admin Panel is empty!
          </p>
          <div className="bg-black/50 p-4 rounded-lg inline-block text-left text-sm text-red-200">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-foreground">Firebase Console</a>.</li>
              <li>Click <b>Build</b> --- <b>Firestore Database</b>. (Do NOT click Realtime Database).</li>
              <li>Click <b>Create Database</b>.</li>
              <li>Select <b>Start in Test Mode</b> and click Enable.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Top Bar distinct from Student View */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-primary/5 p-6 rounded-xl border border-primary/20 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1">Brilliant Academy Administration Console</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/2fa?change=true">
            <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 gap-2 font-bold text-xs h-9">
              <ShieldCheck className="w-4 h-4" /> Change 2FA
            </Button>
          </Link>
          <Link href="/admin/live">
            <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-600 gap-2 font-bold text-xs h-9">
              <Video className="w-4 h-4" /> Go to Live Studio
            </Button>
          </Link>
          <div className="flex items-center gap-6 bg-background px-6 py-3 rounded-lg border border-border shadow-inner">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-6 h-6 text-green-500" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Live Students</p>
                <p className="text-xl font-bold font-mono">{liveStudyingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); window.location.hash = val; }} className="w-full space-y-6">
        <TabsList className="flex overflow-x-auto w-full justify-start h-auto p-1 bg-secondary/20 rounded-lg whitespace-nowrap scrollbar-hide">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Live Dashboard</TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Students</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Payments</TabsTrigger>
          <TabsTrigger value="courses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Courses</TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Video Uploads</TabsTrigger>
          <TabsTrigger value="exams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Exam Engine</TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Messages {filteredMessages.filter((m: any) => m.status === 'unread').length > 0 && `(${filteredMessages.filter((m: any) => m.status === 'unread').length})`}</TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">👥 Team</TabsTrigger>
          )}
          {user?.role === 'admin' && (
            <TabsTrigger value="site" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">🌐 Site Settings</TabsTrigger>
          )}
          <TabsTrigger value="myprofile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">👤 My Profile</TabsTrigger>
        </TabsList>
        
        {/* STUDENTS TAB */}
        <TabsContent value="students" className="space-y-6">
          <Card className="border-secondary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Student Access Management
              </CardTitle>
              <CardDescription>View all students and manage their course access.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Input 
                  placeholder="Search by ID, Name, Phone, NIC..." 
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <select 
                  className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={studentFilterBatch}
                  onChange={(e) => setStudentFilterBatch(e.target.value)}
                >
                  <option value="All">All Batches</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
                <select 
                  className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={studentFilterStatus}
                  onChange={(e) => setStudentFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">ID</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Name</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Batch</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Avg Daily</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Phone</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Parent</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="p-3 font-bold text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="border-b hover:bg-secondary/10 transition-colors text-sm">
                        <td className="p-3 font-mono text-primary whitespace-nowrap">{student.studentId || 'N/A'}</td>
                        <td className="p-3 font-medium min-w-[150px]">{student.name || student.email}</td>
                        <td className="p-3 whitespace-nowrap">{student.graduationYear || 'N/A'}</td>
                        <td className="p-3 whitespace-nowrap font-bold text-green-600">
                          {(() => {
                            const mins = student.totalStudyTimeMins || 0;
                            const days = student.createdAt ? Math.max(1, Math.round((Date.now() - student.createdAt) / (1000 * 60 * 60 * 24))) : Math.max(1, student.streakDays || 1);
                            const avg = Math.round(mins / days);
                            return `${Math.floor(avg / 60)}h ${avg % 60}m`;
                          })()}
                        </td>
                        <td className="p-3 whitespace-nowrap">{student.phone || 'N/A'}</td>
                        <td className="p-3 whitespace-nowrap">{student.parentPhone || 'N/A'}</td>
                        <td className="p-3 whitespace-nowrap">
                          {student.isApproved ? (
                            <span className="bg-green-500/20 text-green-600 px-2 py-1 rounded text-xs font-bold">Active</span>
                          ) : student.pendingReason === 'Access Suspended' ? (
                            <span className="bg-red-500/20 text-red-600 px-2 py-1 rounded text-xs font-bold">Suspended</span>
                          ) : (
                            <span className="bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-bold">Pending</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedStudentInfo(student)}
                              title="More Info"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedStudentForAccess(student);
                                setStudentFolderAccess(student.folderAccess || {});
                              }}
                            >
                              Access
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">No students found matching filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 border-t border-border pt-6">
                <h3 className="font-bold text-lg mb-4 text-primary">Bulk Grant Access (30 Days)</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Student IDs (comma or space separated)</Label>
                    <textarea 
                      className="w-full h-24 p-3 rounded-md border border-input bg-background text-sm" 
                      placeholder="e.g. PB-0001, PB-0012, admin@test.com"
                      value={bulkStudentIds}
                      onChange={e => setBulkStudentIds(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Select Folder</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={bulkFolderId}
                      onChange={e => setBulkFolderId(e.target.value)}
                    >
                      <option value="" disabled>Select a folder...</option>
                      {courses.map(course => (
                        <optgroup key={course.id} label={course.name}>
                          {folders.filter(f => f.courseId === course.id).map(folder => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <Button className="w-full mt-4" onClick={handleBulkAccessFiltered} disabled={filteredStudents.length === 0 || !bulkFolderId} variant="secondary">
                      Grant to ALL {filteredStudents.length} Filtered Students
                    </Button>
                    <Button className="w-full mt-2" onClick={handleBulkAccess} disabled={!bulkStudentIds.trim() || !bulkFolderId}>
                      Grant to Pasted IDs Above
                    </Button>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
          
          {selectedStudentForAccess && (
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="bg-primary/5 border-b border-primary/20">
                <CardTitle className="text-xl">Folder Access: {selectedStudentForAccess.name}</CardTitle>
                <CardDescription>Manage 30-day folder access for this student.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6 max-h-[500px] overflow-y-auto p-2">
                  {courses.map(course => {
                    const courseFolders = folders.filter(f => f.courseId === course.id);
                    if (courseFolders.length === 0) return null;
                    
                    return (
                      <div key={course.id} className="border rounded-lg p-4 bg-secondary/5">
                        <h3 className="font-bold text-lg mb-3">{course.name} <span className="text-sm font-normal text-muted-foreground ml-2">({batches.find(b=>b.id===course.batchId)?.name})</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {courseFolders.map(folder => {
                             const expiration = studentFolderAccess[folder.id];
                             const hasAccess = expiration && expiration > Date.now();
                             const daysLeft = hasAccess ? Math.ceil((expiration - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                             
                             return (
                               <div key={folder.id} className="flex flex-col gap-3 p-3 border rounded-md bg-background shadow-sm">
                                 <div className="flex justify-between items-center">
                                   <div>
                                     <p className="font-bold">{folder.name}</p>
                                     {folder.price ? <p className="text-xs text-green-600 font-bold">Rs. {folder.price}</p> : null}
                                   </div>
                                   {hasAccess ? (
                                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded font-bold">{daysLeft} days left</span>
                                   ) : (
                                      <span className="text-xs bg-red-500/20 text-red-600 px-2 py-1 rounded font-bold">Locked</span>
                                   )}
                                 </div>
                                 <div className="flex gap-2">
                                   {hasAccess ? (
                                     <>
                                       <Button size="sm" variant="outline" className="flex-1" onClick={() => setStudentFolderAccess(prev => { const n = {...prev}; delete n[folder.id]; return n; })}>Revoke</Button>
                                       <Button size="sm" className="flex-1" onClick={() => setStudentFolderAccess(prev => ({ ...prev, [folder.id]: (prev[folder.id] || Date.now()) + 30 * 24 * 60 * 60 * 1000 }))}>+30 Days</Button>
                                     </>
                                   ) : (
                                     <Button size="sm" className="w-full" onClick={() => setStudentFolderAccess(prev => ({ ...prev, [folder.id]: Date.now() + 30 * 24 * 60 * 60 * 1000 }))}>Grant (30 Days)</Button>
                                   )}
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setSelectedStudentForAccess(null)}>Cancel</Button>
                  <Button onClick={handleSaveStudentAccess}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="border-secondary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Pending Payment Receipts
              </CardTitle>
              <CardDescription>Review and approve bank transfer receipts to grant course access.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No pending payments.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-lg">Student</th>
                        <th className="px-6 py-4">Folder</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Receipt</th>
                        <th className="px-6 py-4 rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/20">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-secondary/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold">{p.studentName}</div>
                            <div className="text-xs text-muted-foreground">{p.studentEmail}</div>
                          </td>
                          <td className="px-6 py-4 font-medium">{p.folderName}</td>
                          <td className="px-6 py-4 text-green-600 font-bold">Rs. {p.amount}</td>
                          <td className="px-6 py-4 uppercase text-xs">{p.method}</td>
                          <td className="px-6 py-4">
                            {p.receiptBase64 || p.receiptUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingReceipt({
                                  url: p.receiptBase64 || p.receiptUrl,
                                  studentName: p.studentName || "Student",
                                  amount: p.amount || 0,
                                  folderName: p.folderName || "Course Folder",
                                  date: p.createdAt
                                })}
                                className="text-primary hover:bg-primary/10 border-primary/40 flex items-center gap-1.5 h-8 font-semibold shadow-sm"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Receipt
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">No Receipt</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-foreground" onClick={() => handleApprovePayment(p.id, p.studentId, p.folderId)}>
                                Approve (30 Days)
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-500/10" onClick={() => handleRejectPayment(p.id)}>
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* COURSES TAB */}
        <TabsContent value="courses" className="space-y-6">
          <Card className="border-secondary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Settings className="w-5 h-5" /> Course & Folder Manager
              </CardTitle>
              <CardDescription>
                Create structured learning paths (Year --- Course --- Folder)
              </CardDescription>
            </CardHeader>
              <CardContent className="pt-6">
                {/* TEACHER SELECTION / FILTER BEFORE COURSES */}
                <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm">Filter by Teacher / Instructor:</span>
                      <span className="text-xs text-muted-foreground">Select a teacher to view & manage only their courses</span>
                    </div>
                    {courseTeacherFilter !== "all" && (
                      <Button size="sm" variant="ghost" onClick={() => setCourseTeacherFilter("all")} className="text-xs text-primary h-7">
                        Reset Filter (Show All)
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCourseTeacherFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        courseTeacherFilter === "all" 
                          ? "bg-primary text-primary-foreground shadow" 
                          : "bg-secondary/20 hover:bg-secondary/40 text-foreground"
                      }`}
                    >
                      <span>All Teachers</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20">{courses.length}</span>
                    </button>
                    {teamMembers.filter(tm => tm.role === 'teacher').map(tm => {
                      const count = courses.filter(c => c.teacherId === tm.id).length;
                      return (
                        <button
                          key={tm.id}
                          type="button"
                          onClick={() => setCourseTeacherFilter(tm.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            courseTeacherFilter === tm.id 
                              ? "bg-primary text-primary-foreground shadow" 
                              : "bg-secondary/20 hover:bg-secondary/40 text-foreground"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] uppercase font-mono">
                            {tm.name?.charAt(0) || 'T'}
                          </span>
                          <span>{tm.name || tm.email?.split('@')[0]}</span>
                          {tm.subject && <span className="opacity-75 text-[10px]">({tm.subject})</span>}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* BATCHES COLUMN */}
                  <div className="border border-border/50 rounded-lg p-4 space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2">1. Batches (Years)</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      <div 
                        className={`p-3 rounded-md cursor-pointer flex justify-between items-center transition-colors ${selectedBatchId === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 hover:bg-secondary/40'}`}
                        onClick={() => { setSelectedBatchId('all'); setSelectedCourseId(null); }}
                      >
                        <div>
                          <p className="font-bold">All Batches (Global)</p>
                          <p className="text-xs opacity-80">Visible to everyone</p>
                        </div>
                      </div>
                      {batches.map(b => (
                        <div 
                          key={b.id} 
                          className={`p-3 rounded-md cursor-pointer flex justify-between items-center transition-colors ${selectedBatchId === b.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 hover:bg-secondary/40'}`}
                          onClick={() => { setSelectedBatchId(b.id); setSelectedCourseId(null); }}
                        >
                          <div>
                            <p className="font-bold">{b.name}</p>
                            <p className="text-xs opacity-80">{b.year}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteBatch(b.id); }} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {batches.length === 0 && <p className="text-sm text-muted-foreground italic">No batches yet.</p>}
                    </div>
                    <form onSubmit={handleCreateBatch} className="pt-2 border-t space-y-2">
                      <Input placeholder="Batch Name (e.g. 2026 Batch)" value={newBatchName} onChange={e => setNewBatchName(e.target.value)} required />
                      <Input placeholder="Year (e.g. 2026)" value={newBatchYear} onChange={e => setNewBatchYear(e.target.value)} required />
                      <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Batch</Button>
                    </form>
                  </div>

                  {/* STREAMS COLUMN */}
                  <div className="border border-border/50 rounded-lg p-4 space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2">Global Streams</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {streams.map(s => (
                        <div key={s.id} className="p-3 rounded-md bg-secondary/20 flex justify-between items-center">
                          <p className="font-bold text-sm">{s.name}</p>
                          <button onClick={() => handleDeleteStream(s.id)} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {streams.length === 0 && <p className="text-sm text-muted-foreground italic">No streams yet.</p>}
                    </div>
                    <form onSubmit={handleCreateStream} className="pt-2 border-t space-y-2">
                      <Input placeholder="Stream Name (e.g. Maths)" value={newStreamName} onChange={e => setNewStreamName(e.target.value)} required />
                      <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Stream</Button>
                    </form>
                  </div>

                  {/* COURSES COLUMN */}
                  <div className={`border border-border/50 rounded-lg p-4 space-y-4 transition-opacity ${!selectedBatchId ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-lg">2. Courses</h3>
                      {courseTeacherFilter !== "all" && (
                        <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Filtered by Teacher
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {courses.filter(c => {
                        const matchBatch = selectedBatchId === 'all' || c.batchId === selectedBatchId;
                        const matchTeacher = courseTeacherFilter === 'all' || c.teacherId === courseTeacherFilter;
                        return matchBatch && matchTeacher;
                      }).map(c => (
                        <div
                          key={c.id}
                          className={`p-3 rounded-md flex items-center gap-2 transition-colors ${selectedCourseId === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 hover:bg-secondary/40'}`}
                        >
                          {editingCourseId === c.id ? (
                            <div className="flex-1 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                              <Input
                                value={editCourseName}
                                onChange={e => setEditCourseName(e.target.value)}
                                className="h-7 text-sm bg-background text-foreground"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveCourse(c.id); if (e.key === 'Escape') setEditingCourseId(null); }}
                              />
                              <Textarea
                                placeholder="Course Description (Optional)"
                                value={editCourseDescription}
                                onChange={e => setEditCourseDescription(e.target.value)}
                                className="h-16 text-xs bg-background text-foreground resize-none"
                              />
                              <select
                                className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                                value={editCourseTeacherId !== "" ? editCourseTeacherId : (c.teacherId || "")}
                                onChange={e => setEditCourseTeacherId(e.target.value)}
                              >
                                <option value="">-- No Teacher Assigned --</option>
                                {teamMembers.filter(tm => tm.role === 'teacher').map(tm => (
                                  <option key={tm.id} value={tm.id}>
                                    {tm.name || tm.email?.split('@')[0]} {tm.subject ? `(${tm.subject})` : ''}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => handleSaveCourse(c.id)} className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-foreground rounded text-xs flex items-center gap-1">
                                  <Save className="w-3 h-3" /> Save
                                </button>
                                <button onClick={() => setEditingCourseId(null)} className="px-2 py-0.5 hover:bg-secondary/60 rounded text-xs">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 cursor-pointer" onClick={() => setSelectedCourseId(c.id)}>
                                <p className="font-bold">{c.name}</p>
                                {c.description && <p className="text-[10px] opacity-70 line-clamp-1 mt-0.5">{c.description}</p>}
                                {c.teacherName && (
                                  <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${selectedCourseId === c.id ? 'text-primary-foreground/90' : 'text-primary'}`}>
                                    <GraduationCap className="w-3 h-3" />
                                    <span>{c.teacherName}</span>
                                    {c.teacherSubject && <span className="opacity-75">({c.teacherSubject})</span>}
                                  </p>
                                )}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setEditingCourseId(c.id); setEditCourseName(c.name); setEditCourseDescription(c.description || ""); setEditCourseTeacherId(c.teacherId || ""); }} className={`p-1 hover:bg-secondary/50 rounded-md shrink-0 ${selectedCourseId === c.id ? 'text-primary-foreground/80' : 'text-primary'}`}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(c.id); }} className={`p-1 hover:bg-destructive/20 rounded-md text-destructive shrink-0`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                      {selectedBatchId && courses.filter(c => {
                        const matchBatch = selectedBatchId === 'all' || c.batchId === selectedBatchId;
                        const matchTeacher = courseTeacherFilter === 'all' || c.teacherId === courseTeacherFilter;
                        return matchBatch && matchTeacher;
                      }).length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          {courseTeacherFilter !== 'all' ? 'No courses for this teacher in this batch.' : 'No courses in this batch.'}
                        </p>
                      )}
                      {!selectedBatchId && <p className="text-sm text-muted-foreground italic">Select a batch first.</p>}
                    </div>
                    <div className="pt-2 border-t space-y-3">
                      {/* New course */}
                      <form onSubmit={handleCreateCourse} className="space-y-2">
                        <Input placeholder="Course Name (e.g. Mechanics)" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} required />
                        <Textarea placeholder="Course Description (Optional)" value={newCourseDescription} onChange={e => setNewCourseDescription(e.target.value)} className="h-16 text-xs resize-none" />
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                          value={newCourseTeacherId}
                          onChange={e => setNewCourseTeacherId(e.target.value)}
                        >
                          <option value="">-- Assign Teacher (Optional) --</option>
                          {teamMembers.filter(tm => tm.role === 'teacher').map(tm => (
                            <option key={tm.id} value={tm.id}>
                              {tm.name || tm.email?.split('@')[0]} {tm.subject ? `(${tm.subject})` : ''}
                            </option>
                          ))}
                        </select>
                        <Input type="file" accept="image/*" onChange={e => setNewCourseImage(e.target.files?.[0] || null)} className="text-xs file:h-full file:bg-transparent file:border-0 file:text-foreground" title="Course Thumbnail (Optional)" />
                        <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add New Course</Button>
                      </form>

                      {/* Copy from another batch */}
                      {selectedBatchId && (() => {
                        const otherCourses = courses.filter(c => c.batchId !== selectedBatchId);
                        const alreadyInBatch = new Set(courses.filter(c => c.batchId === selectedBatchId).map(c => c.name));
                        const copyable = otherCourses.filter(c => !alreadyInBatch.has(c.name));
                        if (copyable.length === 0) return null;
                        return (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Or copy from another batch</p>
                            <div className="max-h-[120px] overflow-y-auto space-y-1">
                              {copyable.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleCopyCourseDeep(c)}
                                  className="w-full text-left px-3 py-1.5 text-sm rounded-md bg-secondary/20 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30 transition-colors flex items-center justify-between group"
                                >
                                  <span className="font-medium">{c.name}</span>
                                  <span className="text-xs text-muted-foreground group-hover:text-primary/70 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Copy
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* FOLDERS COLUMN */}
                  <div className={`border border-border/50 rounded-lg p-4 space-y-4 transition-opacity ${!selectedCourseId ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h3 className="font-bold text-lg border-b pb-2">3. Folders</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {folders.filter(f => f.courseId === selectedCourseId).map(f => (
                        <div key={f.id} className="p-3 rounded-md flex justify-between items-center bg-secondary/20">
                          {editingFolderId === f.id ? (
                            <div className="flex-1 space-y-2 mr-2">
                              <Input value={editFolderName} onChange={e => setEditFolderName(e.target.value)} placeholder="Folder Name" className="h-8" />
                              <Input type="number" value={editFolderPrice} onChange={e => setEditFolderPrice(e.target.value)} placeholder="Price" className="h-8" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveFolder(f.id)} className="h-7 bg-green-600 hover:bg-green-700 text-foreground">Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingFolderId(null)} className="h-7">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div>
                                <p className="font-bold">{f.name}</p>
                                {f.price !== undefined && (
                                  <p className="text-xs text-green-600 font-bold bg-green-500/10 inline-block px-1.5 py-0.5 rounded mt-1">Rs. {f.price}</p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => handleEditFolder(f)} className="p-1 hover:bg-secondary/50 rounded-md text-primary">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteFolder(f.id)} className="p-1 hover:bg-destructive/20 rounded-md text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {selectedCourseId && folders.filter(f => f.courseId === selectedCourseId).length === 0 && <p className="text-sm text-muted-foreground italic">No folders in this course.</p>}
                      {!selectedCourseId && <p className="text-sm text-muted-foreground italic">Select a course first.</p>}
                    </div>
                    <form onSubmit={handleCreateFolder} className="pt-2 border-t space-y-2">
                      <Input placeholder="Folder Name (e.g. Week 1)" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} required />
                      <Input type="number" placeholder="Price (Rs.)" value={newFolderPrice} onChange={e => setNewFolderPrice(e.target.value)} />
                      <Button type="submit" className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Folder</Button>
                    </form>
                  </div>
                </div>
              </CardContent>
          </Card>
        </TabsContent>
        
        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className="border-secondary/50 shadow-sm bg-background cursor-pointer hover:bg-secondary/10 transition-colors"
              onClick={() => setActiveAnalyticsList({ title: "Studying Right Now", students: liveStudyingStudents })}
            >
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Studying Right Now</p>
                <p className="text-3xl font-black text-green-500">{liveStudyingCount}</p>
              </CardContent>
            </Card>
            <Card 
              className="border-secondary/50 shadow-sm bg-background cursor-pointer hover:bg-secondary/10 transition-colors"
              onClick={() => setActiveAnalyticsList({ title: "Studied Today", students: studiedTodayStudents })}
            >
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Studied Today</p>
                <p className="text-3xl font-black text-primary">{studiedTodayCount}</p>
              </CardContent>
            </Card>
            <Card 
              className="border-secondary/50 shadow-sm bg-background cursor-pointer hover:bg-secondary/10 transition-colors"
              onClick={() => setActiveAnalyticsList({ title: "Did Not Study Today", students: notStudiedTodayStudents })}
            >
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Did Not Study Today</p>
                <p className="text-3xl font-black text-destructive">{notStudiedTodayCount}</p>
              </CardContent>
            </Card>
            <Card className="border-secondary/50 shadow-sm bg-background">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Avg Today's Study Time</p>
                <p className="text-3xl font-black">{Math.floor(avgStudyTime / 60)}h {avgStudyTime % 60}m</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-secondary/50 shadow-md">
              <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
                <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Pending Student Approvals</CardTitle>
                <CardDescription>Review new account registrations</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {pendingStudents.length === 0 ? (
                    <div className="text-center p-6 text-muted-foreground">No pending approvals!</div>
                  ) : (
                    pendingStudents.map((req) => (
                      <div key={req.id} className="flex flex-col border border-border/50 bg-background p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-lg">{req.name}</p>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${req.pendingReason === 'New Device Login' ? 'bg-orange-500/20 text-orange-600' : req.pendingReason === 'Access Suspended' ? 'bg-red-500/20 text-red-600' : 'bg-blue-500/20 text-blue-600'}`}>
                                {req.pendingReason || 'ID Verification'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{req.email} --- Batch {req.graduationYear}</p>
                            <p className="text-sm text-muted-foreground">Phone: {req.phone} | Parent: {req.parentPhone}</p>
                            <p className="text-sm text-muted-foreground font-mono mt-1">NIC: {req.nicNumber}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setSelectedStudentInfo(req)}>
                              <Eye className="w-4 h-4 mr-1" /> View Details
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-foreground" onClick={() => handleRejectStudent(req.id)}>Reject</Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-foreground" onClick={() => handleApproveStudent(req.id)}>Approve</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/50 shadow-md">
              <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Recent Payments</CardTitle>
                <CardDescription>Latest transactions and revenue</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {allPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center italic py-4">No payments recorded yet.</p>
                  ) : (
                    allPayments.map((pay) => (
                      <div key={pay.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{pay.studentName}</p>
                          <p className="text-xs text-muted-foreground flex gap-2">
                            <span>{pay.folderName}</span>
                            <span className="uppercase border border-secondary/50 rounded px-1">{pay.method}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">Rs. {pay.amount}</p>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            pay.status === 'approved' ? 'bg-green-500/20 text-green-500' : 
                            pay.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {pay.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/5 border-t border-border/50 py-3 mt-4">
                <Link href="/admin/finance" className="w-full">
                  <Button variant="outline" className="w-full text-primary border-primary/50 hover:bg-primary hover:text-primary-foreground">
                    View Full Financial Report
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* CONTENT & VIDEO TAB */}
        <TabsContent value="content" className="space-y-6">
          <Card className="border-primary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="flex items-center gap-2"><Video className="w-5 h-5 text-primary" /> Upload & Link Course Video</CardTitle>
              <CardDescription>Manage video content for fastest streaming</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6 max-w-3xl">
              <form onSubmit={handleUploadItem} className="space-y-6">
                {uploadSuccess && (
                  <div className="p-4 bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-base">✅ Upload Completed Successfully!</p>
                      <p className="text-xs text-emerald-300/80">Your file has been uploaded to Amazon S3 and linked to this folder.</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Batch (Year)</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={videoBatchId} 
                      onChange={(e) => { setVideoBatchId(e.target.value); setVideoCourseId(""); setVideoFolderId(""); }}
                      required
                    >
                      <option value="" disabled>Select Batch</option>
                      <option value="all">All Batches (Global)</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={videoCourseId} 
                      onChange={(e) => { setVideoCourseId(e.target.value); setVideoFolderId(""); }}
                      disabled={!videoBatchId}
                      required
                    >
                      <option value="" disabled>Select Course</option>
                      {courses.filter(c => c.batchId === videoBatchId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Folder</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={videoFolderId} 
                      onChange={(e) => setVideoFolderId(e.target.value)}
                      disabled={!videoCourseId}
                      required
                    >
                      <option value="" disabled>Select Folder</option>
                      {folders.filter(f => f.courseId === videoCourseId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="font-semibold text-primary">Item Type</Label>
                  <div className="flex gap-4 p-2 bg-secondary/10 rounded-md border border-secondary/20">
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-secondary/20 rounded-md flex-1 justify-center transition-colors">
                      <input type="radio" checked={uploadItemType === 'video'} onChange={() => { setUploadItemType('video'); setVideoUrl(''); setUploadFileBase64(null); }} className="w-4 h-4 text-primary" />
                      <span className="font-medium">Video</span>
                    </label>
                    <div className="w-px bg-border/50" />
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-secondary/20 rounded-md flex-1 justify-center transition-colors">
                      <input type="radio" checked={uploadItemType === 'resource'} onChange={() => { setUploadItemType('resource'); setVideoUrl(''); setUploadFileBase64(null); }} className="w-4 h-4 text-primary" />
                      <span className="font-medium">Resource (PDF, Image, Notes)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{uploadItemType === 'video' ? 'Video' : 'Resource'} Title</Label>
                  <Input placeholder={uploadItemType === 'video' ? "e.g. Lesson 1: Introduction" : "e.g. Lesson 1 Notes (PDF)"} value={videoTitle || ""} onChange={e => setVideoTitle(e.target.value)} required />
                </div>

                {uploadItemType === 'video' ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Video Source Platform</Label>
                      <select 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={videoPlatform} 
                        onChange={(e) => setVideoPlatform(e.target.value)}
                        required={uploadItemType === 'video'}
                      >
                        <option value="s3">Upload Video File directly to Amazon S3 (.mp4, .mov, .mkv)</option>
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                        <option value="dailymotion">Dailymotion</option>
                        <option value="direct">Direct External Link (Google Drive, URL, etc.)</option>
                      </select>
                    </div>

                    {videoPlatform === 's3' ? (
                      <div className="space-y-2 p-4 border border-primary/20 rounded-xl bg-primary/5">
                        <Label className="text-primary font-medium">Upload Video File to Amazon S3</Label>
                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                          <Input 
                            type="file" 
                            accept="video/*,.mp4,.mov,.mkv,.webm" 
                            className="cursor-pointer file:cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-primary/90"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setResourceFile(e.target.files[0]);
                              }
                            }} 
                            required={videoPlatform === 's3'}
                          />
                          <Button type="button" onClick={handleUploadItem} className="w-full sm:w-auto shrink-0" disabled={isUploading || !videoFolderId || !resourceFile}>
                            {isUploading ? "Uploading Video to S3..." : "Upload Video (S3)"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Video files are uploaded directly to Amazon S3 and will play seamlessly in the student video player.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Video URL</Label>
                        <div className="flex gap-2">
                          <Input placeholder={videoPlatform === 'direct' ? "https://drive.google.com/uc?export=download&id=..." : "https://youtube.com/watch?v=..."} value={videoUrl || ""} onChange={e => setVideoUrl(e.target.value)} required={uploadItemType === 'video'} />
                          <Button type="button" onClick={handleUploadItem} variant="secondary" disabled={isUploading || !videoFolderId}>
                            {isUploading ? "Linking..." : "Link Video"}
                          </Button>
                        </div>
                        {videoPlatform === 'direct' && (
                          <p className="text-xs text-muted-foreground mt-1 bg-primary/5 p-2 rounded">
                            <strong>Note for Google Drive:</strong> To play directly inside the custom player with quality controls, you must use a direct download link. Format: <code>https://drive.google.com/uc?export=download&id=FILE_ID</code> instead of the standard sharing link. Standard sharing links will not work in the custom player.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 p-4 border border-primary/20 rounded-xl bg-primary/5">
                    <Label className="text-primary">Upload Resource File</Label>
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                      <Input 
                        type="file" 
                        accept=".pdf,image/*,.docx,.txt" 
                        className="cursor-pointer file:cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-primary/90"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setResourceFile(file);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setUploadFileBase64(event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        required={uploadItemType === 'resource'}
                      />
                      <Button type="button" onClick={handleUploadItem} className="w-full sm:w-auto shrink-0" disabled={isUploading || !videoFolderId || (!uploadFileBase64 && !resourceFile)}>
                        {isUploading ? "Uploading to S3..." : "Upload Resource (S3)"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">PDFs and Resources are uploaded securely to Amazon S3.</p>
                  </div>
                )}
              </form>

              {videoFolderId && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h3 className="font-bold text-lg mb-4">Items in this Folder</h3>
                  <div className="space-y-3">
                    {videos.filter(v => v.folderId === videoFolderId).map(v => (
                      <div key={v.id} className="p-4 rounded-md flex flex-col sm:flex-row justify-between sm:items-center bg-secondary/20 gap-4 border border-border/50">
                        {editingVideoId === v.id ? (
                          <div className="flex-1 space-y-2">
                            <Input value={editVideoTitle || ""} onChange={e => setEditVideoTitle(e.target.value)} placeholder="Video Title" className="h-8" />
                            <Input value={editVideoUrl || ""} onChange={e => setEditVideoUrl(e.target.value)} placeholder="Video URL" className="h-8" />
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => handleSaveVideo(v.id)} className="h-7 bg-green-600 hover:bg-green-700 text-foreground">Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingVideoId(null)} className="h-7">Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="overflow-hidden">
                              <p className="font-bold truncate">{v.title}</p>
                              <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate block max-w-sm mt-1">{v.url}</a>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => handleEditVideo(v)} className="p-2 hover:bg-secondary/50 rounded-md text-primary transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteVideo(v.id)} className="p-2 hover:bg-destructive/20 rounded-md text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {videos.filter(v => v.folderId === videoFolderId).length === 0 && (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No videos uploaded to this folder yet.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CONTENT BROWSER */}
          <Card className="border-secondary/50 shadow-md">
            <CardHeader className="bg-secondary/5 border-b border-secondary/20">
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" /> Content Browser
              </CardTitle>
              <CardDescription>Browse all courses, expand folders, and edit or delete individual videos.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Course to Browse</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={contentBrowseCourseId || ""}
                  onChange={(e) => { setContentBrowseCourseId(e.target.value); setContentBrowseFolderId(null); setEditingVideoId(null); }}
                >
                  <option value="" disabled>-- Select a Course --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {contentBrowseCourseId && (
                <div className="space-y-3">
                  {folders.filter(f => f.courseId === contentBrowseCourseId).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No folders in this course yet.</p>
                  ) : (
                    folders.filter(f => f.courseId === contentBrowseCourseId).map(folder => (
                      <div key={folder.id} className="border border-border/50 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 transition-colors text-left"
                          onClick={() => { setContentBrowseFolderId(contentBrowseFolderId === folder.id ? null : folder.id); setEditingVideoId(null); }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{contentBrowseFolderId === folder.id ? <FolderOpen className="w-5 h-5 text-primary" /> : <Folder className="w-5 h-5 text-muted-foreground" />}</span>
                            <div>
                              <p className="font-bold text-base">{folder.name}</p>
                              {folder.price !== undefined && <p className="text-xs text-green-600 font-bold">Rs. {folder.price}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded">
                              {videos.filter(v => v.folderId === folder.id).length} videos
                            </span>
                          </div>
                          <span className="text-primary text-xs font-medium flex items-center gap-1">{contentBrowseFolderId === folder.id ? <>Collapse <ChevronUp className="w-3 h-3" /></> : <>Expand <ChevronDown className="w-3 h-3" /></>}</span>
                        </button>

                        {contentBrowseFolderId === folder.id && (
                          <div className="divide-y divide-border/30">
                            {videos.filter(v => v.folderId === folder.id).length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground italic">No videos in this folder yet.</p>
                            ) : (
                              videos.filter(v => v.folderId === folder.id).map((v, idx) => (
                                <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-secondary/5 transition-colors">
                                  {editingVideoId === v.id ? (
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12 shrink-0">Title</span>
                                        <Input value={editVideoTitle || ""} onChange={e => setEditVideoTitle(e.target.value)} placeholder="Video Title" className="h-8 flex-1" autoFocus />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12 shrink-0">URL</span>
                                        <Input value={editVideoUrl || ""} onChange={e => setEditVideoUrl(e.target.value)} placeholder="Stream URL" className="h-8 flex-1 font-mono text-xs" />
                                      </div>
                                      <div className="flex gap-2 pt-1">
                                        <Button size="sm" onClick={() => handleSaveVideo(v.id)} className="h-7 bg-green-600 hover:bg-green-700 text-foreground">Save Changes</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingVideoId(null)} className="h-7">Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                                        <div className="min-w-0">
                                          <p className="font-semibold truncate">{v.title}</p>
                                          <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-primary/60 hover:text-primary hover:underline truncate block max-w-sm mt-0.5">{v.url}</a>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button title="Edit title & URL" onClick={() => { setEditingVideoId(v.id); setEditVideoTitle(v.title); setEditVideoUrl(v.url); }} className="p-2 hover:bg-primary/10 rounded-md text-primary transition-colors">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button title="Delete video" onClick={() => handleDeleteVideo(v.id)} className="p-2 hover:bg-destructive/10 rounded-md text-destructive transition-colors">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {!contentBrowseCourseId && (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Select a course above to browse its folders and videos.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXAM MANAGEMENT TAB */}
        <TabsContent value="exams" className="space-y-6">
          
          {/* List of All Created Exams */}
          <Card className="border-primary/50 shadow-md">
            <CardHeader className="bg-secondary/10 border-b border-border/50 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-primary flex items-center gap-2">
                  <FileQuestion className="w-5 h-5" /> Created Exams ({publishedExams.length})
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Exams remain visible here permanently even after their time ends. When an exam ends, students cannot start or submit it. Only clicking "Hide" hides an exam from students.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {publishedExams.length > 2 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowAllExamsModal(true)}
                    className="font-semibold flex items-center gap-1.5 text-xs"
                  >
                    <ListFilter className="w-3.5 h-3.5" /> View All Exams ({publishedExams.length})
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={() => {
                    setEditingExamId(null);
                    setExamTitle("");
                    setExamType("mcq");
                    setExamTime("");
                    setExamStartTime("");
                    setExamEndTime("");
                    setExamCategory("Mechanics");
                    setQuestions([{ id: Date.now(), text: "", image: null, options: { A: "", B: "", C: "", D: "" }, correct: "A" }]);
                    const formEl = document.getElementById('exam-editor-form');
                    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" /> New Exam
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {publishedExams.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg bg-secondary/5">
                  <FileQuestion className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
                  <p className="font-semibold text-sm">No exams created yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Fill out the form below to create and publish your first exam.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publishedExams.slice(0, 2).map((exam) => {
                    const now = Date.now();
                    const hasStart = !!exam.startTime;
                    const hasEnd = !!exam.endTime;
                    const isUpcoming = hasStart && now < exam.startTime;
                    const isEnded = hasEnd && now > exam.endTime;
                    const isActive = (!hasStart || now >= exam.startTime) && (!hasEnd || now <= exam.endTime);

                    return (
                      <div 
                        key={exam.id} 
                        className={`border rounded-xl p-4 bg-background transition-all flex flex-col justify-between gap-3 shadow-sm ${
                          exam.hidden 
                            ? 'opacity-60 border-dashed border-destructive/40 bg-destructive/5' 
                            : isEnded 
                            ? 'border-border/60 bg-secondary/5' 
                            : 'border-primary/30 shadow-primary/5'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-base text-foreground leading-tight">{exam.title}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {exam.category || 'General'}
                                </span>
                                <span className="text-[10px] font-semibold bg-secondary/50 text-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {exam.examType === 'essay' ? '📝 Essay' : '✅ MCQ'}
                                </span>
                                
                                {/* Timing Status Badge */}
                                {isEnded ? (
                                  <span className="text-[10px] font-bold bg-destructive/15 text-destructive px-2 py-0.5 rounded-full flex items-center gap-1">
                                    🔴 Time Ended (Submissions Closed)
                                  </span>
                                ) : isActive ? (
                                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    🟢 Active Now
                                  </span>
                                ) : isUpcoming ? (
                                  <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    🟡 Upcoming
                                  </span>
                                ) : null}

                                {/* Visibility Badge */}
                                {exam.hidden ? (
                                  <span className="text-[10px] font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <EyeOff className="w-3 h-3" /> Hidden from Students
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold bg-secondary/40 text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> Visible to Students
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary gap-1" 
                                onClick={() => handleOpenExamDetails(exam)}
                                title="View Details & Student Marks"
                              >
                                <Info className="w-3.5 h-3.5" /> Details
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="w-8 h-8 hover:bg-primary/10 hover:text-primary" 
                                onClick={() => handleEditExam(exam)}
                                title="Edit Exam"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className={`w-8 h-8 ${exam.hidden ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600 hover:bg-emerald-500/10'}`} 
                                onClick={() => handleToggleHide(exam.id)}
                                title={exam.hidden ? "Click to Unhide (Show to Students)" : "Click to Hide from Students"}
                              >
                                {exam.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground" 
                                onClick={() => handleDeleteExam(exam.id)}
                                title="Delete Exam"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/40">
                            <div className="flex justify-between">
                              <span>
                                {exam.examType === 'essay' 
                                  ? <strong>PDF Upload Required</strong> 
                                  : <>Questions: <strong>{Array.isArray(exam.questions) ? exam.questions.length : exam.questions}</strong></>
                                }
                              </span>
                              <span>Duration: <strong>{exam.duration || '15 min'}</strong></span>
                            </div>
                            {hasStart && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Start Window:</span>
                                <span className="font-medium text-foreground">{new Date(exam.startTime).toLocaleString()}</span>
                              </div>
                            )}
                            {hasEnd && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Deadline / End:</span>
                                <span className={`font-medium ${isEnded ? 'text-destructive font-bold' : 'text-foreground'}`}>
                                  {new Date(exam.endTime).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isEnded ? (
                          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] p-2 rounded-md font-medium flex items-center justify-between">
                            <span>🔒 Submission window ended. Students cannot take this exam.</span>
                          </div>
                        ) : isActive ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Exam is currently running
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2.5 text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                              onClick={() => handleEndExamNow(exam.id, exam.title)}
                              title="End this exam right now for all students"
                            >
                              <StopCircle className="w-3.5 h-3.5" /> End Exam Now
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create / Edit Exam Form */}
          <Card id="exam-editor-form" className="border-primary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-primary flex items-center gap-2">
                  <FileQuestion className="w-6 h-6" /> {editingExamId ? `Editing Exam: ${examTitle || 'Untitled'}` : "Create New Exam"}
                </CardTitle>
                <CardDescription>Setup times, categories, marks, and add MCQ questions.</CardDescription>
              </div>
              {editingExamId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setEditingExamId(null);
                    setExamTitle("");
                    setExamTime("");
                    setExamStartTime("");
                    setExamEndTime("");
                    setExamCategory("Mechanics");
                    setQuestions([{ id: Date.now(), text: "", image: null, options: { A: "", B: "", C: "", D: "" }, correct: "A" }]);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Cancel Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                {/* Exam Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Batch (Year)</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={examBatchId} 
                      onChange={(e) => { setExamBatchId(e.target.value); setExamCourseId(""); setExamFolderId(""); }}
                    >
                      <option value="" disabled>Select Batch</option>
                      <option value="all">All Batches (Global)</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={examCourseId} 
                      onChange={(e) => { setExamCourseId(e.target.value); setExamFolderId(""); }}
                      disabled={!examBatchId}
                    >
                      <option value="" disabled>Select Course</option>
                      {courses.filter(c => c.batchId === examBatchId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Folder</Label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={examFolderId} 
                      onChange={(e) => setExamFolderId(e.target.value)}
                      disabled={!examCourseId}
                    >
                      <option value="" disabled>Select Folder</option>
                      {folders.filter(f => f.courseId === examCourseId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Title</Label>
                    <Input placeholder="e.g. Kinematics Final" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Limit (mins)</Label>
                    <Input type="number" placeholder="60" value={examTime} onChange={(e) => setExamTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={examCategory} onChange={(e) => setExamCategory(e.target.value)}>
                      <option value="Mechanics">Mechanics</option>
                      <option value="Waves">Waves</option>
                      <option value="Thermodynamics">Thermodynamics</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Start Time (When students can begin)</Label>
                    <Input type="datetime-local" value={examStartTime} onChange={(e) => setExamStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time (When results are revealed)</Label>
                    <Input type="datetime-local" value={examEndTime} onChange={(e) => setExamEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="mt-6 mb-4 space-y-3">
                  <Label className="text-base font-bold">Exam Type</Label>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="examType" 
                        value="mcq" 
                        checked={examType === 'mcq'} 
                        onChange={() => setExamType('mcq')}
                        className="w-4 h-4 text-primary"
                      />
                      <span>MCQ Exam (Interactive)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="examType" 
                        value="essay" 
                        checked={examType === 'essay'} 
                        onChange={() => setExamType('essay')}
                        className="w-4 h-4 text-primary"
                      />
                      <span>Essay Exam (PDF Upload)</span>
                    </label>
                  </div>
                </div>

              {examType === 'mcq' ? (
                <>
                  <div className="relative mt-8 mb-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">MCQ Questions Setup</span></div>
                  </div>

                  {/* Question Editor */}
                  <div className="space-y-6">
                    {questions.map((q, index) => (
                      <div key={q.id} className="space-y-6 bg-secondary/5 p-6 rounded-xl border border-secondary/20 relative">
                        <div className="flex justify-between items-center">
                          <Label className="text-lg font-bold">Question {index + 1}</Label>
                          {questions.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:bg-destructive/10 h-8"
                              onClick={() => {
                                setQuestions(questions.filter(item => item.id !== q.id));
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        {/* Text and Image Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <textarea 
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]" 
                            placeholder="Enter the question text here..."
                            value={q.text}
                            onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                          ></textarea>
                          
                          <div className="border border-input rounded-md flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden h-[120px]">
                            {q.image ? (
                              <>
                                <img src={q.image} alt="Question Diagram" className="object-contain h-full w-full" />
                                <Button size="sm" variant="destructive" className="absolute top-2 right-2 h-6 px-2 text-[10px]" onClick={() => handleQuestionChange(q.id, 'image', null)}>Remove</Button>
                              </>
                            ) : (
                              <label className="flex flex-col items-center cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                                <Upload className="w-8 h-8 mb-2" />
                                <span className="text-sm font-medium">Upload Image / Diagram</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(q.id, e)} />
                              </label>
                            )}
                          </div>
                        </div>
                        
                        {/* Options Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                            <div key={opt} className="flex items-center space-x-2">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground">{opt}</div>
                              <Input 
                                placeholder={`Option ${opt}`} 
                                value={q.options[opt]}
                                onChange={(e) => handleOptionChange(q.id, opt, e.target.value)}
                              />
                              <input 
                                type="checkbox" 
                                checked={Array.isArray(q.correct) ? q.correct.includes(opt) : q.correct === opt}
                                onChange={() => {
                                  let current = Array.isArray(q.correct) ? [...q.correct] : [q.correct];
                                  if (current.includes(opt)) {
                                    current = current.filter(o => o !== opt);
                                  } else {
                                    current.push(opt);
                                  }
                                  if (current.length === 0) current = [opt];
                                  handleQuestionChange(q.id, 'correct', current);
                                }}
                                className="w-5 h-5 accent-primary cursor-pointer" 
                                title={`Toggle Option ${opt} as correct`} 
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={() => handleQuestionChange(q.id, 'correct', ['A', 'B', 'C', 'D'])}
                          >
                            Set "All Answers Correct"
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center pt-4 border-t border-secondary/20">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-primary inline-block"></span> Check boxes to set correct answers (can be multiple).
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
                        onClick={() => {
                          setQuestions([...questions, { id: Date.now(), text: "", image: null, options: { A: "", B: "", C: "", D: "" }, correct: "A" }]);
                        }}
                      >
                        <Plus className="w-4 h-4" /> Add Another Question
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mt-8 mb-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Essay Question Paper Setup</span></div>
                  </div>

                  <div className="border border-input rounded-md flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden min-h-[200px]">
                    {examPdfUrl && !examPdfFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 mb-3 text-primary" />
                        <span className="text-sm font-medium mb-4">Existing PDF Uploaded</span>
                        <div className="flex space-x-3">
                          <a href={examPdfUrl} target="_blank" rel="noreferrer" className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20">View PDF</a>
                          <label className="text-xs bg-secondary/20 text-foreground px-3 py-1.5 rounded-md hover:bg-secondary/40 cursor-pointer">
                            Replace PDF
                            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                if (e.target.files[0].size > 5 * 1024 * 1024) {
                                  alert("PDF file is too large (max 5MB). Please compress your PDF.");
                                  e.target.value = '';
                                  return;
                                }
                                setExamPdfFile(e.target.files[0]);
                              }
                            }} />
                          </label>
                        </div>
                      </div>
                    ) : examPdfFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 mb-3 text-primary" />
                        <span className="text-sm font-medium mb-4">{examPdfFile.name}</span>
                        <div className="flex space-x-3">
                          <Button size="sm" variant="outline" onClick={() => setExamPdfFile(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <Upload className="w-10 h-10 mb-3" />
                        <span className="text-sm font-medium mb-1">Upload Essay Question Paper (PDF)</span>
                        <span className="text-xs opacity-70">Max 5MB</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            if (e.target.files[0].size > 5 * 1024 * 1024) {
                              alert("PDF file is too large (max 5MB). Please compress your PDF.");
                              e.target.value = '';
                              return;
                            }
                            setExamPdfFile(e.target.files[0]);
                          }
                        }} />
                      </label>
                    )}
                    {examPdfUploading && (
                      <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center backdrop-blur-sm z-10 text-center px-4">
                        <span className="animate-pulse font-bold text-primary mb-2">Uploading PDF to Cloudinary... Please wait</span>
                        <span className="text-xs text-muted-foreground animate-pulse">This usually takes just a few seconds. Do not close this page.</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">Or paste a Direct PDF / Google Drive link:</Label>
                    <Input 
                      placeholder="https://drive.google.com/file/d/... or https://.../paper.pdf"
                      value={examPdfUrl}
                      onChange={(e) => setExamPdfUrl(e.target.value)}
                      className="mt-1 text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">If using Google Drive, make sure sharing is set to &ldquo;Anyone with the link can view&rdquo;.</p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="bg-secondary/5 border-t border-secondary/20 justify-end gap-4 rounded-b-xl py-4">
              {editingExamId && (
                <Button variant="ghost" disabled={isSavingExam} onClick={() => {
                  setEditingExamId(null);
                  setExamTitle("");
                  setExamTime("");
                  setQuestions([{ id: Date.now(), text: "", image: null, options: { A: "", B: "", C: "", D: "" }, correct: "A" }]);
                }}>Cancel Edit</Button>
              )}
              <Button className="gap-2 font-bold min-w-[200px]" onClick={handleSaveExam} disabled={isSavingExam}>
                {isSavingExam ? "Saving..." : examSuccess ? "--- Published!" : <><Save className="w-4 h-4" /> {editingExamId ? "Update Exam" : "Save & Publish Exam"}</>}
              </Button>
            </CardFooter>
          </Card>


        </TabsContent>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="space-y-6">
          <Card className="border-secondary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Student Messages & Doubts
              </CardTitle>
              <CardDescription>Review and resolve issues reported during exams or doubts asked post-exam.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Category Switcher Buttons */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-900 border border-white/10 rounded-xl">
                <Button 
                  type="button"
                  size="sm"
                  variant={msgCategory === "academic" ? "default" : "ghost"} 
                  onClick={() => setMsgCategory("academic")}
                  className={`flex-1 sm:flex-none gap-2 font-bold ${msgCategory === "academic" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <BookOpen className="w-4 h-4" /> Academic Doubts & Paper Reviews
                </Button>
                {user?.role === 'admin' && (
                  <Button 
                    type="button"
                    size="sm"
                    variant={msgCategory === "support" ? "default" : "ghost"} 
                    onClick={() => setMsgCategory("support")}
                    className={`flex-1 sm:flex-none gap-2 font-bold ${msgCategory === "support" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <ShieldAlert className="w-4 h-4" /> Contact Us & Technical Support
                  </Button>
                )}
                <Button 
                  type="button"
                  size="sm"
                  variant={msgCategory === "all" ? "default" : "ghost"} 
                  onClick={() => setMsgCategory("all")}
                  className={`flex-1 sm:flex-none text-xs ${msgCategory === "all" ? "bg-zinc-800 text-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Show All ({examMessages.length})
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-secondary/5 border-b border-border/50 rounded-md">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by student, exam, or message..."
                    className="h-9 w-full pl-9 pr-3 py-1 text-sm rounded-md border border-input bg-background"
                    value={msgSearchQuery}
                    onChange={(e) => setMsgSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="h-9 px-3 py-1 text-sm rounded-md border border-input bg-background flex-1 sm:flex-none"
                  value={msgFilterType}
                  onChange={(e) => setMsgFilterType(e.target.value)}
                >
                  <option value="All">All Message Types</option>
                  <option value="post_exam_doubt">Post-Exam Doubts</option>
                  <option value="video_doubt">Video Doubts</option>
                  {user?.role === 'admin' && (
                    <>
                      <option value="exam_issue">In-Exam Issues</option>
                      <option value="exam_exit">Exam Exit Alerts</option>
                      <option value="approval">Approval Requests</option>
                      <option value="technical">Technical Problems</option>
                      <option value="contact_us">Contact Us Form</option>
                    </>
                  )}
                </select>
                
                <select
                  className="h-9 px-3 py-1 text-sm rounded-md border border-input bg-background flex-1 sm:flex-none"
                  value={msgFilterCourse}
                  onChange={(e) => setMsgFilterCourse(e.target.value)}
                >
                  <option value="All">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const unresolvedMessages = filteredMessages.filter(m => m.status === 'unread');
                const resolvedMessages = filteredMessages.filter(m => m.status !== 'unread');
                
                if (filteredMessages.length === 0) {
                  return (
                    <div className="text-center p-8 text-muted-foreground border-2 border-dashed border-secondary/20 rounded-xl">
                      {examMessages.length === 0 ? "No messages from students." : "No messages match your filters."}
                    </div>
                  );
                }

                const renderMsg = (msg: any) => (
                  <Card key={msg.id} className={`border-l-4 ${msg.status === 'unread' ? 'border-l-primary bg-primary/5' : 'border-l-secondary/50 bg-secondary/10 opacity-70'}`}>
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{msg.studentName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleString()}</span>
                          {msg.status === 'unread' && <span className="bg-primary text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">New</span>}
                        </div>
                        <div>
                          {msg.type === 'contact_us' ? (
                            <>
                              <span className="font-medium text-sm text-foreground">Email:</span> <span className="text-sm text-muted-foreground">{msg.email}</span>
                              {msg.phone && <><span className="ml-4 font-medium text-sm text-foreground">Phone:</span> <span className="text-sm text-muted-foreground">{msg.phone}</span></>}
                              <span className="ml-4 font-medium text-sm text-foreground">Topic:</span> <span className="text-sm text-muted-foreground">{msg.topic}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-sm text-foreground">Exam:</span> <span className="text-sm text-muted-foreground">{msg.examTitle || 'N/A'}</span>
                            </>
                          )}
                          <span className="ml-4 font-medium text-sm text-foreground">Type:</span> <span className="text-sm text-muted-foreground">
                            {msg.type === 'contact_us' ? 'Contact Us' : msg.type === 'exam_issue' ? 'In-Exam Issue' : msg.type === 'exam_exit' ? 'Exam Exit' : msg.type === 'technical' ? 'Technical' : msg.type === 'approval' ? 'Approval' : 'Post-Exam Doubt'}
                          </span>
                        </div>
                        <div className="p-3 bg-background rounded-md border border-border text-sm whitespace-pre-wrap">
                          {msg.message || "No text provided."}
                        </div>
                        {msg.imageUrl && (
                          <div className="mt-2">
                            <a href={msg.imageUrl} target="_blank" rel="noreferrer" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                              <ExternalLink className="w-4 h-4" /> View Attached Image
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        {msg.examId && (
                          <>
                            <Button size="sm" variant="outline" className="w-full" render={<Link href={`/exam/${msg.examId}/results`} />}>
                              Review Paper
                            </Button>
                            <Button size="sm" variant="destructive" className="w-full" onClick={() => handleAllowRedo(msg.examId, msg.userId)}>
                              Allow Redo
                            </Button>
                          </>
                        )}
                        {msg.status === 'unread' ? (
                          <Button size="sm" className="w-full" onClick={() => handleResolveMessage(msg.id)}>
                            Mark Resolved
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground font-medium py-1">
                            <CheckCircle2 className="w-4 h-4" /> Resolved
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );

                return (
                  <div className="grid gap-8">
                    {unresolvedMessages.length > 0 && (
                      <div className="grid gap-4">
                        {resolvedMessages.length > 0 && <h3 className="font-bold text-lg text-primary">Unresolved Messages</h3>}
                        {unresolvedMessages.map(renderMsg)}
                      </div>
                    )}
                    
                    {resolvedMessages.length > 0 && (
                      <div className="grid gap-4">
                        <h3 className="font-bold text-lg text-muted-foreground border-t border-border pt-4 mt-2">Resolved</h3>
                        {resolvedMessages.map(renderMsg)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM MANAGEMENT TAB */}
        <TabsContent value="team" className="space-y-6">
          <Card className="border-primary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Team Management
              </CardTitle>
              <CardDescription>
                Add teachers or admins. Teachers have full access except Team Management. Admins have full access including this page.
                <br /><span className="text-yellow-500 font-medium">⚠ The person must already have a registered account before you can make them a teacher or admin.</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Add Member Form */}
              <form onSubmit={handleAddTeamMember} className="flex flex-col md:flex-row gap-3 items-end p-4 bg-secondary/10 rounded-lg border border-secondary/30">
                <div className="flex-1 space-y-2">
                  <Label>Email Address (must be a registered account)</Label>
                  <Input 
                    type="email" 
                    placeholder="teacher@example.com" 
                    value={newTeamEmail}
                    onChange={(e) => setNewTeamEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2 w-full md:w-36">
                  <Label>Role</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newTeamRole}
                    onChange={(e) => setNewTeamRole(e.target.value as "admin" | "teacher")}
                  >
                    <option value="teacher">👩‍🏫 Teacher</option>
                    <option value="admin">🛡 Admin</option>
                  </select>
                </div>
                <div className="space-y-2 w-full md:w-48">
                  <Label>Subject Taught</Label>
                  <Input 
                    placeholder="e.g. Physics, Mechanics" 
                    value={newTeamSubject}
                    onChange={(e) => setNewTeamSubject(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isAddingTeamMember} className="w-full md:w-auto">
                  {isAddingTeamMember ? "Adding..." : "Add to Team"}
                </Button>
              </form>

              {/* Pending Teacher Applications */}
              {(() => {
                const pendingTeachers = teamMembers.filter(m => m.role === 'teacher' && !m.isApproved);
                if (pendingTeachers.length === 0) return null;
                return (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <h3 className="font-bold text-base mb-3 text-yellow-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Pending Teacher Applications ({pendingTeachers.length})
                    </h3>
                    <div className="grid gap-3">
                      {pendingTeachers.map(teacher => (
                        <div key={teacher.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-background rounded-md border border-border">
                          <div className="flex-1">
                            <p className="font-bold text-sm">{teacher.name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{teacher.email}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Subject: <span className="font-medium text-foreground">{teacher.subject || 'Not specified'}</span></p>
                            {teacher.createdAt && <p className="text-xs text-muted-foreground">Applied: {new Date(teacher.createdAt).toLocaleDateString()}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprovePendingTeacher(teacher.id, teacher.name)}>
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10" onClick={() => handleRejectPendingTeacher(teacher.id, teacher.name)}>
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUserAccount(teacher.id, teacher.name || teacher.email, 'Teacher')}>
                              <Trash2 className="w-3 h-3 mr-1" /> {confirmingDeleteId === teacher.id ? "Confirm Delete" : "Delete Account"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Current Team Table */}
              <div>
                <h3 className="font-bold text-base mb-3">Current Team ({teamMembers.filter(m => m.isApproved).length})</h3>
                {teamMembers.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic p-4 text-center">No team members yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-secondary/30">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/20">
                        <tr>
                          <th className="text-left p-3 font-semibold">Name / Email</th>
                          <th className="text-left p-3 font-semibold">Role</th>
                          <th className="text-left p-3 font-semibold">Subject Taught</th>
                          <th className="text-left p-3 font-semibold">Assigned Courses</th>
                          <th className="text-left p-3 font-semibold">2FA Status</th>
                          <th className="text-left p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.filter(m => m.isApproved).map((member) => {
                          const assignedCourses = courses.filter(c => c.teacherId === member.id);
                          const isEditingSubject = editingTeacherSubjectId === member.id;
                          return (
                            <tr key={member.id} className="border-t border-secondary/20 hover:bg-secondary/10">
                              <td className="p-3">
                                <p className="font-medium">{member.name || "No name"}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  member.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                                }`}>
                                  {member.role === 'admin' ? '🛡 Admin' : '👩‍🏫 Teacher'}
                                </span>
                              </td>
                              <td className="p-3">
                                {isEditingSubject ? (
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      value={editTeacherSubjectValue}
                                      onChange={(e) => setEditTeacherSubjectValue(e.target.value)}
                                      className="h-7 text-xs w-32"
                                      placeholder="Subject"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveTeacherSubject(member.id, editTeacherSubjectValue);
                                        if (e.key === 'Escape') setEditingTeacherSubjectId(null);
                                      }}
                                    />
                                    <button 
                                      onClick={() => handleSaveTeacherSubject(member.id, editTeacherSubjectValue)}
                                      className="p-1 bg-green-600 hover:bg-green-700 text-foreground rounded text-xs"
                                      title="Save Subject"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingTeacherSubjectId(null)}
                                      className="p-1 hover:bg-secondary/60 rounded text-xs"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-xs bg-secondary/30 px-2 py-0.5 rounded border border-secondary/40">
                                      {member.subject || (member.role === 'teacher' ? 'Physics' : 'Administration')}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingTeacherSubjectId(member.id);
                                        setEditTeacherSubjectValue(member.subject || (member.role === 'teacher' ? 'Physics' : 'Administration'));
                                      }}
                                      className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-secondary/40"
                                      title="Edit Subject"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  <BookOpen className="w-3 h-3" /> {assignedCourses.length} Course{assignedCourses.length === 1 ? '' : 's'}
                                </span>
                              </td>
                              <td className="p-3">
                                {member.totpSecret ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-green-500 text-xs font-bold">✅ 2FA Enabled</span>
                                    {user?.role === 'admin' && member.email !== user?.email && (
                                      <button
                                        onClick={() => handleResetTeamMember2FA(member.id, member.name || member.email)}
                                        title="Reset 2FA for this user"
                                        className="text-[10px] text-muted-foreground hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors inline-flex items-center gap-0.5 border border-border/50"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" /> Reset
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-yellow-500 text-xs font-medium">⚠ Not Set Up</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 gap-1 border-secondary/40 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => setSelectedTeacherDetails(member)}
                                  >
                                    <Eye className="w-3 h-3" /> Details
                                  </Button>
                                  {member.id !== user?.uid ? (
                                    <>
                                      <Button
                                        size="sm" variant="outline"
                                        className="text-xs h-7 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10"
                                        onClick={() => handleRemoveTeamMember(member.id, member.email)}
                                        title="Revoke role and convert to student"
                                      >
                                        Revoke Role
                                      </Button>
                                      <Button
                                        size="sm" variant="destructive"
                                        className="text-xs h-7"
                                        onClick={() => handleDeleteUserAccount(member.id, member.name || member.email, member.role)}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" /> {confirmingDeleteId === member.id ? "Confirm Erase" : "Delete Account"}
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">You</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm space-y-1">
                <p className="font-bold text-blue-400">🔐 2FA for Teachers & Admins</p>
                <p className="text-muted-foreground">Each teacher and admin must set up Google Authenticator when they first log in to their admin panel. They will be prompted automatically at <strong>/admin/2fa</strong>. The 2FA status above shows whether they have completed their setup.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SITE SETTINGS TAB */}
        <TabsContent value="site" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Footer Editor Card */}
            <Card className="border-primary/30 shadow-md hover:shadow-lg hover:border-primary/60 transition-all group">
              <CardHeader className="bg-primary/5 border-b border-primary/20 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Globe className="w-6 h-6 text-primary" />
                  Footer Editor
                </CardTitle>
                <CardDescription>
                  Edit the footer tagline, Quick Links, Company links, and contact information shown at the bottom of every page.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4 text-xs text-muted-foreground space-y-1.5">
                  <p>✏️ <strong>Tagline</strong> — "Learn Today · Build Tomorrow"</p>
                  <p>🔗 <strong>Quick Links</strong> — Courses, Exams, Leaderboard...</p>
                  <p>🏢 <strong>Company Links</strong> — About Us, Reviews, Login...</p>
                  <p>📧 <strong>Contact</strong> — Email, Phone, Location</p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 bg-secondary/5 py-3">
                <Link href="/admin/footer" className="w-full">
                  <Button className="w-full gap-2">
                    <Globe className="w-4 h-4" /> Open Footer Editor
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* About Page Editor Card */}
            <Card className="border-secondary/40 shadow-md hover:shadow-lg hover:border-primary/40 transition-all group">
              <CardHeader className="bg-secondary/5 border-b border-secondary/20 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <BookOpen className="w-6 h-6 text-primary" />
                  About Us Page
                </CardTitle>
                <CardDescription>
                  Edit the main content, mission, vision, and team details shown on the public About page.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4 text-xs text-muted-foreground space-y-1.5">
                  <p>🎯 <strong>Mission & Vision</strong> statements</p>
                  <p>✨ <strong>Features & Statistics</strong> highlights</p>
                  <p>👥 <strong>Team Members</strong> section</p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 bg-secondary/5 py-3">
                <Link href="/admin/about" className="w-full">
                  <Button className="w-full gap-2" variant="outline">
                    <BookOpen className="w-4 h-4" /> Open About Editor
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Payment Settings Card */}
            <Card className="border-secondary/40 shadow-md hover:shadow-lg hover:border-primary/40 transition-all group">
              <CardHeader className="bg-secondary/5 border-b border-secondary/20 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <CreditCard className="w-6 h-6 text-primary" />
                  Payment Settings
                </CardTitle>
                <CardDescription>
                  Configure accepted payment methods and edit bank account details for manual transfers.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4 text-xs text-muted-foreground space-y-1.5">
                  <p>🏦 <strong>Bank Transfer</strong> (On/Off)</p>
                  <p>💳 <strong>Card Payment</strong> (On/Off)</p>
                  <p>✏️ <strong>Bank Details</strong> (Name, Branch, Account)</p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 bg-secondary/5 py-3">
                <Link href="/admin/payment-settings" className="w-full">
                  <Button className="w-full gap-2" variant="outline">
                    <CreditCard className="w-4 h-4" /> Edit Payment Settings
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* MY PROFILE TAB */}
        <TabsContent value="myprofile" className="space-y-6">
          <Card className="border-primary/50 shadow-md max-w-2xl mx-auto">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Camera className="w-5 h-5" /> My Profile
              </CardTitle>
              <CardDescription>
                Update your profile picture and personal details visible to students and in the team directory.
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
                  <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-bold ${user?.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {user?.role === 'admin' ? '🛡 Admin' : '👩‍🏫 Teacher'}
                  </span>
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
                  <Label>Phone Number</Label>
                  <Input
                    type="number"
                    placeholder="+94 7X XXX XXXX"
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject / Specialization</Label>
                  <Input
                    placeholder="e.g. Physics, Mechanics, Waves"
                    value={profileSubject}
                    onChange={e => setProfileSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bio / Short Description</Label>
                  <Textarea
                    placeholder="A brief description about yourself shown on the About page..."
                    value={profileBio}
                    onChange={e => setProfileBio(e.target.value)}
                    rows={4}
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
        </TabsContent>

      </Tabs>

      {/* RECEIPT POPUP MODAL */}
      {viewingReceipt && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingReceipt(null)}
        >
          <div 
            className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/10">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Receipt: {viewingReceipt.studentName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {viewingReceipt.folderName} --- <span className="text-green-500 font-bold">Rs. {viewingReceipt.amount}</span>
                  {viewingReceipt.date ? ` --- ${new Date(viewingReceipt.date).toLocaleString()}` : ''}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewingReceipt(null)}
                className="rounded-full w-8 h-8 p-0 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Receipt Image / PDF Display */}
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-black/50 min-h-[320px]">
              {viewingReceipt.url.startsWith("data:application/pdf") || viewingReceipt.url.toLowerCase().includes(".pdf") ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <iframe 
                    src={viewingReceipt.url} 
                    className="w-full h-[65vh] rounded-lg border border-border/30 bg-white" 
                    title={`Receipt PDF from ${viewingReceipt.studentName}`}
                  />
                </div>
              ) : (
                <img 
                  src={viewingReceipt.url} 
                  alt={`Receipt from ${viewingReceipt.studentName}`} 
                  className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-2xl border border-border/30"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-border/50 bg-secondary/10 flex justify-between items-center">
              {(() => {
                const isPdf = viewingReceipt.url.startsWith("data:application/pdf") || viewingReceipt.url.toLowerCase().includes(".pdf");
                return (
                  <a 
                    href={viewingReceipt.url} 
                    download={`receipt-${viewingReceipt.studentName}.${isPdf ? 'pdf' : 'jpg'}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline px-3 py-1.5 rounded-md hover:bg-primary/10 transition-colors font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open / Download {isPdf ? "PDF Document" : "Full Resolution"}
                  </a>
                );
              })()}
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => setViewingReceipt(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics List Modal */}
      {activeAnalyticsList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl border-primary/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-secondary/20 border-b relative flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4"
                onClick={() => setActiveAnalyticsList(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                {activeAnalyticsList.title}
              </CardTitle>
              <CardDescription>
                {activeAnalyticsList.students.length} students found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[60vh]">
              {activeAnalyticsList.students.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No students in this category.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {activeAnalyticsList.students.map(student => (
                    <div key={student.id} className="p-4 hover:bg-secondary/10 flex justify-between items-center transition-colors">
                      <div>
                        <p className="font-bold text-primary">{student.name || student.email}</p>
                        <p className="text-sm font-mono text-muted-foreground">{student.studentId || 'N/A'} - Batch {student.graduationYear || 'N/A'}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedStudentInfo(student);
                          setActiveAnalyticsList(null);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" /> More
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Info Modal */}
      {selectedStudentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl border-primary/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-secondary/20 border-b relative flex-shrink-0">
              <div className="absolute right-12 top-4 flex gap-2">
                {!isEditingStudent ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => {
                      setEditingStudentData(selectedStudentInfo);
                      setIsEditingStudent(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8"
                      onClick={() => setIsEditingStudent(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="h-8 gap-1"
                      onClick={handleSaveStudentDetails}
                    >
                      <Check className="w-4 h-4" /> Save
                    </Button>
                  </>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-3 rounded-full hover:bg-destructive/20 hover:text-destructive"
                onClick={() => {
                  setSelectedStudentInfo(null);
                  setIsEditingStudent(false);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl flex items-center gap-2 pt-1">
                <UserPlus className="w-5 h-5 text-primary" /> 
                Student Details
              </CardTitle>
              <CardDescription>
                Detailed information for {selectedStudentInfo.name} ({selectedStudentInfo.studentId || 'N/A'})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Full Name</p>
                  {isEditingStudent ? (
                    <Input value={editingStudentData.name} onChange={(e) => setEditingStudentData({...editingStudentData, name: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  {isEditingStudent ? (
                    <Input value={editingStudentData.email} onChange={(e) => setEditingStudentData({...editingStudentData, email: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Date of Birth</p>
                  {isEditingStudent ? (
                    <Input type="date" value={editingStudentData.dob || ''} onChange={(e) => setEditingStudentData({...editingStudentData, dob: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.dob || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Gender</p>
                  {isEditingStudent ? (
                    <select 
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                      value={editingStudentData.gender || ''}
                      onChange={(e) => setEditingStudentData({...editingStudentData, gender: e.target.value})}
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.gender || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">School</p>
                  {isEditingStudent ? (
                    <Input value={editingStudentData.school || ''} onChange={(e) => setEditingStudentData({...editingStudentData, school: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.school || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Stream</p>
                  {isEditingStudent ? (
                    <select 
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                      value={editingStudentData.stream || ''}
                      onChange={(e) => setEditingStudentData({...editingStudentData, stream: e.target.value})}
                    >
                      <option value="" disabled>Select Stream</option>
                      {streams.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.stream || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Student Phone</p>
                  {isEditingStudent ? (
                    <Input type="number" value={editingStudentData.phone || ''} onChange={(e) => setEditingStudentData({...editingStudentData, phone: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.phone || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Parent Phone</p>
                  {isEditingStudent ? (
                    <Input type="number" value={editingStudentData.parentPhone || ''} onChange={(e) => setEditingStudentData({...editingStudentData, parentPhone: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.parentPhone || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">NIC Number</p>
                  {isEditingStudent ? (
                    <Input value={editingStudentData.nicNumber || ''} onChange={(e) => setEditingStudentData({...editingStudentData, nicNumber: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.nicNumber || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Batch / Class ID</p>
                  {isEditingStudent ? (
                    <select 
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                      value={editingStudentData.graduationYear || ''}
                      onChange={(e) => setEditingStudentData({...editingStudentData, graduationYear: e.target.value})}
                    >
                      <option value="">Select Batch</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.year}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.graduationYear || 'N/A'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Address</p>
                  {isEditingStudent ? (
                    <Input value={editingStudentData.address || ''} onChange={(e) => setEditingStudentData({...editingStudentData, address: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-medium text-base">{selectedStudentInfo.address || 'N/A'}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-2">Account Status & Verification</h3>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedStudentInfo.isApproved ? 'bg-green-500/20 text-green-600' : selectedStudentInfo.pendingReason === 'Access Suspended' ? 'bg-red-500/20 text-red-600' : 'bg-yellow-500/20 text-yellow-600'}`}>
                      {selectedStudentInfo.isApproved ? 'Active (Approved)' : selectedStudentInfo.pendingReason === 'Access Suspended' ? 'Account Suspended' : 'Pending Approval'}
                    </span>
                    
                    {!selectedStudentInfo.isApproved && selectedStudentInfo.pendingReason === 'Access Suspended' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-foreground"
                          onClick={() => {
                            handleApproveStudent(selectedStudentInfo.id);
                            setSelectedStudentInfo(null);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Revoke Suspend (Allow Login)
                        </Button>
                      </div>
                    )}

                    {!selectedStudentInfo.isApproved && selectedStudentInfo.pendingReason !== 'Access Suspended' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-foreground"
                          onClick={() => {
                            handleApproveStudent(selectedStudentInfo.id);
                            setSelectedStudentInfo(null);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            if(confirm('Are you sure you want to reject and delete this student?')) {
                              handleRejectStudent(selectedStudentInfo.id);
                              setSelectedStudentInfo(null);
                            }
                          }}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {selectedStudentInfo.isApproved && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            handleSuspendStudent(selectedStudentInfo.id);
                            setSelectedStudentInfo(null);
                          }}
                        >
                          <X className="w-4 h-4 mr-1" /> Suspend Account
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {selectedStudentInfo.nicUrl && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">Uploaded NIC Image:</p>
                      <img 
                        src={selectedStudentInfo.nicUrl} 
                        alt="NIC Verification" 
                        className="max-w-full h-auto max-h-[300px] object-contain border rounded-lg bg-secondary/10 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          if (selectedStudentInfo.nicUrl.startsWith('data:')) {
                            const win = window.open();
                            if (win) {
                              win.document.write(`
                                <html style="margin:0; background:#0e0e0e; height:100%; display:flex; justify-content:center; align-items:center;">
                                  <head><title>NIC Image Verification</title></head>
                                  <body style="margin:0;">
                                    <img src="${selectedStudentInfo.nicUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" />
                                  </body>
                                </html>
                              `);
                              win.document.close();
                            } else {
                              alert("Pop-up blocked. Please allow pop-ups to view the image.");
                            }
                          } else {
                            window.open(selectedStudentInfo.nicUrl, '_blank');
                          }
                        }}
                        title="Click to view full size"
                      />
                    </div>
                  )}
                  {!selectedStudentInfo.nicUrl && !selectedStudentInfo.isApproved && (
                    <p className="text-sm text-muted-foreground italic text-yellow-600">No NIC image was uploaded by this student.</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-2 text-primary">Student Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                  <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Study Time</p>
                    <p className="text-xl font-black">{Math.floor((selectedStudentInfo.totalStudyTimeMins || 0) / 60)}h {(selectedStudentInfo.totalStudyTimeMins || 0) % 60}m</p>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Today's Time</p>
                    <p className="text-xl font-black">
                      {selectedStudentInfo.lastStudyDate === new Date().toISOString().split('T')[0] ? 
                        `${Math.floor((selectedStudentInfo.todayStudyTimeMins || 0) / 60)}h ${(selectedStudentInfo.todayStudyTimeMins || 0) % 60}m` : 
                        '0h 0m'
                      }
                    </p>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Avg Daily Time</p>
                    <p className="text-xl font-black">
                      {(() => {
                        const mins = selectedStudentInfo.totalStudyTimeMins || 0;
                        const days = selectedStudentInfo.createdAt ? Math.max(1, Math.round((Date.now() - selectedStudentInfo.createdAt) / (1000 * 60 * 60 * 24))) : Math.max(1, selectedStudentInfo.streakDays || 1);
                        const avg = Math.round(mins / days);
                        return `${Math.floor(avg / 60)}h ${avg % 60}m`;
                      })()}
                    </p>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Average Grade</p>
                    <p className="text-xl font-black text-green-500">{selectedStudentInfo.averageGrade || 0}%</p>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                    <p className="text-xs text-muted-foreground uppercase font-bold">XP Level</p>
                    <p className="text-xl font-black text-orange-500">Lvl {selectedStudentInfo.xpLevel || 1}</p>
                  </div>
                </div>
                <details className="mt-4 border border-border/50 rounded-lg bg-secondary/5">
                  <summary className="p-3 font-bold cursor-pointer hover:bg-secondary/10 flex items-center justify-between text-sm">
                    View All-Time Daily Study History
                  </summary>
                  <div className="p-4 pt-2 text-sm max-h-60 overflow-y-auto space-y-4">
                    {(() => {
                      const history = { ...(selectedStudentInfo.studyHistory || {}) };
                      // Retroactively inject the most recently recorded day if it predates the new system
                      if (selectedStudentInfo.lastStudyDate && selectedStudentInfo.todayStudyTimeMins) {
                        if (!history[selectedStudentInfo.lastStudyDate]) {
                          history[selectedStudentInfo.lastStudyDate] = selectedStudentInfo.todayStudyTimeMins;
                        }
                      }

                      if (Object.keys(history).length === 0) {
                        return <p className="text-muted-foreground italic text-center py-2">No daily history recorded yet. History will populate as the student studies.</p>;
                      }

                      const grouped: Record<string, { total: number, days: any[] }> = {};
                      for (const [dateStr, mins] of Object.entries(history)) {
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) continue;
                        const monthKey = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                        if (!grouped[monthKey]) grouped[monthKey] = { total: 0, days: [] };
                        grouped[monthKey].total += Number(mins);
                        grouped[monthKey].days.push({ date: dateStr, mins: Number(mins), timestamp: d.getTime() });
                      }

                      const sortedMonths = Object.entries(grouped).sort((a, b) => b[1].days[0].timestamp - a[1].days[0].timestamp);
                      sortedMonths.forEach(m => m[1].days.sort((a: any, b: any) => b.timestamp - a.timestamp));

                      return sortedMonths.map(([monthKey, data]) => (
                        <div key={monthKey} className="space-y-2">
                          <div className="flex justify-between items-center bg-secondary/10 px-3 py-1.5 rounded-md border border-secondary/20">
                            <span className="font-bold text-primary">{monthKey}</span>
                            <span className="font-black text-primary text-xs uppercase tracking-wider">{Math.floor(data.total / 60)}h {data.total % 60}m TOTAL</span>
                          </div>
                          <div className="space-y-1.5 px-2">
                            {data.days.map((day: any) => (
                              <div key={day.date} className="flex justify-between items-center border-b border-border/30 pb-1.5 last:border-0">
                                <span className="font-medium text-muted-foreground">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span className="font-bold">{Math.floor(day.mins / 60)}h {day.mins % 60}m</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </details>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-2">Payment History</h3>
                {allPayments.filter(p => p.studentId === selectedStudentInfo.id).length > 0 ? (
                  <div className="space-y-2">
                    {allPayments.filter(p => p.studentId === selectedStudentInfo.id).map(payment => (
                      <div key={payment.id} className="flex justify-between items-center bg-secondary/10 p-3 rounded-lg border border-secondary/20">
                        <div>
                          <p className="font-bold text-sm">{folders.find(f => f.id === payment.folderId)?.name || 'Unknown Folder'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold font-mono">
                            {payment.status === 'approved' ? (
                              <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded">Approved</span>
                            ) : payment.status === 'rejected' ? (
                              <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded">Rejected</span>
                            ) : (
                              <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Pending</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No payment history found for this student.</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-2 text-foreground flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> Device Session Management
                </h3>
                <div className="p-4 rounded-xl border border-border/50 bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Active Device Status:
                      {selectedStudentInfo.deviceId === 'REVOKED' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">
                          Session Revoked (Signed Out)
                        </span>
                      ) : selectedStudentInfo.deviceId ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                          Device Active ({selectedStudentInfo.deviceId.substring(0, 8)}...)
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/40 text-muted-foreground">
                          No Active Device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click the button below if the student's phone is broken or needs to switch devices. This immediately disconnects their old device and allows them to log in from their new phone (or same device) with the same account!
                    </p>
                  </div>

                  <Button 
                    variant="destructive"
                    size="sm"
                    className="shrink-0 font-bold flex items-center gap-1.5 shadow-sm"
                    onClick={() => handleSignoutStudentDevice(selectedStudentInfo.id, selectedStudentInfo.name)}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out From Device
                  </Button>
                </div>
              </div>

              {/* DANGER ZONE: Delete Account */}
              <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl mt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-destructive text-sm flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Danger Zone: Delete Account
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permanently delete this student's account, including their exam results and history. They will be logged out and can sign up from the beginning later if needed.
                    </p>
                  </div>

                  <Button 
                    variant={confirmingDeleteId === selectedStudentInfo.id ? "destructive" : "outline"}
                    size="sm"
                    className={`shrink-0 font-bold flex items-center gap-1.5 shadow-sm ${confirmingDeleteId === selectedStudentInfo.id ? 'animate-pulse' : 'text-destructive border-destructive/50 hover:bg-destructive hover:text-white'}`}
                    onClick={() => handleDeleteStudentAccount(selectedStudentInfo.id, selectedStudentInfo.name)}
                  >
                    <Trash2 className="w-4 h-4" /> 
                    {confirmingDeleteId === selectedStudentInfo.id ? "Click to Confirm Permanent Deletion" : "Delete Account"}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* TEACHER DETAILS MODAL */}
      {selectedTeacherDetails && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedTeacherDetails(null)}
        >
          <div 
            className="bg-card border border-border/80 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-secondary/10">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/30 shrink-0">
                  {selectedTeacherDetails.profilePicture ? (
                    <img src={selectedTeacherDetails.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedTeacherDetails.name?.charAt(0) || selectedTeacherDetails.email?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    {selectedTeacherDetails.name || "Teacher"}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      selectedTeacherDetails.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {selectedTeacherDetails.role === 'admin' ? '🛡 Admin' : '👩‍🏫 Teacher'}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedTeacherDetails.email}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTeacherDetails(null)}
                className="rounded-full w-8 h-8 p-0 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Profile Picture Upload Section */}
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 space-y-3">
                <Label className="font-bold text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" /> Profile Picture
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 shrink-0 flex items-center justify-center">
                    {selectedTeacherDetails.profilePicture ? (
                      <img src={selectedTeacherDetails.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-primary/40">
                        {(selectedTeacherDetails.name || selectedTeacherDetails.email || 'T').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">Upload a square profile photo. This will be shown on the Courses page.</p>
                    <label className="cursor-pointer">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Upload Photo
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSaveTeacherProfilePicture(selectedTeacherDetails.id, file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Subject Taught Edit Section */}
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 space-y-3">
                <Label className="font-bold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Subject / Specialization
                </Label>
                <p className="text-xs text-muted-foreground">What subject this teacher instructs (e.g. A/L Physics, Mechanics, Waves, Modern Physics).</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. Physics, Mechanics"
                    defaultValue={selectedTeacherDetails.subject || (selectedTeacherDetails.role === 'teacher' ? 'Physics' : 'Administration')}
                    id="teacher-modal-subject"
                  />
                  <Button 
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById("teacher-modal-subject") as HTMLInputElement;
                      if (input) {
                        handleSaveTeacherSubject(selectedTeacherDetails.id, input.value);
                      }
                    }}
                    className="shrink-0 gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Subject
                  </Button>
                </div>
              </div>

              {/* Status & Credentials */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Google Authenticator (2FA)</p>
                    <p className="font-bold text-xs">
                      {selectedTeacherDetails.totpSecret ? (
                        <span className="text-green-500">✅ Enabled</span>
                      ) : (
                        <span className="text-yellow-500">⚠ Not Set Up</span>
                      )}
                    </p>
                  </div>
                  {user?.role === 'admin' && selectedTeacherDetails.totpSecret && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs h-6 text-red-500 border-red-500/30 hover:bg-red-500/10 gap-1 w-fit"
                      onClick={() => handleResetTeamMember2FA(selectedTeacherDetails.id, selectedTeacherDetails.name || selectedTeacherDetails.email)}
                    >
                      <RotateCcw className="w-3 h-3" /> Reset 2FA
                    </Button>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                  <p className="text-xs text-muted-foreground mb-1">Portal Access</p>
                  <p className="font-bold text-primary">Full Teaching & Live Access</p>
                </div>
              </div>

              {/* Assigned Courses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Courses Taught by {selectedTeacherDetails.name || 'this Teacher'}
                  </h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    {courses.filter(c => c.teacherId === selectedTeacherDetails.id).length} courses
                  </span>
                </div>

                {courses.filter(c => c.teacherId === selectedTeacherDetails.id).length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic rounded-lg border border-dashed border-secondary/40">
                    No courses currently assigned to this teacher. You can assign courses in the "Courses" tab.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {courses.filter(c => c.teacherId === selectedTeacherDetails.id).map(c => (
                      <div key={c.id} className="p-3 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">Batch: {c.batchId === 'all' ? 'All Batches' : batches.find(b => b.id === c.batchId)?.year || c.batchId}</p>
                        </div>
                        <Button 
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 text-primary hover:bg-primary/10"
                          onClick={() => {
                            setCourseTeacherFilter(selectedTeacherDetails.id);
                            setSelectedTeacherDetails(null);
                            const coursesTabTrigger = document.querySelector('button[value="courses"]') as HTMLButtonElement;
                            coursesTabTrigger?.click();
                          }}
                        >
                          View in Manager &rarr;
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DANGER ZONE: Delete Teacher Account */}
              {selectedTeacherDetails.id !== user?.uid && (
                <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl mt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-destructive text-sm flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Danger Zone: Delete Teacher Account
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Completely erase this teacher's account from the database. They will be logged out and permanently removed from the system.
                      </p>
                    </div>

                    <Button 
                      variant={confirmingDeleteId === selectedTeacherDetails.id ? "destructive" : "outline"}
                      size="sm"
                      className={`shrink-0 font-bold flex items-center gap-1.5 shadow-sm ${confirmingDeleteId === selectedTeacherDetails.id ? 'animate-pulse' : 'text-destructive border-destructive/50 hover:bg-destructive hover:text-white'}`}
                      onClick={() => handleDeleteUserAccount(selectedTeacherDetails.id, selectedTeacherDetails.name || selectedTeacherDetails.email, selectedTeacherDetails.role || 'Teacher')}
                    >
                      <Trash2 className="w-4 h-4" /> 
                      {confirmingDeleteId === selectedTeacherDetails.id ? "Click to Confirm Permanent Deletion" : "Delete Account"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/50 bg-secondary/10 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedTeacherDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: View All Created Exams */}
      {showAllExamsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/20">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-primary" /> All Created Exams ({publishedExams.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Click "Details" on any exam to view statistics, student submissions, or print a results report.</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setShowAllExamsModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-3 border-b border-border/50 bg-secondary/5 flex flex-wrap gap-2 items-center">
              <Input
                placeholder="Search by title, course, folder, or date..."
                value={examSearchTerm}
                onChange={(e) => setExamSearchTerm(e.target.value)}
                className="w-full sm:w-auto flex-1 min-w-[200px] h-9 text-sm"
              />
              <select
                className="h-9 px-3 py-1 text-sm rounded-md border border-input bg-background"
                value={examFilterCourse}
                onChange={(e) => setExamFilterCourse(e.target.value)}
              >
                <option value="all">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="h-9 px-3 py-1 text-sm rounded-md border border-input bg-background"
                value={examFilterFolder}
                onChange={(e) => setExamFilterFolder(e.target.value)}
              >
                <option value="all">All Folders</option>
                {folders.filter(f => examFilterCourse === 'all' || f.courseId === examFilterCourse).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <select
                className="h-9 px-3 py-1 text-sm rounded-md border border-input bg-background"
                value={examFilterType}
                onChange={(e) => setExamFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="essay">Essay</option>
              </select>
              <select
                className="h-9 px-3 py-1 text-sm rounded-md border border-input bg-background"
                value={examFilterDate}
                onChange={(e) => setExamFilterDate(e.target.value)}
              >
                <option value="all">Any Date</option>
                <option value="today">Past 24 Hours</option>
                <option value="this_week">Past 7 Days</option>
                <option value="this_month">Past 30 Days</option>
              </select>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {publishedExams.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No exams created yet.</div>
              ) : filteredExams.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No exams match your current filters.</div>
              ) : (
                filteredExams.map((exam) => {
                  const now = Date.now();
                  const hasStart = !!exam.startTime;
                  const hasEnd = !!exam.endTime;
                  const isUpcoming = hasStart && now < exam.startTime;
                  const isEnded = hasEnd && now > exam.endTime;
                  const isActive = (!hasStart || now >= exam.startTime) && (!hasEnd || now <= exam.endTime);

                  return (
                    <div 
                      key={exam.id} 
                      className="p-3.5 rounded-lg border border-border/50 bg-background hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{exam.title}</span>
                          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {exam.category || 'General'}
                          </span>
                          <span className="text-[10px] font-semibold bg-secondary/50 text-foreground px-2 py-0.5 rounded-full uppercase">
                            {exam.examType === 'essay' ? '📝 Essay' : '✅ MCQ'}
                          </span>
                          {isEnded ? (
                            <span className="text-[10px] font-bold bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">
                              🔴 Ended
                            </span>
                          ) : isActive ? (
                            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">
                              🟢 Active
                            </span>
                          ) : isUpcoming ? (
                            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full">
                              🟡 Upcoming
                            </span>
                          ) : null}
                          {exam.hidden && (
                            <span className="text-[10px] font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded-full flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5" /> Hidden
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Duration: <strong>{exam.duration || '15 min'}</strong></span>
                          {hasStart && <span>Started: <strong>{new Date(exam.startTime).toLocaleDateString()}</strong></span>}
                          {hasEnd && <span>Deadline: <strong>{new Date(exam.endTime).toLocaleDateString()}</strong></span>}
                          {exam.examType === 'essay' ? (
                            <span>Type: <strong>PDF Submission</strong></span>
                          ) : (
                            <span>Questions: <strong>{Array.isArray(exam.questions) ? exam.questions.length : exam.questions}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {isActive && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-2.5 text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                            onClick={() => handleEndExamNow(exam.id, exam.title)}
                            title="End Exam Now for all students"
                          >
                            <StopCircle className="w-3.5 h-3.5" /> End Now
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary gap-1"
                          onClick={() => {
                            handleOpenExamDetails(exam);
                          }}
                        >
                          <Info className="w-3.5 h-3.5" /> Details
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => {
                            setShowAllExamsModal(false);
                            handleEditExam(exam);
                          }}
                          title="Edit Exam"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          className={`w-8 h-8 ${exam.hidden ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600 hover:bg-emerald-500/10'}`}
                          onClick={() => handleToggleHide(exam.id)}
                          title={exam.hidden ? "Unhide Exam" : "Hide Exam"}
                        >
                          {exam.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          className="w-8 h-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteExam(exam.id)}
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-border/50 bg-secondary/10 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setShowAllExamsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Exam Details, Statistics & Printable PDF Table */}
      {selectedExamDetails && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileQuestion className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {selectedExamDetails.title}
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {selectedExamDetails.examType === 'essay' ? '📝 Essay' : '✅ MCQ'}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Category: {selectedExamDetails.category || 'General'} | Duration: {selectedExamDetails.duration || '15 min'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {(() => {
                  const now = Date.now();
                  const hasStart = !!selectedExamDetails.startTime;
                  const hasEnd = !!selectedExamDetails.endTime;
                  const isActive = (!hasStart || now >= selectedExamDetails.startTime) && (!hasEnd || now <= selectedExamDetails.endTime);
                  if (isActive) {
                    return (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1 text-xs"
                        onClick={async () => {
                          await handleEndExamNow(selectedExamDetails.id, selectedExamDetails.title);
                          setSelectedExamDetails((prev: any) => prev ? { ...prev, endTime: Date.now() - 1000 } : null);
                        }}
                      >
                        <StopCircle className="w-3.5 h-3.5" /> End Exam Now
                      </Button>
                    );
                  }
                  return null;
                })()}
                {!selectedExamDetails.gradesPublished && selectedExamDetails.examType === 'essay' && (
                  <Button 
                    size="sm" 
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handlePublishGrades}
                  >
                    Publish Grades
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      alert("Pop-up blocked! Please allow pop-ups to generate and print the exam PDF.");
                      return;
                    }
                    const nowStr = new Date().toLocaleString();
                    const tableRows = examDetailedResults.map((r, i) => `
                      <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
                        <td style="padding: 10px; font-weight: bold;">#${i + 1}</td>
                        <td style="padding: 10px;">${r.studentName || 'Student'}</td>
                        <td style="padding: 10px;">${r.rawScore ?? r.score ?? 0} ${selectedExamDetails.examType === 'mcq' ? `/${selectedExamDetails.questions?.length || ''}` : 'marks'}</td>
                        <td style="padding: 10px;">${r.score !== undefined ? `${r.score}%` : '-'}</td>
                        <td style="padding: 10px;">${r.grade || 'Completed'}</td>
                        <td style="padding: 10px;">${r.timeTakenSeconds ? `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s` : '-'}</td>
                        <td style="padding: 10px;">${r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '-'}</td>
                      </tr>
                    `).join('');

                    const totalEligible = allStudents.filter(s => selectedExamDetails.batchId === 'all' || s.graduationYear === selectedExamDetails.batchId).length;
                    const completedCount = examDetailedResults.length;
                    const notDoneCount = Math.max(0, totalEligible - completedCount);

                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>${selectedExamDetails.title} - Exam Results Report</title>
                          <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                            .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                            .title { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
                            .subtitle { font-size: 14px; color: #64748b; margin-bottom: 12px; }
                            .stats-grid { display: flex; gap: 20px; margin-bottom: 25px; }
                            .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; flex: 1; }
                            .stat-box .num { font-size: 20px; font-weight: bold; color: #0f172a; }
                            .stat-box .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; }
                            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                            th { background: #0f172a; color: #ffffff; padding: 10px; font-size: 12px; text-align: left; }
                            td { font-size: 13px; }
                            @media print {
                              button { display: none; }
                              body { padding: 0; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div class="title">Brilliant Academy — Exam Report</div>
                            <div class="subtitle">Exam: <strong>${selectedExamDetails.title}</strong> (${selectedExamDetails.examType?.toUpperCase() || 'MCQ'}) | Generated on: ${nowStr}</div>
                            <div class="stats-grid">
                              <div class="stat-box"><div class="num">${completedCount}</div><div class="lbl">Students Completed</div></div>
                              <div class="stat-box"><div class="num">${notDoneCount}</div><div class="lbl">Students Not Attempted</div></div>
                              <div class="stat-box"><div class="num">${totalEligible}</div><div class="lbl">Total Eligible Batch</div></div>
                            </div>
                          </div>
                          <h3>Student Rankings & Marks Table</h3>
                          <table>
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Student Name</th>
                                <th>Marks</th>
                                <th>Percentage</th>
                                <th>Grade</th>
                                <th>Time Taken</th>
                                <th>Submitted On</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${tableRows || '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #94a3b8;">No student submissions recorded yet.</td></tr>'}
                            </tbody>
                          </table>
                          <script>
                            window.onload = function() { window.print(); }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="font-bold flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Printer className="w-4 h-4" /> Print / Save as PDF
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setSelectedExamDetails(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Participation Metric Counters */}
              {(() => {
                const totalTargetStudents = allStudents.filter(s => selectedExamDetails.batchId === 'all' || s.graduationYear === selectedExamDetails.batchId).length;
                const completedCount = examDetailedResults.length;
                const notAttemptedCount = Math.max(0, totalTargetStudents - completedCount);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</p>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Students Completed</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-destructive/20 text-destructive">
                        <UserX className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-destructive">{notAttemptedCount}</p>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Did Not Take Exam</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/10 flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-primary">{totalTargetStudents}</p>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Eligible Students</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Exam Metadata Summary */}
              <div className="p-4 rounded-lg border border-border/50 bg-secondary/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Start Time:</span>
                  <span className="font-semibold text-foreground">
                    {selectedExamDetails.startTime ? new Date(selectedExamDetails.startTime).toLocaleString() : 'Anytime'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">End / Deadline:</span>
                  <span className="font-semibold text-foreground">
                    {selectedExamDetails.endTime ? new Date(selectedExamDetails.endTime).toLocaleString() : 'No Deadline'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Target Batch:</span>
                  <span className="font-semibold text-foreground">
                    {selectedExamDetails.batchId === 'all' ? 'All Batches' : batches.find(b => b.id === selectedExamDetails.batchId)?.year || selectedExamDetails.batchId}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Paper URL / PDF:</span>
                  {selectedExamDetails.questionPdfUrl ? (
                    <a href={selectedExamDetails.questionPdfUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold flex items-center gap-1">
                      View Paper <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">No PDF Attached</span>
                  )}
                </div>
              </div>

              {/* Student Results / Ranks Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" /> Student Rankings & Marks Breakdown
                  </h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    {examDetailedResults.length} Submissions
                  </span>
                </div>

                {loadingExamDetails ? (
                  <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                    Loading student results and ranking data...
                  </div>
                ) : examDetailedResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground italic border border-dashed border-secondary/40 rounded-lg">
                    No students have completed this exam yet.
                  </div>
                ) : (
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/30 text-muted-foreground font-semibold border-b border-border/40">
                        <tr>
                          <th className="p-3">Rank</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Marks</th>
                          <th className="p-3">Percentage</th>
                          <th className="p-3">Grade</th>
                          <th className="p-3">Time</th>
                          <th className="p-3">Answer PDF</th>
                          {selectedExamDetails.examType === 'essay' && (
                            <th className="p-3">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {examDetailedResults.map((res, index) => (
                          <React.Fragment key={res.id}>
                            <tr className="hover:bg-secondary/15 transition-colors">
                              <td className="p-3 font-bold text-foreground">
                                {index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`}
                              </td>
                              <td className="p-3 font-medium text-foreground">
                                {res.studentName || 'Anonymous Student'}
                              </td>
                              <td className="p-3 font-bold text-primary">
                                {res.rawScore ?? res.score ?? 0} {selectedExamDetails.examType === 'mcq' ? `/${selectedExamDetails.questions?.length || ''}` : 'marks'}
                              </td>
                              <td className="p-3 font-medium">
                                {res.score !== undefined ? `${res.score}%` : '-'}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-secondary/50 text-foreground font-semibold">
                                  {res.grade || (res.status === 'pending_grading' ? 'Pending' : 'Done')}
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground font-mono">
                                {res.timeTakenSeconds ? `${Math.floor(res.timeTakenSeconds / 60)}m ${res.timeTakenSeconds % 60}s` : '-'}
                              </td>
                              <td className="p-3">
                                {res.answerPdfUrl ? (
                                  <a 
                                    href={res.answerPdfUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                                  >
                                    View Sheet <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground italic text-[11px]">N/A (MCQ)</span>
                                )}
                              </td>
                              {selectedExamDetails.examType === 'essay' && (
                                <td className="p-3">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setGradingResultId(res.id);
                                      setGradingScore(res.rawScore?.toString() || res.score?.toString() || '');
                                      setGradingFeedback(res.feedback || '');
                                      setGradingPdfFile(null);
                                    }}
                                  >
                                    {res.status === 'graded' ? 'Edit Grade' : 'Grade Paper'}
                                  </Button>
                                </td>
                              )}
                            </tr>
                            {gradingResultId === res.id && (
                              <tr className="bg-secondary/20">
                                <td colSpan={8} className="p-4 border-t border-b border-border/40">
                                  <div className="space-y-3">
                                    <div className="flex gap-4">
                                      <div className="space-y-1">
                                        <label className="text-xs font-medium">Marks</label>
                                        <Input 
                                          type="number" 
                                          value={gradingScore} 
                                          onChange={(e) => setGradingScore(e.target.value)} 
                                          placeholder="e.g. 85"
                                          className="h-8 w-24"
                                        />
                                      </div>
                                      <div className="space-y-1 flex-1">
                                        <label className="text-xs font-medium">Remarks/Feedback</label>
                                        <Input 
                                          value={gradingFeedback} 
                                          onChange={(e) => setGradingFeedback(e.target.value)} 
                                          placeholder="Excellent work..."
                                          className="h-8"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-medium">Upload Corrected Paper (PDF)</label>
                                      <Input 
                                        type="file" 
                                        accept="application/pdf"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            setGradingPdfFile(e.target.files[0]);
                                          }
                                        }}
                                        className="text-xs"
                                      />
                                      {res.correctedPdfUrl && !gradingPdfFile && (
                                        <a href={res.correctedPdfUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                                          View Current Corrected PDF
                                        </a>
                                      )}
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                      <Button size="sm" variant="ghost" onClick={() => setGradingResultId(null)}>Cancel</Button>
                                      <Button size="sm" onClick={() => handleGradeSubmission(res.id)} disabled={isGradingSubmitting}>
                                        {isGradingSubmitting ? 'Saving...' : 'Save Grade'}
                                      </Button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border/50 bg-secondary/10 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedExamDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






