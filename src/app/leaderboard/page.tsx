"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Timer, CheckCircle, ChevronDown, Activity } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { calculateXpLevel } from "@/lib/xp";
import { motion } from "framer-motion";

export default function LeaderboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [uniqueExams, setUniqueExams] = useState<any[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState<string>("overall");
  const [loading, setLoading] = useState(true);

  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        setDbError(false);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 5000)
        );

        // 1. Fetch all students
        const qUsers = query(collection(db, 'users'), where('role', '==', 'student'));
        const usersSnap = await Promise.race([getDocs(qUsers), timeoutPromise]) as any;
        const usersData = usersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        // 2. Fetch all exam results
        const resultsSnap = await Promise.race([getDocs(collection(db, 'examResults')), timeoutPromise]) as any;
        const resultsData = resultsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        setExamResults(resultsData);

        // Extract unique exams
        const examsMap = new Map();
        resultsData.forEach((res: any) => {
          if (res.examId && res.examTitle) {
            examsMap.set(res.examId, res.examTitle);
          }
        });
        const examsList = Array.from(examsMap.entries()).map(([id, title]) => ({ id, title }));
        setUniqueExams(examsList);

      } catch (err: any) {
        if (err.message === "FIRESTORE_TIMEOUT") {
          console.log("Database timeout - likely quota exceeded.");
        } else {
          console.error("Failed to fetch leaderboard data:", err);
        }
        setDbError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboardData();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  // Compute displayed leaderboard based on selection
  let displayBoard: any[] = [];
  
  if (selectedExamId === "overall") {
    // Rank by Total XP (or Average Grade if XP is tied)
    displayBoard = users.map(u => {
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
    // Rank by Exam Score, then Time (ascending)
    const specificResults = examResults.filter(r => r.examId === selectedExamId);
    displayBoard = specificResults.map(r => {
      const student = users.find(u => u.id === r.userId) || { name: "Unknown Student", photoUrl: null, id: r.userId };
      return {
        name: student.name || student.email?.split('@')[0] || "Unknown Student",
        score: r.score || 0,
        time: r.timeSeconds || r.timeTakenSeconds || 0,
        avatar: student.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${student.id}&backgroundColor=d4af37`,
        isOverall: false
      };
    }).sort((a, b) => {
      if (b.score === a.score) {
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
        
        {/* Dropdown to select Exam or Overall */}
        <div className="flex justify-center mt-4">
          <select 
            className="flex h-12 w-full max-w-sm items-center justify-between rounded-md border-2 border-primary/50 bg-background/50 px-4 py-2 text-lg font-bold text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            <option value="overall">🏆 Overall Global Ranking (Total XP)</option>
            {uniqueExams.map(ex => (
              <option key={ex.id} value={ex.id}>📄 Exam: {ex.title}</option>
            ))}
          </select>
        </div>
        
        <p className="text-sm text-primary/80 mt-2">
          {selectedExamId === "overall" 
            ? "Ranked by overall student XP level and dedication."
            : "Ranked by Highest Score, then Quickest Completion Time."}
        </p>
      </div>

      {dbError ? (
        <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Connection Error</h2>
          <p className="text-red-400">Could not fetch leaderboard data. The database daily quota might be exceeded.</p>
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
                {selectedExamId === "overall" ? (users.reduce((acc, u) => acc + (u.examsDone || 0), 0)) : (displayBoard.filter(d => d.score >= 50).length)}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {selectedExamId === "overall" ? "Total Exams Taken" : "Passed (>50%)"}
              </div>
            </div>
          </div>

          <Card className="border-secondary/50 shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-secondary/20 pb-4 px-2 md:px-6">
              <div className="grid grid-cols-12 gap-1 md:gap-4 text-xs md:text-sm font-bold text-muted-foreground px-1 md:px-4">
                <div className="col-span-2 md:col-span-1 text-center md:text-left">Rank</div>
                <div className="col-span-5 md:col-span-7">Student</div>
                <div className="col-span-3 md:col-span-2 text-center">{selectedExamId === "overall" ? "Total XP" : "Score"}</div>
                <div className="col-span-2 md:col-span-2 text-right">{selectedExamId === "overall" ? "Grade" : "Time"}</div>
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
