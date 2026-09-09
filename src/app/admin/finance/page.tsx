"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, CreditCard, DollarSign, TrendingUp, Users, FileText, 
  CheckCircle2, Eye, X, ExternalLink, Download, Printer, Filter, 
  Calendar, User as UserIcon, GraduationCap, Building2, Check, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function FinanceReportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [payments, setPayments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Filter States
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "this_month" | "last_month" | "custom_month" | "custom_range">("all");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState<string>("");

  // Modal States
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [viewingReceipt, setViewingReceipt] = useState<{
    url: string;
    studentName: string;
    amount: number;
    folderName: string;
    date?: number;
  } | null>(null);

  // Authentication & Access Check (Allow Admin & Teacher)
  useEffect(() => {
    if (!loading && user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push("/");
    }
  }, [user, loading, router]);

  // If logged-in user is teacher, lock selected teacher to themselves
  useEffect(() => {
    if (user?.role === 'teacher') {
      setSelectedTeacherId(user.uid);
    }
  }, [user]);

  // Real-time Data Listeners
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) return;

    // 1. Fetch payments
    const qPayments = query(collection(db, 'payments'), orderBy("createdAt", "desc"));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch courses
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Fetch folders
    const unsubFolders = onSnapshot(collection(db, 'folders'), (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Fetch teachers
    const qTeachers = query(collection(db, 'users'), where("role", "==", "teacher"));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPayments();
      unsubCourses();
      unsubFolders();
      unsubTeachers();
    };
  }, [user]);

  // Resolve Teacher for each payment
  const enrichedPayments = useMemo(() => {
    return payments.map(p => {
      let teacherId = p.teacherId || null;
      let teacherName = p.teacherName || null;
      let courseName = p.courseName || null;

      // Match via courseId if missing
      if (!teacherId && p.courseId) {
        const foundCourse = courses.find(c => c.id === p.courseId);
        if (foundCourse) {
          teacherId = foundCourse.teacherId || null;
          teacherName = foundCourse.teacherName || null;
          if (!courseName) courseName = foundCourse.name;
        }
      }

      // Match via folderId if still missing
      if (!teacherId && p.folderId) {
        const foundFolder = folders.find(f => f.id === p.folderId);
        if (foundFolder?.courseId) {
          const foundCourse = courses.find(c => c.id === foundFolder.courseId);
          if (foundCourse) {
            teacherId = foundCourse.teacherId || null;
            teacherName = foundCourse.teacherName || null;
            if (!courseName) courseName = foundCourse.name;
          }
        }
      }

      // Lookup teacher info
      if (teacherId && !teacherName) {
        const t = teachers.find(teach => teach.id === teacherId);
        if (t) teacherName = t.name || t.email?.split('@')[0];
      }

      return {
        ...p,
        resolvedTeacherId: teacherId,
        resolvedTeacherName: teacherName || "General / Unassigned",
        resolvedCourseName: courseName || "Course"
      };
    });
  }, [payments, courses, folders, teachers]);

  // Compute all available distinct months for the month selector
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    enrichedPayments.forEach(p => {
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        if (!isNaN(d.getTime())) {
          monthsSet.add(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
        }
      }
    });
    return Array.from(monthsSet);
  }, [enrichedPayments]);

  // Filter payments by Teacher, Time Period, and Search Query
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const currentMonthKey = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = lastMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return enrichedPayments.filter(p => {
      // 1. Teacher Filter
      if (user?.role === 'teacher') {
        if (p.resolvedTeacherId !== user.uid) return false;
      } else if (selectedTeacherId !== "all") {
        if (p.resolvedTeacherId !== selectedTeacherId) return false;
      }

      // 2. Time Period Filter
      if (p.createdAt) {
        const pDate = new Date(p.createdAt);
        const pMonthKey = pDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        if (selectedPeriod === "this_month") {
          if (pMonthKey !== currentMonthKey) return false;
        } else if (selectedPeriod === "last_month") {
          if (pMonthKey !== lastMonthKey) return false;
        } else if (selectedPeriod === "custom_month") {
          if (selectedMonthKey && pMonthKey !== selectedMonthKey) return false;
        } else if (selectedPeriod === "custom_range") {
          if (customStartDate) {
            const startMs = new Date(customStartDate).setHours(0, 0, 0, 0);
            if (p.createdAt < startMs) return false;
          }
          if (customEndDate) {
            const endMs = new Date(customEndDate).setHours(23, 59, 59, 999);
            if (p.createdAt > endMs) return false;
          }
        }
      }

      // 3. Search query filter
      if (searchStudent.trim()) {
        const q = searchStudent.toLowerCase();
        const matchName = p.studentName?.toLowerCase().includes(q);
        const matchEmail = p.studentEmail?.toLowerCase().includes(q);
        const matchFolder = p.folderName?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchFolder) return false;
      }

      return true;
    });
  }, [enrichedPayments, selectedTeacherId, selectedPeriod, selectedMonthKey, customStartDate, customEndDate, searchStudent, user]);

  // Derived financial statistics
  const approvedPayments = filteredPayments.filter(p => p.status === 'approved');
  const pendingPayments = filteredPayments.filter(p => p.status === 'pending');
  const rejectedPayments = filteredPayments.filter(p => p.status === 'rejected');

  const totalIncome = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingIncome = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const uniquePayingStudents = new Set(approvedPayments.map(p => p.studentId)).size;

  // Selected teacher details for report header
  const activeTeacherDetails = useMemo(() => {
    if (user?.role === 'teacher') {
      return {
        id: user.uid,
        name: user.name || user.email?.split('@')[0],
        email: user.email,
        subject: (user as any).subject || "Educator"
      };
    }
    if (selectedTeacherId !== "all") {
      const found = teachers.find(t => t.id === selectedTeacherId);
      if (found) {
        return {
          id: found.id,
          name: found.name || found.email?.split('@')[0],
          email: found.email,
          subject: found.subject || "Educator"
        };
      }
    }
    return null;
  }, [user, selectedTeacherId, teachers]);

  // Formatted period label for report
  const periodLabel = useMemo(() => {
    if (selectedPeriod === "this_month") {
      return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (selectedPeriod === "last_month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (selectedPeriod === "custom_month") {
      return selectedMonthKey || "Selected Month";
    }
    if (selectedPeriod === "custom_range") {
      return `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
    }
    return "All Time (Complete History)";
  }, [selectedPeriod, selectedMonthKey, customStartDate, customEndDate]);

  // Stable document reference ID
  const statementRef = useMemo(() => "BA-FIN-" + Math.floor(100000 + Math.random() * 900000), []);

  const handlePrintStatement = () => {
    window.print();
  };

  // Reusable official printable statement form
  const renderStatementDocument = () => (
    <div id="printable-statement" className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-foreground print:p-0 print:m-0 print:overflow-visible print:text-black print:w-full print:bg-white">
      
      {/* Document Header with Logo */}
      <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-primary pb-4 gap-4 print:border-black">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#d4af37]/40 shrink-0 print:border-gray-400">
            <img src="/logo.jpg" alt="Brilliant Academy" className="object-cover w-full h-full" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-primary uppercase print:text-black">
              BRILLIANT ACADEMY
            </h2>
            <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground print:text-gray-700">
              LMS Education & Learning Platform • Financial Division
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 print:text-gray-600">
              Official Revenue Statement & Payment Reconciliation Form
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right text-xs space-y-1">
          <p className="font-bold text-foreground print:text-black">
            REF: <span className="font-mono text-primary print:text-black">{statementRef}</span>
          </p>
          <p className="text-muted-foreground print:text-gray-600">
            Issued: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-green-600 font-bold uppercase tracking-wider text-[11px] print:text-black">
            Status: Verified & Audited
          </p>
        </div>
      </div>

      {/* Teacher & Period Details Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/10 border border-secondary/30 rounded-xl p-4 text-xs print:border-gray-300 print:bg-gray-50 print:p-3.5 print-avoid-break">
        <div className="space-y-1">
          <p className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] print:text-gray-600">Teacher / Beneficiary</p>
          <p className="text-base font-black text-foreground print:text-black">
            {activeTeacherDetails ? activeTeacherDetails.name : "All Teachers (Consolidated Overall)"}
          </p>
          <p className="text-muted-foreground print:text-gray-600">
            {activeTeacherDetails?.subject ? `Specialization: ${activeTeacherDetails.subject}` : "Institution Faculty Overview"}
          </p>
          {activeTeacherDetails?.email && (
            <p className="text-muted-foreground print:text-gray-600">Email: {activeTeacherDetails.email}</p>
          )}
        </div>

        <div className="space-y-1 sm:text-right">
          <p className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] print:text-gray-600">Statement Period</p>
          <p className="text-base font-black text-primary print:text-black">
            {periodLabel}
          </p>
          <p className="text-muted-foreground print:text-gray-600">
            Generated by: {user?.name || user?.email || "Admin"} ({user?.role?.toUpperCase() || "ADMIN"})
          </p>
          <p className="text-muted-foreground print:text-gray-600">
            Total Transactions: {approvedPayments.length} Cleared
          </p>
        </div>
      </div>

      {/* KPI Summary Block */}
      <div className="grid grid-cols-3 gap-3 border border-border/50 rounded-xl p-3 text-center print:border-gray-300 print:bg-white print:p-2.5 print-avoid-break">
        <div className="border-r border-border/50 pr-2 print:border-gray-300">
          <p className="text-[10px] uppercase font-bold text-muted-foreground print:text-gray-600">Total Net Revenue</p>
          <p className="text-xl sm:text-2xl font-black text-green-600 print:text-black">Rs. {totalIncome.toLocaleString()}</p>
        </div>
        <div className="border-r border-border/50 pr-2 print:border-gray-300">
          <p className="text-[10px] uppercase font-bold text-muted-foreground print:text-gray-600">Cleared Payments</p>
          <p className="text-xl sm:text-2xl font-black text-foreground print:text-black">{approvedPayments.length}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground print:text-gray-600">Paying Students</p>
          <p className="text-xl sm:text-2xl font-black text-primary print:text-black">{uniquePayingStudents}</p>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="space-y-2 print:overflow-visible">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black font-semibold">
          Itemized Cleared Transactions ({approvedPayments.length})
        </h4>
        <div className="border border-border/60 rounded-lg overflow-hidden print:border-gray-300 print:overflow-visible">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/20 uppercase text-[10px] border-b border-border/50 print:bg-gray-100 print:text-black font-bold">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Student</th>
                <th className="p-2.5">Course / Folder</th>
                <th className="p-2.5">Instructor</th>
                <th className="p-2.5">Method</th>
                <th className="p-2.5 text-right">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 print:divide-gray-200">
              {approvedPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center italic text-muted-foreground print:text-gray-500">
                    No cleared transactions for this period.
                  </td>
                </tr>
              ) : (
                approvedPayments.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-secondary/5 print:hover:bg-transparent print-avoid-break">
                    <td className="p-2.5 whitespace-nowrap">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-2.5">
                      <span className="font-bold">{p.studentName}</span>
                      <span className="block text-[10px] text-muted-foreground print:text-gray-500">{p.studentEmail}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-semibold">{p.folderName}</span>
                      <span className="block text-[10px] text-muted-foreground print:text-gray-500">{p.resolvedCourseName}</span>
                    </td>
                    <td className="p-2.5 text-muted-foreground print:text-gray-700">
                      {p.resolvedTeacherName}
                    </td>
                    <td className="p-2.5 uppercase font-mono text-[10px]">
                      {p.method || 'manual'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-green-600 print:text-black">
                      Rs. {Number(p.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-secondary/10 font-bold border-t-2 border-border/80 print:bg-gray-100 print:border-gray-400">
              <tr>
                <td colSpan={5} className="p-2.5 text-right uppercase text-[11px] print:text-black">Total Cleared Revenue:</td>
                <td className="p-2.5 text-right text-green-600 font-black text-sm print:text-black">
                  Rs. {totalIncome.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Signatures & Certification Footer */}
      <div className="pt-6 border-t border-secondary/40 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs print:border-gray-300 print:pt-4 print-avoid-break">
        <div className="space-y-8">
          <p className="text-[10px] uppercase font-bold text-muted-foreground print:text-gray-700">Authorized Signatory</p>
          <div className="border-t border-dashed border-border/80 pt-1 text-muted-foreground font-mono text-[11px] print:text-black print:border-gray-400">
            Brilliant Academy Finance
          </div>
        </div>

        <div className="space-y-8">
          <p className="text-[10px] uppercase font-bold text-muted-foreground print:text-gray-700">Instructor Acknowledgment</p>
          <div className="border-t border-dashed border-border/80 pt-1 text-muted-foreground font-mono text-[11px] print:text-black print:border-gray-400">
            {activeTeacherDetails ? activeTeacherDetails.name : "Faculty Representative"}
          </div>
        </div>

        <div className="space-y-8 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground print:text-gray-700">Security Verification</p>
          <div className="border-t border-dashed border-border/80 pt-1 text-muted-foreground text-[10px] print:text-black print:border-gray-400">
            Digitally Verified Record
          </div>
        </div>
      </div>

      {/* Bottom micro notice */}
      <div className="pt-2 text-center text-[9px] text-muted-foreground print:text-gray-500">
        This is a computer-generated official financial statement from Brilliant Academy LMS. No physical signature is required.
      </div>

    </div>
  );

  if (loading || (!user || (user.role !== 'admin' && user.role !== 'teacher'))) {
    return <div className="p-12 text-center animate-pulse text-primary font-bold">Loading secure financial data...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 print:bg-white print:p-0 print:min-h-0">
      
      {/* SCREEN DASHBOARD VIEW: Completely hidden when printing */}
      <div className="max-w-6xl mx-auto space-y-6 print:hidden">
        
        {/* Header - Screen only */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-secondary/50 pb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary flex items-center gap-2">
                <TrendingUp className="w-7 h-7" /> 
                {user.role === 'teacher' ? "My Revenue & Financials" : "Financial Overview"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {user.role === 'teacher' 
                  ? `Revenue tracking for ${user.name || user.email}` 
                  : "Comprehensive institution income, teacher revenue, and payment statements."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowStatementModal(true)}
              className="bg-primary text-black font-bold hover:bg-primary/90 flex items-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" /> Download / Print Statement (PDF)
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar - Screen only */}
        <Card className="border-secondary/40 bg-secondary/5 shadow-sm print:hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-secondary/20 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Filter className="w-4 h-4 text-primary" /> Filter Revenue & Payments
              </div>
              {(selectedTeacherId !== (user.role === 'teacher' ? user.uid : "all") || selectedPeriod !== "all" || searchStudent) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (user.role !== 'teacher') setSelectedTeacherId("all");
                    setSelectedPeriod("all");
                    setSelectedMonthKey("");
                    setCustomStartDate("");
                    setCustomEndDate("");
                    setSearchStudent("");
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Reset Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Teacher Selector (Only Admin can switch teachers) */}
              {user.role === 'admin' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-primary" /> Select Teacher
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                  >
                    <option value="all">All Teachers (Institution Overall)</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.email?.split('@')[0]} {t.subject ? `(${t.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-primary" /> Account Teacher
                  </label>
                  <div className="h-9 px-3 rounded-md bg-secondary/20 border border-border/40 text-xs font-bold text-primary flex items-center">
                    {user.name || user.email} ({user.role})
                  </div>
                </div>
              )}

              {/* Time Period Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Time Period
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedPeriod}
                  onChange={(e: any) => setSelectedPeriod(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="this_month">This Month ({new Date().toLocaleString('default', { month: 'short' })})</option>
                  <option value="last_month">Last Month</option>
                  <option value="custom_month">Specific Month...</option>
                  <option value="custom_range">Custom Date Range...</option>
                </select>
              </div>

              {/* Specific Month Picker */}
              {selectedPeriod === "custom_month" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Select Month</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                  >
                    <option value="">-- Choose Month --</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Date Range Picker */}
              {selectedPeriod === "custom_range" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">From Date</label>
                    <Input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)} 
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">To Date</label>
                    <Input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)} 
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              )}

              {/* Student Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Search Student / Folder</label>
                <Input 
                  placeholder="Name, email, or folder..." 
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Active Filter Pill Display */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span>Showing:</span>
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                {activeTeacherDetails ? activeTeacherDetails.name : "All Teachers"}
              </span>
              <span className="bg-secondary/40 text-foreground px-2.5 py-0.5 rounded-full font-medium">
                {periodLabel}
              </span>
              <span className="text-muted-foreground italic">
                ({filteredPayments.length} total payments found)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
          <Card className="border-green-500/30 bg-green-500/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase text-green-600">Total Cleared Revenue</CardDescription>
              <CardTitle className="text-3xl font-black text-green-500">Rs. {totalIncome.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">From {approvedPayments.length} cleared payments in this period</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase text-yellow-600">Pending Verification</CardDescription>
              <CardTitle className="text-3xl font-black text-yellow-500">Rs. {pendingIncome.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">From {pendingPayments.length} unapproved receipts</p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase text-primary">Unique Paying Students</CardDescription>
              <CardTitle className="text-3xl font-black text-primary">
                {uniquePayingStudents}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Distinct students enrolled in this period</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Income Breakdown (When All Time is selected) */}
        {selectedPeriod === "all" && (
          <Card className="border-secondary/50 shadow-md print:hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/20 py-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Monthly Revenue Breakdown
              </CardTitle>
              <CardDescription>Cleared revenue grouped by month for {activeTeacherDetails ? activeTeacherDetails.name : "all instructors"}.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              {(() => {
                const monthlyIncome = approvedPayments.reduce((acc, pay: any) => {
                  const d = new Date(pay.createdAt);
                  if (isNaN(d.getTime())) return acc;
                  const monthKey = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                  if (!acc[monthKey]) acc[monthKey] = 0;
                  acc[monthKey] += Number((pay as any).amount || 0);
                  return acc;
                }, {} as Record<string, number>);

                const sortedMonthlyIncome = Object.entries(monthlyIncome).sort((a, b) => {
                  return new Date(b[0]).getTime() - new Date(a[0]).getTime();
                });

                if (sortedMonthlyIncome.length === 0) {
                  return <p className="text-muted-foreground italic text-center text-sm py-4">No cleared revenue for this selection.</p>;
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {sortedMonthlyIncome.map(([month, amount]: [string, any]) => (
                      <div key={month} className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{month}</p>
                        <p className="text-lg font-black text-green-600">Rs. {Number(amount).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Transaction History Table */}
        <Card className="border-secondary/50 shadow-md">
          <CardHeader className="bg-primary/5 border-b border-primary/20 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" /> Transaction Ledger
              </CardTitle>
              <CardDescription>
                {filteredPayments.length} payment records for {activeTeacherDetails ? activeTeacherDetails.name : "all teachers"} ({periodLabel}).
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowStatementModal(true)}
              className="text-xs font-bold gap-1.5 print:hidden"
            >
              <Printer className="w-3.5 h-3.5" /> Print Statement Form
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">
                No transactions match your current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/20 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-3 rounded-tl-lg">Date</th>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Course & Folder</th>
                      <th className="px-5 py-3">Teacher</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3 print:hidden">Receipt</th>
                      <th className="px-5 py-3 rounded-tr-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/20">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/5 transition-colors">
                        <td className="px-5 py-3 text-xs whitespace-nowrap">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                          <span className="block text-[10px] text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-bold text-xs sm:text-sm">{p.studentName || "Student"}</div>
                          <div className="text-[11px] text-muted-foreground">{p.studentEmail}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-xs">{p.folderName || "Folder"}</div>
                          <div className="text-[10px] text-muted-foreground">{p.resolvedCourseName}</div>
                        </td>
                        <td className="px-5 py-3 text-xs font-medium text-foreground">
                          {p.resolvedTeacherName}
                        </td>
                        <td className="px-5 py-3 font-bold text-green-600 whitespace-nowrap">
                          Rs. {Number(p.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 uppercase text-[11px] font-mono">
                          {p.method || 'cash'}
                        </td>
                        <td className="px-5 py-3 print:hidden">
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
                              className="text-primary hover:bg-primary/10 border-primary/40 flex items-center gap-1 h-7 text-xs font-semibold"
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            p.status === 'approved' ? 'bg-green-500/20 text-green-500' : 
                            p.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL REVENUE STATEMENT MODAL & PRINT FORM */}
      {/* ========================================================================= */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block print:overflow-visible print:w-full">
          <div className="bg-background border border-border/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:p-0 print:m-0 print:overflow-visible">
            
            {/* Modal Actions Bar - Hidden in print */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/10 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Official Payment & Revenue Statement Form</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handlePrintStatement} 
                  className="bg-primary text-black font-bold hover:bg-primary/90 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowStatementModal(false)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Printable Statement Document */}
            {renderStatementDocument()}

            {/* Modal Footer Bar - Screen only */}
            <div className="p-4 border-t border-border/50 bg-secondary/10 flex justify-between items-center print:hidden">
              <p className="text-xs text-muted-foreground">
                Tip: In the print dialog, select <strong className="text-foreground">"Save as PDF"</strong> to download a clean digital document.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowStatementModal(false)}
                >
                  Close
                </Button>
                <Button 
                  size="sm" 
                  onClick={handlePrintStatement} 
                  className="bg-primary text-black font-bold hover:bg-primary/90 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download PDF / Print
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Direct print fallback (e.g. Ctrl+P) when modal is not already opened */}
      {!showStatementModal && (
        <div className="hidden print:block print:w-full print:bg-white print:p-0 print:m-0">
          {renderStatementDocument()}
        </div>
      )}

      {/* RECEIPT POPUP MODAL */}
      {viewingReceipt && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden"
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
                  {viewingReceipt.folderName} • <span className="text-green-500 font-bold">Rs. {viewingReceipt.amount}</span>
                  {viewingReceipt.date ? ` • ${new Date(viewingReceipt.date).toLocaleString()}` : ''}
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
    </div>
  );
}
