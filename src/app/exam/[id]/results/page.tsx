"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Trophy, Clock, CheckCircle2, XCircle, BarChart3, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  
  const [exam, setExam] = useState<any>(null);
  const [myResult, setMyResult] = useState<any>(null);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchResults = async () => {
      try {
        const examDoc = await getDoc(doc(db, 'exams', id));
        if (!examDoc.exists()) {
          setErrorMsg("Exam not found.");
          setLoading(false);
          return;
        }

        const examData = examDoc.data();
        setExam(examData);

        if (examData.endTime && Date.now() < examData.endTime) {
          setErrorMsg("Results are locked until the exam window ends.");
          setLoading(false);
          return;
        }

        // Fetch all results for leaderboard and analytics
        const qAll = query(collection(db, 'examResults'), where('examId', '==', id));
        const snapAll = await getDocs(qAll);
        const results: any[] = [];
        let myRes = null;
        
        snapAll.forEach(d => {
          const data = d.data();
          results.push({ id: d.id, ...data });
          if (data.userId === user.uid) {
            myRes = { id: d.id, ...data };
          }
        });

        // Sort by rawScore descending, then timeTakenSeconds ascending
        results.sort((a, b) => {
          if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
          return a.timeTakenSeconds - b.timeTakenSeconds;
        });

        setAllResults(results);
        setMyResult(myRes);
        setLoading(false);

      } catch (e) {
        console.error(e);
        setErrorMsg("Failed to load results.");
        setLoading(false);
      }
    };

    fetchResults();
  }, [id, user]);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Results Dashboard...</div>;
  }

  if (errorMsg || !myResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">{errorMsg || "You did not participate in this exam."}</p>
        <Link href="/exams" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          Back to Exams
        </Link>
      </div>
    );
  }

  // Analytics Calculation
  const totalStudents = allResults.length;
  const questionStats = exam.questions.map((q: any, index: number) => {
    let correctCount = 0;
    allResults.forEach(res => {
      if (res.answers && res.answers[index] === q.correct) {
        correctCount++;
      }
    });
    return {
      index,
      text: q.text,
      percentCorrect: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0
    };
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <Link href="/exams" className="text-muted-foreground hover:text-primary flex items-center gap-2 mb-4 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Exams
        </Link>
        <h1 className="text-3xl font-bold">{exam.title} - Results</h1>
        <p className="text-muted-foreground mt-2">View the leaderboard, your answers, and class performance analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Your Score</div>
            <div className="text-5xl font-black text-primary">{myResult.rawScore} <span className="text-2xl text-muted-foreground font-normal">/ {exam.questions.length}</span></div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Your Time</div>
            <div className="text-5xl font-black text-foreground">{formatTime(myResult.timeTakenSeconds)}</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-border">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Your Rank</div>
            <div className="text-5xl font-black text-foreground">#{allResults.findIndex(r => r.id === myResult.id) + 1}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="answers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="answers">My Answers</TabsTrigger>
          <TabsTrigger value="leaderboard">Exam Leaderboard</TabsTrigger>
          <TabsTrigger value="analytics">Class Analytics</TabsTrigger>
        </TabsList>
        
        {/* MY ANSWERS TAB */}
        <TabsContent value="answers" className="mt-6 space-y-6">
          {exam.questions.map((q: any, idx: number) => {
            const myAnswer = myResult.answers?.[idx];
            const isCorrect = Array.isArray(q.correct) ? q.correct.includes(myAnswer) : myAnswer === q.correct;
            
            return (
              <Card key={idx} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-destructive'} overflow-hidden`}>
                <CardHeader className="bg-secondary/5 pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Question {idx + 1}</CardTitle>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1 rounded-full"><CheckCircle2 className="w-4 h-4"/> Correct</span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive text-sm font-bold bg-destructive/10 px-3 py-1 rounded-full"><XCircle className="w-4 h-4"/> Incorrect</span>
                    )}
                  </div>
                  <CardDescription className="text-base text-foreground mt-2">{q.text}</CardDescription>
                  {q.image && <img src={q.image} alt="Question" className="max-w-full h-auto rounded-md mt-4 max-h-64 object-contain" />}
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt: any) => {
                      const isSelected = myAnswer === opt.id;
                      const isActualCorrect = Array.isArray(q.correct) ? q.correct.includes(opt.id) : q.correct === opt.id;
                      
                      let bgClass = "bg-secondary/10 border-border";
                      let textClass = "text-foreground";
                      
                      if (isActualCorrect) {
                        bgClass = "bg-green-500/20 border-green-500/50 shadow-sm";
                        textClass = "text-green-700 dark:text-green-400 font-bold";
                      } else if (isSelected && !isCorrect) {
                        bgClass = "bg-destructive/20 border-destructive/50 shadow-sm";
                        textClass = "text-destructive font-bold";
                      }

                      return (
                        <div key={opt.id} className={`p-4 rounded-lg border ${bgClass} flex items-center gap-3 transition-all`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isActualCorrect ? 'bg-green-500 text-foreground' : isSelected && !isCorrect ? 'bg-destructive text-foreground' : 'bg-secondary text-muted-foreground'}`}>
                            {opt.id}
                          </div>
                          <span className={`${textClass} leading-tight`}>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500 w-5 h-5"/> Official Exam Ranking</CardTitle>
              <CardDescription>Ranked by highest score, tie-broken by fastest completion time.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/30 text-muted-foreground uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4 text-right">Score</th>
                      <th className="px-6 py-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allResults.map((res, idx) => (
                      <tr key={res.id} className={`${res.id === myResult.id ? 'bg-primary/5 font-medium' : 'hover:bg-secondary/5'} transition-colors`}>
                        <td className="px-6 py-4">
                          {idx === 0 ? <Trophy className="w-5 h-5 text-yellow-500" /> : 
                           idx === 1 ? <Trophy className="w-5 h-5 text-gray-400" /> : 
                           idx === 2 ? <Trophy className="w-5 h-5 text-amber-700" /> : 
                           <span className="text-muted-foreground font-mono pl-1">#{idx + 1}</span>}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          {res.studentName} {res.id === myResult.id && <span className="bg-primary/20 text-primary text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ml-2">You</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-bold">{res.rawScore} / {exam.questions.length}</td>
                        <td className="px-6 py-4 text-right text-muted-foreground flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3"/> {formatTime(res.timeTakenSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary w-5 h-5"/> Class Performance Analytics</CardTitle>
              <CardDescription>Percentage of students who answered each question correctly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {questionStats.map((stat: any) => (
                <div key={stat.index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate pr-4 text-foreground">Q{stat.index + 1}: {stat.text}</span>
                    <span className="font-bold text-primary shrink-0">{stat.percentCorrect}%</span>
                  </div>
                  <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${stat.percentCorrect > 75 ? 'bg-green-500' : stat.percentCorrect > 40 ? 'bg-yellow-500' : 'bg-destructive'}`}
                      style={{ width: `${stat.percentCorrect}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
