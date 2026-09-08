"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import {
  Search, X, BookOpen, PlayCircle, FileQuestion, GraduationCap,
  User, Award, Calendar, Clock, ExternalLink, ArrowRight, ArrowLeft, Compass,
  Sparkles, CheckCircle2, ShieldCheck, Mail, Phone, Hash, Maximize2, Minimize2
} from "lucide-react";

interface SearchResultItem {
  id: string;
  category: "course" | "video" | "exam" | "teacher" | "student" | "mark" | "page";
  title: string;
  subtitle?: string;
  description?: string;
  badges?: { label: string; color: "gold" | "blue" | "green" | "purple" | "amber" | "gray" }[];
  date?: string;
  time?: string;
  score?: string;
  link: string;
  extraInfo?: Record<string, any>;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATIC_PAGES: SearchResultItem[] = [
  {
    id: "page-courses",
    category: "page",
    title: "All Courses",
    subtitle: "Browse physics and science learning paths",
    link: "/courses",
    badges: [{ label: "Page", color: "blue" }]
  },
  {
    id: "page-exams",
    category: "page",
    title: "Exam Center",
    subtitle: "Take online MCQ and Essay tests",
    link: "/exams",
    badges: [{ label: "Page", color: "purple" }]
  },
  {
    id: "page-leaderboard",
    category: "page",
    title: "Leaderboard & Ranks",
    subtitle: "Check student rankings, streaks and XP",
    link: "/leaderboard",
    badges: [{ label: "Page", color: "gold" }]
  },
  {
    id: "page-live",
    category: "page",
    title: "Live Classroom",
    subtitle: "Join interactive real-time lectures",
    link: "/live",
    badges: [{ label: "Page", color: "green" }]
  },
  {
    id: "page-about",
    category: "page",
    title: "About & Contact Us",
    subtitle: "Academy mission, faculty details, and support form",
    link: "/about",
    badges: [{ label: "Page", color: "gray" }]
  }
];

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Raw fetched items
  const [courses, setCourses] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const canAccessStudentData = isAdmin || isTeacher;

