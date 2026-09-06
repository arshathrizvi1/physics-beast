"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, UserPlus, CreditCard, Activity, Video, FileText, FileQuestion, Upload, CheckCircle2, AlertCircle, Plus, Save, Edit, Edit2, Trash2, Eye, EyeOff, X, ExternalLink, Folder, FolderOpen, ChevronUp, ChevronDown, GraduationCap, BookOpen, UserCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, setDoc, writeBatch, orderBy, limit } from "firebase/firestore";

export default function AdminDashboard() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeUsers, setActiveUsers] = useState(0);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
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

  // Student Filters
  const [studentFilterBatch, setStudentFilterBatch] = useState("All");
  const [studentFilterStatus, setStudentFilterStatus] = useState("All");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<any>(null);
  const [activeAnalyticsList, setActiveAnalyticsList] = useState<{ title: string, students: any[] } | null>(null);

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

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");

  // Content Browser --- which folder is expanded in the Content tab
  const [contentBrowseCourseId, setContentBrowseCourseId] = useState<string | null>(null);
  const [contentBrowseFolderId, setContentBrowseFolderId] = useState<string | null>(null);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchYear, setNewBatchYear] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
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
        
        if (!data.isApproved) {
          pending.push({ id: doc.id, ...data });
        } else {
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
      setPublishedExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubBatches();
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

  const handleApproveStudent = async (studentId: string) => {
    try {
      await updateDoc(doc(db, 'users', studentId), { isApproved: true, pendingReason: null });
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (err) {
      console.log("Failed to approve student", err);
    }
  };

  const handleRejectStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, 'users', studentId));
      setPendingStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (err) {
      console.log("Failed to reject student", err);
    }
  };

  const filteredStudents = allStudents.filter(s => {
    const matchBatch = studentFilterBatch === "All" || s.graduationYear === studentFilterBatch;
    const matchStatus = studentFilterStatus === "All" || (studentFilterStatus === "Active" ? s.isApproved : !s.isApproved);
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
        batchId: selectedBatchId, 
        image: thumbnailUrl || null,
        teacherId: newCourseTeacherId || null,
        teacherName: assignedTeacher ? (assignedTeacher.name || assignedTeacher.email?.split('@')[0]) : null,
        teacherSubject: assignedTeacher?.subject || null,
        createdAt: Date.now() 
      });
      setNewCourseName("");
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
      const updateData: any = { name: editCourseName };
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
      console.error("Failed to rename course", e);
      alert("Failed to rename course.");
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
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoBatchId, setVideoBatchId] = useState("");
  const [videoCourseId, setVideoCourseId] = useState("");
  const [videoFolderId, setVideoFolderId] = useState("");
  
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [examSuccess, setExamSuccess] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examBatchId, setExamBatchId] = useState("");
  const [examCourseId, setExamCourseId] = useState("");
  const [examFolderId, setExamFolderId] = useState("");
  const [examTime, setExamTime] = useState("");
  const [examStartTime, setExamStartTime] = useState("");
  const [examEndTime, setExamEndTime] = useState("");
  const [examCategory, setExamCategory] = useState("Mechanics");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [publishedExams, setPublishedExams] = useState<any[]>([]);

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

  const handleRemoveTeamMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team? They will become a student.`)) return;
    try {
      await updateDoc(doc(db, 'users', memberId), { role: 'student', isApproved: false, pendingReason: 'Role removed' });
    } catch (err) {
      alert("Failed to remove team member.");
    }
  };

  const handleUploadItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = uploadItemType === "resource" && uploadFileBase64 ? uploadFileBase64 : videoUrl;
    
    if (!videoTitle || !finalUrl || !videoFolderId) {
      alert("Please provide a title, a folder, and either a URL or a file to upload.");
      return;
    }
    
    setIsUploading(true);
    setUploadSuccess(false);
    try {
      const ref = doc(collection(db, 'videos')); // we keep it in 'videos' collection for simplicity, just add type
      await setDoc(ref, {
        title: videoTitle,
        url: finalUrl,
        type: uploadItemType,
        batchId: videoBatchId,
        courseId: videoCourseId,
        folderId: videoFolderId,
        createdAt: Date.now()
      });
      setIsUploading(false);
      setUploadSuccess(true);
      setVideoTitle("");
      setVideoUrl("");
      setUploadFileBase64(null);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
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

  const handleEditExam = (exam: any) => {
    setEditingExamId(exam.id);
    setExamTitle(exam.title);
    setExamTime(exam.durationSeconds ? (exam.durationSeconds / 60).toString() : exam.duration.split(" ")[0]);
    setExamStartTime(exam.startTime || "");
    setExamEndTime(exam.endTime || "");
    setExamCategory(exam.category || "Mechanics");
    setQuestions(exam.questions.map((q: any) => ({
      id: q.id, 
      text: q.text,
      image: q.image,
      options: { A: q.options[0].text, B: q.options[1].text, C: q.options[2].text, D: q.options[3].text },
      correct: q.correct
    })));
    // scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveExam = async () => {
    setIsSavingExam(true);
    setExamSuccess(false);
    
    // Create new exam object
    const newExam = {
      title: examTitle || "Untitled Exam",
      category: examCategory,
      batchId: examBatchId,
      courseId: examCourseId,
      folderId: examFolderId,
      startTime: examStartTime ? new Date(examStartTime).getTime() : 0,
      endTime: examEndTime ? new Date(examEndTime).getTime() : 0,
      startTimeString: examStartTime,
      endTimeString: examEndTime,
      questions: questions.map((q, idx) => ({
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
      })),
      duration: `${examTime || 15} min`,
      durationSeconds: parseInt(examTime || "15") * 60,
      course: examCategory + " Mastery",
      updatedAt: Date.now()
    };

    try {
      if (editingExamId) {
        await updateDoc(doc(db, 'exams', editingExamId), newExam);
      } else {
        await setDoc(doc(collection(db, 'exams')), { ...newExam, hidden: false, createdAt: Date.now() });
      }
      
      // Reset form
      setExamTitle("");
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
            <CardDescription className="text-zinc-400">Restricted system access.</CardDescription>
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
                <Label htmlFor="admin-email" className="text-zinc-300">Admin Email</Label>
                <Input id="admin-email" type="email" placeholder="admin@physicsbeast.com" className="bg-zinc-900 border-zinc-800 text-white" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-zinc-300">Password</Label>
                <Input id="admin-password" type="password" className="bg-zinc-900 border-zinc-800 text-white" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
              <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-white">Firebase Console</a>.</li>
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
          <p className="text-muted-foreground mt-1">Physics Beast Administration Console</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/live">
            <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-600 gap-2 font-bold">
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

      <Tabs defaultValue="dashboard" className="w-full space-y-6">
        <TabsList className="flex overflow-x-auto w-full justify-start h-auto p-1 bg-secondary/20 rounded-lg whitespace-nowrap scrollbar-hide">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Live Dashboard</TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Students</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Payments</TabsTrigger>
          <TabsTrigger value="courses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Courses</TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Video Uploads</TabsTrigger>
          <TabsTrigger value="exams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Exam Engine</TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">👥 Team</TabsTrigger>
          )}
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
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprovePayment(p.id, p.studentId, p.folderId)}>
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
                    {teamMembers.map(tm => {
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                              <select
                                className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                                value={editCourseTeacherId !== "" ? editCourseTeacherId : (c.teacherId || "")}
                                onChange={e => setEditCourseTeacherId(e.target.value)}
                              >
                                <option value="">-- No Teacher Assigned --</option>
                                {teamMembers.map(tm => (
                                  <option key={tm.id} value={tm.id}>
                                    {tm.name || tm.email?.split('@')[0]} {tm.subject ? `(${tm.subject})` : ''}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => handleSaveCourse(c.id)} className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center gap-1">
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
                                {c.teacherName && (
                                  <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${selectedCourseId === c.id ? 'text-primary-foreground/90' : 'text-primary'}`}>
                                    <GraduationCap className="w-3 h-3" />
                                    <span>{c.teacherName}</span>
                                    {c.teacherSubject && <span className="opacity-75">({c.teacherSubject})</span>}
                                  </p>
                                )}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); setEditingCourseId(c.id); setEditCourseName(c.name); setEditCourseTeacherId(c.teacherId || ""); }} className={`p-1 hover:bg-secondary/50 rounded-md shrink-0 ${selectedCourseId === c.id ? 'text-primary-foreground/80' : 'text-primary'}`}>
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
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                          value={newCourseTeacherId}
                          onChange={e => setNewCourseTeacherId(e.target.value)}
                        >
                          <option value="">-- Assign Teacher (Optional) --</option>
                          {teamMembers.map(tm => (
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
                                <Button size="sm" onClick={() => handleSaveFolder(f.id)} className="h-7 bg-green-600 hover:bg-green-700 text-white">Save</Button>
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
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${req.pendingReason === 'New Device Login' ? 'bg-red-500/20 text-red-600' : 'bg-blue-500/20 text-blue-600'}`}>
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
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-white" onClick={() => handleRejectStudent(req.id)}>Reject</Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveStudent(req.id)}>Approve</Button>
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
                  <div className="space-y-2">
                    <Label>External Secure Stream URL (Mux/Vimeo/Cloudflare)</Label>
                    <div className="flex gap-2">
                      <Input placeholder="https://stream.mux.com/..." value={videoUrl || ""} onChange={e => setVideoUrl(e.target.value)} required={uploadItemType === 'video'} />
                      <Button type="button" onClick={handleUploadItem} variant="secondary" disabled={isUploading || !videoFolderId}>
                        {isUploading ? "Linking..." : "Link Video"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Recommended for high-speed DRM streaming.</p>
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
                            if (file.size > 1048576) {
                              alert("File size must be under 1MB due to Firebase Free Tier limits. Please compress your PDF/Image before uploading.");
                              e.target.value = '';
                              setUploadFileBase64(null);
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setUploadFileBase64(event.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        required={uploadItemType === 'resource'}
                      />
                      <Button type="button" onClick={handleUploadItem} className="w-full sm:w-auto shrink-0" disabled={isUploading || !videoFolderId || !uploadFileBase64}>
                        {isUploading ? "Uploading..." : "Upload Resource"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Files are converted and stored securely. Max limit 1MB.</p>
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
                              <Button size="sm" onClick={() => handleSaveVideo(v.id)} className="h-7 bg-green-600 hover:bg-green-700 text-white">Save</Button>
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
                                        <Button size="sm" onClick={() => handleSaveVideo(v.id)} className="h-7 bg-green-600 hover:bg-green-700 text-white">Save Changes</Button>
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
          
          {/* Create / Edit Exam Form */}
          <Card className="border-primary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-primary/20">
              <CardTitle className="text-2xl text-primary flex items-center gap-2">
                <FileQuestion className="w-6 h-6" /> {editingExamId ? "Edit Exam" : "Create New Exam"}
              </CardTitle>
              <CardDescription>Setup times, categories, marks, and add MCQ questions.</CardDescription>
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

              <div className="relative">
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
                            type="radio" 
                            name={`correctAnswer-${q.id}`} 
                            checked={q.correct === opt}
                            onChange={() => handleQuestionChange(q.id, 'correct', opt)}
                            className="w-5 h-5 accent-primary cursor-pointer" 
                            title={`Mark Option ${opt} as correct`} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4 border-t border-secondary/20">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary inline-block"></span> Select the radio button to set the correct answer.
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
          
          {/* List of published custom exams */}
          {publishedExams.length > 0 && (
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="bg-secondary/10 border-b border-border/50 pb-4">
                <CardTitle className="text-lg">Published Custom Exams</CardTitle>
                <CardDescription>Manage exams currently available to students.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publishedExams.map((exam) => (
                    <div key={exam.id} className={`border rounded-lg p-4 bg-background transition-opacity flex justify-between items-center ${exam.hidden ? 'opacity-50 border-dashed border-muted-foreground' : 'border-border/50'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-primary truncate max-w-[200px]">{exam.title}</h4>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{exam.category || 'General'}</span>
                          {exam.hidden && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Hidden</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{Array.isArray(exam.questions) ? exam.questions.length : exam.questions} Questions --- {exam.duration}</p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-primary/10 hover:text-primary" onClick={() => handleEditExam(exam)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-yellow-500/10 hover:text-yellow-500" onClick={() => handleToggleHide(exam.id)}>
                          {exam.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteExam(exam.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

              {/* Current Team Table */}
              <div>
                <h3 className="font-bold text-base mb-3">Current Team ({teamMembers.length})</h3>
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
                        {teamMembers.map((member) => {
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
                                      className="p-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
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
                                  <span className="text-green-500 text-xs font-bold">✅ 2FA Enabled</span>
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
                                    <Button
                                      size="sm" variant="outline"
                                      className="text-red-500 border-red-500/20 hover:bg-red-500/10 text-xs h-7"
                                      onClick={() => handleRemoveTeamMember(member.id, member.email)}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                                    </Button>
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 rounded-full hover:bg-destructive/20 hover:text-destructive"
                onClick={() => setSelectedStudentInfo(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl flex items-center gap-2">
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
                  <p className="font-medium text-base">{selectedStudentInfo.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="font-medium text-base">{selectedStudentInfo.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Student Phone</p>
                  <p className="font-medium text-base">{selectedStudentInfo.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Parent Phone</p>
                  <p className="font-medium text-base">{selectedStudentInfo.parentPhone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">NIC Number</p>
                  <p className="font-medium text-base">{selectedStudentInfo.nicNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Batch / Class ID</p>
                  <p className="font-medium text-base">{selectedStudentInfo.graduationYear || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Address</p>
                  <p className="font-medium text-base">{selectedStudentInfo.address || 'N/A'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-2">Account Status & Verification</h3>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedStudentInfo.isApproved ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}`}>
                      {selectedStudentInfo.isApproved ? 'Active (Approved)' : 'Pending Approval'}
                    </span>
                    {!selectedStudentInfo.isApproved && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
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
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedTeacherDetails.name?.charAt(0) || selectedTeacherDetails.email?.charAt(0).toUpperCase()}
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
                <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                  <p className="text-xs text-muted-foreground mb-1">Google Authenticator (2FA)</p>
                  <p className="font-bold">
                    {selectedTeacherDetails.totpSecret ? (
                      <span className="text-green-500">✅ Enabled</span>
                    ) : (
                      <span className="text-yellow-500">⚠ Not Set Up</span>
                    )}
                  </p>
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
    </div>
  );
}




