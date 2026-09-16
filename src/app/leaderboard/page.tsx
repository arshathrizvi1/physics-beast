"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Timer, CheckCircle, ChevronDown, Activity } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { calculateXpLevel } from "@/lib/xp";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [allExams, setAllExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedMetric, setSelectedMetric] = useState<string>("overall");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        setDbError(false);
        
        // Parallel fetch for all required collections
        const [usersSnap, resultsSnap, examsSnap, subjectsSnap, batchesSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'examResults')),
          getDocs(collection(db, 'exams')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'batches'))
        ]);

        const usersData = usersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        const resultsData = resultsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setExamResults(resultsData);
        
        const examsData = examsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setAllExams(examsData);
        
        const subjectsData = subjectsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setSubjects(subjectsData);
        
        const batchesData = batchesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setBatches(batchesData);

        // Set initial batch based on role
        if (user.role === 'student' && user.graduationYear) {
          setSelectedBatchId(user.graduationYear);
        } else if (user.role !== 'student' && batchesData.length > 0) {
          // Default to the first batch or 'all' if preferred. Let's default to the first one available
          setSelectedBatchId(batchesData[0].year || batchesData[0].id);
        }

      } catch (err: any) {
        console.error("Failed to fetch leaderboard data:", err);
        setDbError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboardData();
  }, [user]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  // Compute displayed leaderboard based on selection
  const batchFilteredUsers = users.filter(u => {
    if (selectedBatchId === "all") return true;
    return u.graduationYear === selectedBatchId || u.batchId === selectedBatchId;
  });

  let displayBoard: any[] = [];
  
  if (selectedMetric === "overall") {
    // Rank by Total XP (or Average Grade if XP is tied)
    displayBoard = batchFilteredUsers.map(u => {
      const xp = u.totalXp || 0;
      return {
        name: u.name || u.email?.split('@')[0] || "Unknown Student",
        score: xp,
        level: calculateXpLevel(xp),
        time: u.totalStudyTimeMins ? u.totalStudyTimeMins * 60 : 0, // Just for display
        avatar: u.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.id}&backgroundColor=d4af37`,
        isOverall: true,
        grade: u.averageGrade || 0
      };
    }).sort((a, b) => b.score - a.score);
  } else {
    // Subject-wise Rank
    const subjectExams = allExams.filter(e => e.course === selectedMetric || e.category === selectedMetric);
    const subjectExamIds = new Set(subjectExams.map(e => e.id));

    displayBoard = batchFilteredUsers.map(u => {
      const userSubjectResults = examResults.filter(r => r.userId === u.id && subjectExamIds.has(r.examId));
      let totalScore = 0;
      let totalTime = 0;

      userSubjectResults.forEach(r => {
        totalScore += (r.score || r.rawScore || 0);
        totalTime += (r.timeSeconds || r.timeTakenSeconds || 0);
      });

      return {
        name: u.name || u.email?.split('@')[0] || "Unknown Student",
        score: totalScore,
        time: totalTime,
        avatar: u.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.id}&backgroundColor=d4af37`,
        isOverall: false
      };
    }).sort((a, b) => {
      if (b.score === a.score) {
        if (a.score === 0) return 0; // if both have 0, they tie
        return a.time - b.time; // Lower time is better if scores are tied
      }
      return b.score - a.score;
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10" />
          Global Leaderboard
          <Trophy className="w-10 h-10" />
        </h1>
        
        {/* Dropdowns */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4">
          
          {/* Batch Selection (Only for Admin/Teacher) */}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <select 
              className="flex h-12 w-full sm:max-w-[200px] items-center justify-between rounded-md border-2 border-primary/50 bg-background/50 px-4 py-2 text-lg font-bold text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.year || b.id}>{b.year ? `Batch ${b.year}` : b.name}</option>
              ))}
            </select>
          )}

          {/* Metric Selection (Overall vs Subject) */}
          <select 
            className="flex h-12 w-full max-w-sm items-center justify-between rounded-md border-2 border-primary/50 bg-background/50 px-4 py-2 text-lg font-bold text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="overall">🌟 Overall Ranking</option>
            {subjects.map(s => (
              <option key={s.id} value={s.name}>📚 Subject: {s.name}</option>
            ))}
          </select>
        </div>
        
        <p className="text-sm text-primary/80 mt-2">
          {selectedMetric === "overall" 
            ? "Ranked by overall student XP level and dedication."
            : "Ranked by total marks scored in exams for this subject."}
        </p>
      </div>

      {dbError ? (
        <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Connection Error</h2>
          <p className="text-red-400">Could not fetch leaderboard data. Please check your internet connection and try again.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 items-center justify-center py-4">
            <div className="bg-secondary/20 border border-secondary p-4 rounded-xl text-center min-w-[120px]">
              <div className="text-2xl font-bold text-primary">{displayBoard.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Students Ranked</div>
            </div>
            <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl text-center min-w-[120px]">
              <div className="text-2xl font-bold text-primary">
                {selectedMetric === "overall" ? (batchFilteredUsers.reduce((acc, u) => acc + (u.examsDone || 0), 0)) : (displayBoard.filter(d => d.score >= 50).length)}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {selectedMetric === "overall" ? "Total Exams Taken" : "Passed (>50%)"}
              </div>
            </div>
            <div className="bg-secondary/20 border border-secondary p-4 rounded-xl text-center min-w-[120px] hidden sm:block">
              <div className="text-2xl font-bold text-primary">
                {selectedMetric === "overall" ? (batchFilteredUsers.reduce((acc, u) => acc + (u.totalStudyTimeMins ? Math.floor(u.totalStudyTimeMins/60) : 0), 0)) : (displayBoard.length > 0 ? Math.round(displayBoard.reduce((a,b)=>a+b.score,0)/displayBoard.length) : 0)}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {selectedMetric === "overall" ? "Hours Studied" : "Avg Score"}
              </div>
            </div>
          </div>

          <Card className="border-secondary/50 shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-secondary/20 pb-4 px-2 md:px-6">
              <div className="grid grid-cols-12 gap-1 md:gap-4 text-xs md:text-sm font-bold text-muted-foreground px-1 md:px-4">
                <div className="col-span-2 md:col-span-1 text-center md:text-left">Rank</div>
                <div className="col-span-5 md:col-span-7">Student</div>
                <div className="col-span-3 md:col-span-2 text-center">{selectedMetric === "overall" ? "Total XP" : "Score"}</div>
                <div className="col-span-2 md:col-span-2 text-right">{selectedMetric === "overall" ? "Grade" : "Time"}</div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {loading ? (
                  <div className="p-12 text-center text-muted-foreground animate-pulse">Loading live leaderboard data...</div>
                ) : displayBoard.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground italic">No rankings available yet.</div>
                ) : (
              displayBoard.map((student, index) => {
                const rank = index + 1;
                let rowClasses = "grid grid-cols-12 gap-1 md:gap-4 items-center p-2 md:p-4 border-b border-border/50 transition-colors ";
                let rankBadge = <span className="font-mono text-muted-foreground text-xs md:text-base">#{rank}</span>;

                // Top 3 Highlighting
                if (rank === 1) {
                  rowClasses += "bg-primary/20 hover:bg-primary/30 border-l-4 border-l-yellow-400";
                  rankBadge = <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />;
                } else if (rank === 2) {
                  rowClasses += "bg-secondary/40 hover:bg-secondary/60 border-l-4 border-l-slate-300";
                  rankBadge = <Medal className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />;
                } else if (rank === 3) {
                  rowClasses += "bg-orange-900/20 hover:bg-orange-900/30 border-l-4 border-l-orange-500";
                  rankBadge = <Medal className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />;
                } 
                // Top 10 Highlighting
                else if (rank <= 10) {
                  rowClasses += "bg-primary/5 hover:bg-primary/10 font-medium";
                  rankBadge = <Award className="w-4 h-4 md:w-5 md:h-5 text-primary/80" />;
                } else {
                  rowClasses += "hover:bg-secondary/10";
                }

                return (
                  <motion.div 
                    key={index} 
                    className={rowClasses}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="col-span-2 md:col-span-1 flex justify-center md:justify-start shrink-0">
                      {rankBadge}
                    </div>
                    <div className="col-span-5 md:col-span-7 flex items-center gap-1.5 md:gap-3 overflow-hidden">
                      <img src={student.avatar} alt="avatar" className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-secondary shrink-0" />
                      <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2 min-w-0">
                        <span className={`truncate text-xs md:text-base ${rank <= 3 ? 'font-bold md:text-lg' : ''}`}>{student.name}</span>
                        {student.isOverall && student.level ? (
                          <span className="text-[8px] md:text-[10px] font-bold bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 rounded-full border border-primary/20 shrink-0 w-fit">
                            Lvl {student.level}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="col-span-3 md:col-span-2 text-center flex justify-center items-center shrink-0">
                      <span className={`font-bold text-[11px] md:text-base ${rank <= 3 ? 'text-primary' : ''}`}>
                        {student.isOverall ? <>{student.score} <span className="text-[9px] md:text-sm">XP</span></> : `${student.score}%`}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-2 text-right flex justify-end items-center gap-1 text-[11px] md:text-sm font-mono text-muted-foreground shrink-0">
                      {student.isOverall ? (
                        <span className="font-bold text-green-500">{student.grade}%</span>
                      ) : (
                        <>
                          <Timer className="w-3 h-3 hidden md:block shrink-0" />
                          <span className="truncate">{formatTime(student.time)}</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