  // Load database entities when modal opens for the first time
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedIndex(0);
      return;
    }

    // Auto-focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    if (hasLoadedData) return;

    const fetchAllSearchData = async () => {
      setIsLoading(true);
      try {
        const promises: Promise<any>[] = [
          getDocs(collection(db, "courses")).catch(() => ({ docs: [] })),
          getDocs(collection(db, "exams")).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, "videos"), limit(100))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, "users"), where("role", "==", "teacher"))).catch(() => ({ docs: [] })),
        ];

        // Fetch students & marks if Admin or Teacher
        if (canAccessStudentData) {
          promises.push(
            getDocs(query(collection(db, "users"), where("role", "==", "student"), limit(200))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, "examResults"), limit(200))).catch(() => ({ docs: [] }))
          );
        } else if (user?.uid) {
          // Normal student only gets their own exam results
          promises.push(
            Promise.resolve({ docs: [] }), // placeholder for students
            getDocs(query(collection(db, "examResults"), where("userId", "==", user.uid))).catch(() => ({ docs: [] }))
          );
        }

        const [coursesSnap, examsSnap, videosSnap, teachersSnap, studentsSnap, marksSnap] = await Promise.all(promises);

        setCourses(coursesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        setExams(examsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        setVideos(videosSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        setTeachers(teachersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

        if (studentsSnap?.docs) {
          setStudents(studentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }
        if (marksSnap?.docs) {
          setMarks(marksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }

        setHasLoadedData(true);
      } catch (err) {
        console.error("Global search data load failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllSearchData();
  }, [isOpen, hasLoadedData, canAccessStudentData, user?.uid]);

  // Transform raw data into structured SearchResultItems
  const allFormattedItems = useMemo(() => {
    const items: SearchResultItem[] = [];

    // Static pages
    items.push(...STATIC_PAGES);

    // Courses
    courses.forEach((c) => {
      items.push({
        id: `course-${c.id}`,
        category: "course",
        title: c.name || c.title || "Untitled Course",
        subtitle: c.teacherName ? `Instructor: ${c.teacherName}` : "Course",
        description: c.description,
        badges: [
          { label: "Course", color: "gold" },
          ...(c.teacherSubject ? [{ label: c.teacherSubject, color: "gray" as const }] : [])
        ],
        link: `/course/${c.id}`
      });
    });

    // Videos
    videos.forEach((v) => {
      items.push({
        id: `video-${v.id}`,
        category: "video",
        title: v.title || "Untitled Video",
        subtitle: v.courseName ? `Course: ${v.courseName}` : "Lecture Video",
        description: v.description,
        badges: [{ label: "Video Lesson", color: "blue" }],
        link: v.courseId ? `/course/${v.courseId}` : `/courses`
      });
    });

    // Exams
    exams.forEach((e) => {
      const typeLabel = e.examType === "essay" ? "Essay Exam" : "MCQ Exam";
      const badges: SearchResultItem["badges"] = [
        { label: typeLabel, color: e.examType === "essay" ? "amber" : "purple" }
      ];
      if (e.category) badges.push({ label: e.category, color: "gray" });
      if (e.duration) badges.push({ label: e.duration, color: "gold" });

      items.push({
        id: `exam-${e.id}`,
        category: "exam",
        title: e.title || "Untitled Exam",
        subtitle: e.category ? `${e.category} • Duration: ${e.duration || "N/A"}` : "Online Test",
        description: e.course ? `Course: ${e.course}` : undefined,
        date: e.startTimeString || (e.startTime ? new Date(e.startTime).toLocaleDateString() : undefined),
        time: e.endTimeString ? `Until ${e.endTimeString}` : undefined,
        badges,
        link: `/exam/${e.id}`
      });
    });

    // Teachers
    teachers.forEach((t) => {
      items.push({
        id: `teacher-${t.id}`,
        category: "teacher",
        title: t.name || t.email?.split("@")[0] || "Faculty Member",
        subtitle: t.subject ? `Faculty: ${t.subject}` : "Instructor",
        description: t.email,
        badges: [
          { label: "Teacher", color: "green" },
          ...(t.subject ? [{ label: t.subject, color: "gold" as const }] : [])
        ],
        link: `/courses?teacher=${t.id}`
      });
    });

    // Students (Only for Admin / Teacher)
    if (canAccessStudentData) {
      students.forEach((s) => {
        const badges: SearchResultItem["badges"] = [{ label: "Student", color: "blue" }];
        if (s.studentId) badges.push({ label: s.studentId, color: "gold" });
        if (s.graduationYear) badges.push({ label: `Batch ${s.graduationYear}`, color: "gray" });
        if (s.xpLevel) badges.push({ label: `Lvl ${s.xpLevel}`, color: "purple" });

        items.push({
          id: `student-${s.id}`,
          category: "student",
          title: s.name || s.email?.split("@")[0] || "Student",
          subtitle: `${s.studentId ? `ID: ${s.studentId} • ` : ""}${s.email}`,
          description: s.phoneNumber ? `Phone: ${s.phoneNumber}` : undefined,
          badges,
          link: `/admin?studentId=${s.id}#students`,
          extraInfo: s
        });
      });
    }

    // Marks / Exam Results
    marks.forEach((m) => {
      const scoreStr = m.percentage !== undefined ? `${Math.round(m.percentage)}%` : `${m.score || 0} pts`;
      const badges: SearchResultItem["badges"] = [
        { label: `Score: ${scoreStr}`, color: "green" }
      ];
      if (m.examTitle) badges.push({ label: "Exam Result", color: "purple" });

      items.push({
        id: `mark-${m.id}`,
        category: "mark",
        title: canAccessStudentData && m.studentName
          ? `${m.studentName} — ${m.examTitle || "Exam"}`
          : `${m.examTitle || "Exam Result"}`,
        subtitle: `Scored: ${scoreStr} ${m.totalQuestions ? `(${m.score}/${m.totalQuestions})` : ""}`,
        date: m.submittedAt ? new Date(m.submittedAt).toLocaleDateString() : undefined,
        score: scoreStr,
        badges,
        link: canAccessStudentData ? `/admin#exams` : `/exam/${m.examId}/results`
      });
    });

    return items;
  }, [courses, videos, exams, teachers, students, marks, canAccessStudentData]);

  // Filter items according to search input and selected category
  const filteredResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return allFormattedItems.filter((item) => {
      // Category filter
      if (activeCategory !== "all") {
        if (activeCategory === "courses" && item.category !== "course") return false;
        if (activeCategory === "videos" && item.category !== "video") return false;
        if (activeCategory === "exams" && item.category !== "exam") return false;
        if (activeCategory === "teachers" && item.category !== "teacher") return false;
        if (activeCategory === "students" && item.category !== "student") return false;
        if (activeCategory === "marks" && item.category !== "mark") return false;
      }

      if (!q) {
        // When query is empty, show navigation pages and featured courses/exams
        return item.category === "page" || item.category === "course" || item.category === "exam";
      }

      // Match query in title, subtitle, description, date, or badges
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchDate = item.date?.toLowerCase().includes(q);
      const matchTime = item.time?.toLowerCase().includes(q);
      const matchBadge = item.badges?.some((b) => b.label.toLowerCase().includes(q));

      // Extra student info search (studentId, phone, email)
      const matchStudentId = item.extraInfo?.studentId?.toLowerCase().includes(q);
      const matchPhone = item.extraInfo?.phoneNumber?.toLowerCase().includes(q);
      const matchEmail = item.extraInfo?.email?.toLowerCase().includes(q);

      return (
        matchTitle ||
        matchSubtitle ||
        matchDesc ||
        matchDate ||
        matchTime ||
        matchBadge ||
        matchStudentId ||
        matchPhone ||
        matchEmail
      );
    });
  }, [allFormattedItems, searchTerm, activeCategory]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, activeCategory]);

  // Keyboard navigation inside search list
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onClose]);

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    router.push(item.link);
  };

  if (!isOpen) return null;

  const categoryCounts = {
    all: allFormattedItems.length,
    courses: allFormattedItems.filter((i) => i.category === "course").length,
    videos: allFormattedItems.filter((i) => i.category === "video").length,
    exams: allFormattedItems.filter((i) => i.category === "exam").length,
    teachers: allFormattedItems.filter((i) => i.category === "teacher").length,
    students: canAccessStudentData ? allFormattedItems.filter((i) => i.category === "student").length : 0,
    marks: allFormattedItems.filter((i) => i.category === "mark").length
  };

  const getCategoryIcon = (cat: SearchResultItem["category"]) => {
    switch (cat) {
      case "course":
        return <BookOpen className="w-4 h-4 text-[#d4af37]" />;
      case "video":
        return <PlayCircle className="w-4 h-4 text-blue-400" />;
      case "exam":
        return <FileQuestion className="w-4 h-4 text-purple-400" />;
      case "teacher":
        return <GraduationCap className="w-4 h-4 text-emerald-400" />;
      case "student":
        return <User className="w-4 h-4 text-amber-400" />;
      case "mark":
        return <Award className="w-4 h-4 text-green-400" />;
      case "page":
      default:
        return <Compass className="w-4 h-4 text-zinc-400" />;
    }
  };

  const renderBadge = (badge: { label: string; color: string }, index: number) => {
    const colorClasses = {
      gold: "bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30",
      blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      gray: "bg-white/5 text-zinc-400 border-white/10"
    }[badge.color] || "bg-white/5 text-zinc-400 border-white/10";

    return (
      <span
        key={index}
        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${colorClasses}`}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] w-full h-full bg-[#080808]/98 backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Gold Accent Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shrink-0" />

      {/* Search Header Input Bar */}
      <div className="border-b border-white/10 bg-zinc-950/90 shrink-0">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-4 sm:py-5 flex items-center gap-3 sm:gap-4">
          {/* Back/Close button */}
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 active:scale-95 transition-transform shrink-0"
            title="Close Search"
          >
            <ArrowLeft className="w-5 h-5 text-[#d4af37]" />
          </button>

          <Search className="w-6 h-6 text-[#d4af37] shrink-0 hidden sm:block" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              canAccessStudentData
                ? "Search courses, exams, videos, teachers, student IDs, marks..."
                : "Search courses, exams, lessons, teachers, your marks..."
            }
            className="flex-1 bg-transparent text-white placeholder:text-zinc-500 text-lg sm:text-2xl outline-none font-semibold min-w-0"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all shrink-0"
            title="Close Search (ESC)"
          >
            <span>Close</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-zinc-400">ESC</kbd>
          </button>
        </div>
      </div>

      {/* Category Filter Pills Bar */}
      <div className="border-b border-white/5 bg-zinc-950/50 shrink-0">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs sm:text-sm">
          {[
            { id: "all", label: "All" },
            { id: "courses", label: "Courses" },
            { id: "videos", label: "Videos" },
            { id: "exams", label: "Exams" },
            { id: "teachers", label: "Teachers" },
            ...(canAccessStudentData ? [{ id: "students", label: "Students" }] : []),
            { id: "marks", label: canAccessStudentData ? "All Marks" : "My Results" }
          ].map((tab) => {
            const count = categoryCounts[tab.id as keyof typeof categoryCounts] || 0;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-[#d4af37] text-black font-bold shadow-lg shadow-[#d4af37]/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? "bg-black/25 text-black" : "bg-white/10 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain touch-pan-y"
      >
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-5 space-y-2.5">
          {isLoading ? (
            <div className="py-24 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
              <p className="text-base font-medium">Searching Academy Database...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
              <Search className="w-12 h-12 text-zinc-700" />
              <p className="text-lg font-semibold text-zinc-300">No results found for &ldquo;{searchTerm}&rdquo;</p>
              <p className="text-sm text-zinc-500 max-w-md">
                Try searching for specific course titles, teacher names, exam categories, dates, or student IDs.
              </p>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-4 sm:p-4.5 rounded-2xl cursor-pointer transition-all flex items-center gap-4 border ${
                    isSelected
                      ? "bg-white/[0.08] border-[#d4af37]/50 shadow-lg shadow-[#d4af37]/10"
                      : "bg-zinc-950/40 border-white/5 hover:bg-white/[0.03] hover:border-white/10"
                  }`}
                >
                  {/* Category Icon Container */}
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-base sm:text-lg font-semibold text-white truncate max-w-[550px]">
                        {item.title}
                      </h4>
                      {item.badges?.map(renderBadge)}
                    </div>

                    <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-400 truncate">
                      {item.subtitle && <span>{item.subtitle}</span>}
                      {item.date && (
                        <span className="flex items-center gap-1.5 text-zinc-500">
                          <Calendar className="w-3.5 h-3.5" /> {item.date}
                        </span>
                      )}
                      {item.time && (
                        <span className="flex items-center gap-1.5 text-zinc-500">
                          <Clock className="w-3.5 h-3.5" /> {item.time}
                        </span>
                      )}
                      {item.description && !item.subtitle && (
                        <span className="truncate">{item.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Action Link Arrow */}
                  <div className="shrink-0 flex items-center pr-2">
                    <ArrowRight
                      className={`w-5 h-5 transition-transform ${
                        isSelected ? "text-[#d4af37] translate-x-1.5" : "text-zinc-600"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer info bar */}
      <div className="border-t border-white/10 bg-zinc-950/90 shrink-0">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-3.5 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[11px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[11px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[11px]">↵</kbd>
              Select
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[11px]">ESC</kbd>
              Close
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="font-medium text-zinc-400">Brilliant Academy Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
