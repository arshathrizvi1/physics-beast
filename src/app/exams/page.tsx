"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { 
  Lock, 
  FileQuestion, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  FileText,
  Search,
  Filter,
  Layers,
  SlidersHorizontal,
  X,
  BookOpen,
  Check,
  RotateCcw
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";

type GroupByOption = 'folder' | 'date' | 'status' | 'course' | 'none';
type StatusFilterOption = 'all' | 'submitted' | 'unsubmitted' | 'closed' | 'upcoming';
type TypeFilterOption = 'all' | 'essay' | 'mcq';
type SortByOption = 'newest' | 'oldest' | 'title';

export default function ExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [myResults, setMyResults] = useState<Record<string, any>>({});
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Filter & Group states
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByOption>('folder');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilterOption>('all');
  const [sortBy, setSortBy] = useState<SortByOption>('newest');

  // Modals state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      const examsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((e: any) => !e.hidden && !e.deleted);
      setExams(examsList);
    });

    const unsubFolders = onSnapshot(collection(db, 'folders'), (snap) => {
      setFolders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchResults = async () => {
      try {
        const q = query(collection(db, 'examResults'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const resMap: Record<string, any> = {};
        snap.forEach(d => {
          resMap[d.data().examId] = d.data();
        });
        setMyResults(resMap);
      } catch (err) {
        console.log("Could not fetch exam results, quota exceeded?");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    return () => {
      unsubExams();
      unsubFolders();
    };
  }, [user]);

  const getFolderName = (fId: string) => {
    if (!fId || fId === 'unassigned') return 'General Exams';
    const f = folders.find(f => f.id === fId);
    return f ? f.name : 'General Exams';
  };

  // Helper to compute exam state
  const getExamState = (exam: any) => {
    const res = myResults[exam.id];
    const isCompleted = !!res;
    const hasStart = !!exam.startTime;
    const hasEnd = !!exam.endTime;
    const isUpcoming = hasStart && now < exam.startTime;
    const isEnded = hasEnd && now > exam.endTime;
    const isActive = (!hasStart || now >= exam.startTime) && (!hasEnd || now <= exam.endTime);
    const isUnsubmittedActive = isActive && !isCompleted;

    return { res, isCompleted, hasStart, hasEnd, isUpcoming, isEnded, isActive, isUnsubmittedActive };
  };

  // 1. ACTIVE EXAMS ALWAYS AT 1ST PLACE (Pinned top section)
  // Active exams: currently open and not yet completed by student
  const activeExams = useMemo(() => {
    return exams.filter(exam => {
      const { isUnsubmittedActive } = getExamState(exam);
      return isUnsubmittedActive;
    }).sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
  }, [exams, myResults, now]);

  // Active exam IDs to exclude them from the lower archive so they aren't duplicated
  const activeExamIds = useMemo(() => new Set(activeExams.map(e => e.id)), [activeExams]);

  // 2. OTHER EXAMS (Historical / Closed / Submitted / Upcoming) - Subject to Filter & Grouping
  const filteredOtherExams = useMemo(() => {
    return exams.filter(exam => {
      // Exclude pinned active exams so they remain 1st at the top without duplication
      if (activeExamIds.has(exam.id)) return false;

      const { isCompleted, isUpcoming, isEnded } = getExamState(exam);

      // Search filter
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const titleMatch = exam.title?.toLowerCase().includes(queryLower);
        const courseMatch = (exam.course || exam.category || '').toLowerCase().includes(queryLower);
        const folderMatch = getFolderName(exam.folderId).toLowerCase().includes(queryLower);
        if (!titleMatch && !courseMatch && !folderMatch) return false;
      }

      // Status filter
      if (statusFilter === 'submitted' && !isCompleted) return false;
      if (statusFilter === 'unsubmitted' && isCompleted) return false;
      if (statusFilter === 'closed' && (!isEnded || isCompleted)) return false;
      if (statusFilter === 'upcoming' && !isUpcoming) return false;

      // Type filter
      if (typeFilter !== 'all' && exam.examType !== typeFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'oldest') {
        return (a.createdAt || a.updatedAt || 0) - (b.createdAt || b.updatedAt || 0);
      }
      // default: newest
      return (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0);
    });
  }, [exams, activeExamIds, myResults, now, searchQuery, statusFilter, typeFilter, sortBy]);

  // 3. GROUPING LOGIC
  const groupedExams = useMemo(() => {
    const groups: { key: string; label: string; items: any[] }[] = [];
    const groupMap: Record<string, any[]> = {};

    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Exam Papers', items: filteredOtherExams }];
    }

    filteredOtherExams.forEach(exam => {
      let groupKey = 'other';
      let groupLabel = 'Other';

      if (groupBy === 'folder') {
        groupKey = exam.folderId || 'unassigned';
        groupLabel = getFolderName(groupKey);
      } else if (groupBy === 'status') {
        const { isCompleted, isUpcoming, isEnded } = getExamState(exam);
        if (isCompleted) {
          groupKey = 'submitted';
          groupLabel = 'Submitted & Completed';
        } else if (isEnded) {
          groupKey = 'closed';
          groupLabel = 'Closed / Ended';
        } else if (isUpcoming) {
          groupKey = 'upcoming';
          groupLabel = 'Upcoming';
        } else {
          groupKey = 'open';
          groupLabel = 'Open Exams';
        }
      } else if (groupBy === 'course') {
        groupKey = exam.course || exam.category || 'General';
        groupLabel = groupKey;
      } else if (groupBy === 'date') {
        const timestamp = exam.startTime || exam.createdAt || exam.updatedAt;
        if (timestamp) {
          const d = new Date(timestamp);
          groupKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          groupLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        } else {
          groupKey = 'undated';
          groupLabel = 'General / Undated';
        }
      }

      if (!groupMap[groupKey]) {
        groupMap[groupKey] = [];
        groups.push({ key: groupKey, label: groupLabel, items: groupMap[groupKey] });
      }
      groupMap[groupKey].push(exam);
    });

    return groups;
  }, [filteredOtherExams, groupBy, folders, myResults, now]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0) + (searchQuery !== "" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || groupBy !== 'folder';

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter('all');
    setTypeFilter('all');
    setGroupBy('folder');
    setSortBy('newest');
  };

  const getGroupLabelText = (opt: GroupByOption) => {
    switch (opt) {
      case 'folder': return 'Folder';
      case 'date': return 'Date / Month';
      case 'status': return 'Status';
      case 'course': return 'Course';
      case 'none': return 'No Grouping';
    }
  };

  const renderExamStatusBadge = (exam: any, isCompleted: boolean, isActive: boolean, isUpcoming: boolean, isEnded: boolean) => {
    if (isCompleted) {
      return (
        <span className="bg-green-500/10 text-green-500 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="bg-primary/15 text-primary text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 w-fit animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> Active Now
        </span>
      );
    }
    if (isUpcoming) {
      return (
        <span className="bg-secondary/30 text-muted-foreground text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 w-fit">
          <Clock className="w-3.5 h-3.5" /> Upcoming
        </span>
      );
    }
    if (isEnded) {
      return (
        <span className="bg-destructive/10 text-destructive text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 w-fit">
          <Calendar className="w-3.5 h-3.5" /> Ended
        </span>
      );
    }
    return null;
  };

  const renderExamActionBtn = (exam: any, isCompleted: boolean, isActive: boolean, isUpcoming: boolean, isEnded: boolean, isList: boolean = false) => {
    if (isCompleted) {
      return (
        <Link href={`/exam/${exam.id}/results`} className={buttonVariants({ size: isList ? "sm" : "default", variant: "outline", className: `border-primary/50 text-primary ${!isList && "w-full"}` })}>
          View Results
        </Link>
      );
    }
    if (isActive || (!exam.startTime && !exam.endTime)) {
      return (
        <Link href={`/exam/${exam.id}`} className={buttonVariants({ size: isList ? "sm" : "default", className: `${!isList ? "w-full" : ""} font-semibold shadow-md shadow-primary/20` })}>
          Start Exam
        </Link>
      );
    }
    if (isUpcoming) {
      return (
        <Button size={isList ? "sm" : "default"} disabled className={!isList ? "w-full" : ""}>Opens Soon</Button>
      );
    }
    if (isEnded) {
      return (
        <Button size={isList ? "sm" : "default"} disabled variant="secondary" className={!isList ? "w-full" : ""}>Exam Closed</Button>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Exams...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Authentication Required</h1>
        <p className="text-muted-foreground">
          You must be logged in as a student to access the practice exams.
        </p>
        <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Login to Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      
      {/* ⚡ ALWAYS FIRST: ACTIVE EXAMS SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-primary animate-ping" />
              Active Exams
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Exams currently open that require your action. Active exams are always displayed first.
            </p>
          </div>
          {activeExams.length > 0 && (
            <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full border border-primary/30">
              {activeExams.length} Active Now
            </span>
          )}
        </div>

        {activeExams.length === 0 ? (
          <Card className="border-border/60 bg-secondary/10">
            <CardContent className="p-6 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold">No Active Exams Required</h3>
              <p className="text-xs text-muted-foreground max-w-md">
                You have completed all active exams or there are currently no pending active exams requiring your action. Browse your submitted and past exams below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeExams.map((exam) => {
              const { isCompleted, isActive, isUpcoming, isEnded, hasStart, hasEnd } = getExamState(exam);

              return (
                <Card key={exam.id} className="flex flex-col border-2 border-primary/40 bg-card shadow-lg shadow-primary/5 hover:border-primary transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center text-primary">
                        <FileQuestion className="w-5 h-5" />
                      </div>
                      {renderExamStatusBadge(exam, isCompleted, isActive, isUpcoming, isEnded)}
                    </div>
                    <CardTitle className="text-lg font-bold mt-2 line-clamp-1">{exam.title}</CardTitle>
                    <CardDescription className="line-clamp-1">{exam.course || exam.category || 'General'}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3 text-sm">
                    <div className="flex justify-between items-center text-muted-foreground text-xs bg-secondary/20 p-2.5 rounded-lg border border-border/40">
                      <span className="font-medium text-foreground">
                        {exam.examType === 'essay' 
                          ? '📝 Essay Exam (PDF)' 
                          : `✅ ${Array.isArray(exam.questions) ? exam.questions.length : exam.questions} Questions`
                        }
                      </span>
                      <span className="flex items-center gap-1 font-bold text-primary">
                        <Clock className="w-3.5 h-3.5" /> {exam.duration || '15 min'}
                      </span>
                    </div>

                    {hasStart || hasEnd ? (
                      <div className="bg-secondary/15 p-2.5 rounded-lg text-xs space-y-1">
                        {hasStart && <div className="text-muted-foreground">Starts: <span className="font-medium text-foreground">{new Date(exam.startTime).toLocaleString()}</span></div>}
                        {hasEnd && <div className="text-muted-foreground">Ends: <span className="font-medium text-foreground">{new Date(exam.endTime).toLocaleString()}</span></div>}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">Always Open</div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2">
                    {renderExamActionBtn(exam, isCompleted, isActive, isUpcoming, isEnded, false)}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 📁 EXAM ARCHIVE & ORGANIZER */}
      <section className="space-y-6 pt-6 border-t border-border/50">
        
        {/* Header and Filter/Group Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Exam Library & Results
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Organize and search your past, submitted, and closed exams.
            </p>
          </div>

          {/* Action Buttons: Filter Button & Group By Button */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilterModal(true)}
              className="flex items-center gap-2 border-border/80 hover:border-primary/50 relative"
            >
              <Filter className="w-4 h-4 text-primary" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center ml-1">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Group By Button */}
            <Button
              variant="outline"
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 border-border/80 hover:border-primary/50"
            >
              <Layers className="w-4 h-4 text-primary" />
              <span>Group By: <strong className="text-foreground">{getGroupLabelText(groupBy)}</strong></span>
            </Button>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar & Active Filter Pills */}
        <div className="space-y-3">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search exam paper by title or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-card border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-semibold">Active:</span>
              {statusFilter !== 'all' && (
                <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 border border-primary/20">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')}><X className="w-3 h-3 ml-0.5" /></button>
                </span>
              )}
              {typeFilter !== 'all' && (
                <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 border border-primary/20">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter('all')}><X className="w-3 h-3 ml-0.5" /></button>
                </span>
              )}
              {groupBy !== 'folder' && (
                <span className="bg-secondary/40 text-foreground px-2.5 py-1 rounded-full flex items-center gap-1 border border-border/40">
                  Group: {getGroupLabelText(groupBy)}
                  <button onClick={() => setGroupBy('folder')}><X className="w-3 h-3 ml-0.5" /></button>
                </span>
              )}
              {sortBy !== 'newest' && (
                <span className="bg-secondary/40 text-foreground px-2.5 py-1 rounded-full flex items-center gap-1 border border-border/40">
                  Sort: {sortBy}
                  <button onClick={() => setSortBy('newest')}><X className="w-3 h-3 ml-0.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Grouped Exams List */}
        {filteredOtherExams.length === 0 ? (
          <Card className="border-border/50 bg-secondary/5">
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-muted-foreground text-sm">No exam papers match your current search or filter criteria.</p>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={resetFilters} className="text-xs">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedExams.map(group => (
              <div key={group.key} className="space-y-3">
                
                {/* Group Section Header */}
                {groupBy !== 'none' && (
                  <h3 className="text-base font-bold border-b border-border/40 pb-2 flex items-center gap-2 text-primary">
                    {groupBy === 'folder' && <FileText className="w-4 h-4 text-primary" />}
                    {groupBy === 'date' && <Calendar className="w-4 h-4 text-primary" />}
                    {groupBy === 'status' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {groupBy === 'course' && <BookOpen className="w-4 h-4 text-primary" />}
                    <span>{group.label}</span>
                    <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/30 ml-1">
                      {group.items.length} {group.items.length === 1 ? 'exam' : 'exams'}
                    </span>
                  </h3>
                )}

                {/* Exams List Container */}
                <div className="bg-card border border-border/50 rounded-lg overflow-hidden shadow-sm">
                  {/* Table Header for Desktop */}
                  <div className="hidden md:grid grid-cols-12 gap-4 p-3 bg-secondary/30 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-4">Exam Paper</div>
                    <div className="col-span-2">Date / Window</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Your Marks</div>
                    <div className="col-span-2 text-right">Action</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-border/30">
                    {group.items.map(exam => {
                      const { res, isCompleted, isActive, isUpcoming, isEnded, hasStart } = getExamState(exam);

                      return (
                        <div key={exam.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 items-center hover:bg-secondary/10 transition-colors">
                          
                          {/* Title & Info */}
                          <div className="col-span-4 flex flex-col">
                            <span className="font-bold text-foreground text-sm">{exam.title}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {exam.course || exam.category || 'General'} • {exam.examType === 'essay' ? '📝 Essay' : '✅ MCQ'} • {exam.duration || 'N/A'}
                            </span>
                          </div>

                          {/* Date / Time */}
                          <div className="col-span-2 flex flex-col text-xs text-muted-foreground">
                            {hasStart ? (
                              <span>{new Date(exam.startTime).toLocaleDateString()}</span>
                            ) : (
                              <span>Always Open</span>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="col-span-2">
                            {renderExamStatusBadge(exam, isCompleted, isActive, isUpcoming, isEnded)}
                          </div>

                          {/* Marks */}
                          <div className="col-span-2 font-bold text-primary text-sm">
                            {isCompleted ? (
                              (exam.examType === 'essay' && !exam.gradesPublished) || res?.status === 'pending_grading'
                                ? 'Pending Grade'
                                : `${res?.rawScore ?? res?.score ?? 0} Marks`
                            ) : (
                              <span className="text-xs text-muted-foreground font-normal">-</span>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="col-span-2 md:text-right">
                            {renderExamActionBtn(exam, isCompleted, isActive, isUpcoming, isEnded, true)}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* 🔍 FILTER MODAL */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Filter className="w-5 h-5 text-primary" /> Filter Exams
              </h3>
              <button onClick={() => setShowFilterModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Exam Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilterOption)}
                  className="w-full p-2.5 bg-background border border-input rounded-lg text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">✅ Submitted / Completed</option>
                  <option value="unsubmitted">⏳ Not Submitted</option>
                  <option value="closed">🔒 Closed / Ended</option>
                  <option value="upcoming">🕒 Upcoming</option>
                </select>
              </div>

              {/* Type Filter */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Exam Format / Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilterOption)}
                  className="w-full p-2.5 bg-background border border-input rounded-lg text-sm"
                >
                  <option value="all">All Types (Essay & MCQ)</option>
                  <option value="essay">📝 Essay Exam (PDF)</option>
                  <option value="mcq">✅ Multiple Choice (MCQ)</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortByOption)}
                  className="w-full p-2.5 bg-background border border-input rounded-lg text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Alphabetical (A - Z)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border/50">
              <Button size="sm" variant="ghost" onClick={resetFilters} className="text-xs text-muted-foreground">
                Reset All
              </Button>
              <Button size="sm" onClick={() => setShowFilterModal(false)}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 GROUP BY MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Layers className="w-5 h-5 text-primary" /> Group Exams By
              </h3>
              <button onClick={() => setShowGroupModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'folder', label: 'By Folder', desc: 'Group exams into their admin folders', icon: '📁' },
                { id: 'date', label: 'By Date / Month', desc: 'Group by creation date or month', icon: '📅' },
                { id: 'status', label: 'By Status', desc: 'Group by Submitted, Closed, or Upcoming', icon: '🏷️' },
                { id: 'course', label: 'By Course', desc: 'Group by course title or subject', icon: '📚' },
                { id: 'none', label: 'No Grouping (Flat List)', desc: 'Display all exams in a single list', icon: '📄' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setGroupBy(opt.id as GroupByOption);
                    setShowGroupModal(false);
                  }}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                    groupBy === opt.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/60 hover:bg-secondary/20 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <div className="font-semibold text-sm text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                  </div>
                  {groupBy === opt.id && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="secondary" onClick={() => setShowGroupModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
