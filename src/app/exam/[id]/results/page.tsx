"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, addDoc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Trophy, Clock, CheckCircle2, XCircle, BarChart3, ArrowLeft, Send, Image as ImageIcon, Edit2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatPdfViewerUrl, uploadToCloudinary } from "@/lib/cloudinary";
import { PdfViewer } from "@/components/ui/pdf-viewer";
import { calculateExamXp } from "@/lib/xp";

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  
  const [exam, setExam] = useState<any>(null);
  const [myResult, setMyResult] = useState<any>(null);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExamActive, setIsExamActive] = useState(false);

  // Doubt Messaging State
  const [doubtText, setDoubtText] = useState("");
  const [doubtImage, setDoubtImage] = useState<File | null>(null);
  const [isDoubtSending, setIsDoubtSending] = useState(false);
  
  const [isExitMessageDialogOpen, setIsExitMessageDialogOpen] = useState(false);
  const [exitMessageText, setExitMessageText] = useState("");
  const [isExitMessageSending, setIsExitMessageSending] = useState(false);

  // Admin Score Edit State
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editRawScore, setEditRawScore] = useState<number>(0);

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
        
        setIsExamActive(examData.endTime ? Date.now() < examData.endTime : false);

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

  const handleSendExitMessage = async () => {
    if (!exitMessageText.trim() || !user) return;
    setIsExitMessageSending(true);
    try {
      await addDoc(collection(db, 'examMessages'), {
        examId: id,
        examTitle: exam?.title || "Unknown Exam",
        userId: user.uid,
        studentName: user.name || user.email?.split('@')[0] || "Student",
        type: 'exam_exit',
        message: exitMessageText,
        timestamp: Date.now(),
        status: 'unread'
      });
      
      await addDoc(collection(db, 'notifications'), {
        target: "admin",
        title: "New Exam Exit Message",
        message: `${user.name || user.email?.split('@')[0] || "A student"} sent an exit message for "${exam?.title || "Unknown Exam"}".`,
        link: "/admin#messages-support",
        timestamp: Date.now(),
        type: "exam",
        readBy: []
      });

      alert("Message sent to admin successfully.");
      setIsExitMessageDialogOpen(false);
      setExitMessageText("");
    } catch (err) {
      console.error("Failed to send exit message", err);
      alert("Failed to send message.");
    } finally {
      setIsExitMessageSending(false);
    }
  };

  const handleSendDoubt = async () => {
    if (!doubtText.trim() && !doubtImage) return;
    if (!user) return;
    setIsDoubtSending(true);
    try {
      let imgUrl = "";
      if (doubtImage) {
        imgUrl = await uploadToCloudinary(doubtImage);
      }
      await addDoc(collection(db, 'examMessages'), {
        examId: id,
        examTitle: exam.title,
        userId: user.uid,
        studentName: user.name || user.email?.split('@')[0] || "Student",
        type: 'post_exam_doubt',
        message: doubtText,
        imageUrl: imgUrl,
        timestamp: Date.now(),
        status: 'unread'
      });
      
      await addDoc(collection(db, 'notifications'), {
        target: "admin",
        title: "New Exam Doubt 🤔",
        message: `${user.name || user.email?.split('@')[0] || "A student"} submitted a doubt for "${exam.title}".`,
        link: "/admin#messages",
        timestamp: Date.now(),
        type: "exam",
        readBy: []
      });

      alert("Your doubt has been submitted to the admin.");
      setDoubtText("");
      setDoubtImage(null);
    } catch (err) {
      console.error("Failed to submit doubt", err);
      alert("Failed to submit doubt.");
    }
    setIsDoubtSending(false);
  };

  const handleSaveScore = async (resultId: string) => {
    try {
      const resDoc = await getDoc(doc(db, 'examResults', resultId));
      if (!resDoc.exists()) return;
      const resData = resDoc.data();

      // Recalculate XP if score changed
      const duration = resData.durationSeconds || 900;
      const xpDetails = calculateExamXp({
        correctAnswers: editRawScore,
        totalQuestions: exam?.examType === 'essay' ? 100 : (exam.questions?.length || 1),
        timeTakenSeconds: resData.timeTakenSeconds || 0,
        durationSeconds: duration,
      });

      const finalScore = exam?.examType === 'essay' ? editScore : xpDetails.percentage;
      const xpEarned = exam?.examType === 'essay' ? editScore : xpDetails.totalXp;
      
      await updateDoc(doc(db, 'examResults', resultId), {
        score: finalScore,
        rawScore: editRawScore,
        grade: exam?.examType === 'essay' ? 'Graded' : xpDetails.grade,
        status: 'done',
        xpEarned: xpEarned
      });

      // Update local state
      setAllResults(prev => prev.map(r => r.id === resultId ? { ...r, score: finalScore, rawScore: editRawScore, status: 'done', xpEarned: xpEarned } : r));
      
      if (resultId === myResult?.id) {
        setMyResult((prev: any) => ({ ...prev, score: finalScore, rawScore: editRawScore, status: 'done', xpEarned: xpEarned }));
      }

      setEditingResultId(null);
      alert("Score updated successfully.");
    } catch (err) {
      console.error("Failed to update score", err);
      alert("Failed to update score.");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Results Dashboard...</div>;
  }

  if (errorMsg || (!myResult && user?.role !== 'admin')) {
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
  const questionStats = exam?.questions?.map((q: any, index: number) => {
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
  }) || [];

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

      {myResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center space-y-2">
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Your Score</div>
              {exam?.examType === 'essay' && (!exam.gradesPublished || myResult.status === 'pending_grading') ? (
                <div className="text-4xl font-black text-primary pt-2">Pending</div>
              ) : (
                <div className="text-5xl font-black text-primary">{myResult.rawScore} <span className="text-2xl text-muted-foreground font-normal">/ {exam.questions?.length || 100}</span></div>
              )}
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
              { (exam?.examType === 'essay' && !exam.gradesPublished) || isExamActive ? (
                <div className="text-4xl font-black text-primary pt-2">Pending</div>
              ) : (
                <div className="text-5xl font-black text-foreground">#{allResults.findIndex(r => r.id === myResult.id) + 1}</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isExamActive ? (
        <Card className="mt-8 border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center py-12">
            <CardTitle className="text-destructive flex justify-center items-center gap-2 text-2xl mb-2">
              <Clock className="w-6 h-6" /> Exam Still in Progress
            </CardTitle>
            <CardDescription className="text-base max-w-2xl mx-auto">
              The question paper, answers, and leaderboard will be available here once the exam time window has officially closed for all students.
              <br /><br />
              Please check back later!
            </CardDescription>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-2" onClick={() => setIsExitMessageDialogOpen(true)}>
                <MessageSquare className="w-4 h-4" /> Message Admin
              </Button>
            </div>
            {isExitMessageDialogOpen && (
              <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-primary/20 text-left">
                  <CardHeader>
                    <CardTitle className="text-lg">Message Admin</CardTitle>
                    <CardDescription>If you accidentally exited or were disqualified, explain the issue to the admin to request a redo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g., I accidentally submitted my paper, please allow me to redo..."
                      value={exitMessageText}
                      onChange={(e) => setExitMessageText(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setIsExitMessageDialogOpen(false)} disabled={isExitMessageSending}>Cancel</Button>
                    <Button onClick={handleSendExitMessage} disabled={isExitMessageSending || !exitMessageText.trim()}>
                      {isExitMessageSending ? "Sending..." : "Send Message"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </CardHeader>
        </Card>
      ) : exam?.examType === 'essay' ? (
        <Tabs defaultValue={myResult ? (myResult.status === 'graded' ? 'corrected' : 'answers') : 'question'} className="w-full mt-8">
          <TabsList className={`grid w-full ${myResult ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {myResult && <TabsTrigger value="answers">My Submitted Answer</TabsTrigger>}
            {myResult && <TabsTrigger value="corrected">Teacher's Corrected Paper</TabsTrigger>}
            <TabsTrigger value="question">Question Paper</TabsTrigger>
          </TabsList>
          
          {myResult && (
            <TabsContent value="answers" className="mt-6">
              <Card className="border-secondary/50 shadow-md flex flex-col overflow-hidden">
                <CardContent className="p-0 flex-1 min-h-[650px] relative">
                  <PdfViewer 
                    url={myResult.answerPdfUrl} 
                    title="Your Submitted Answer Sheet" 
                    height="650px" 
                    allowDownload={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {myResult && (
            <TabsContent value="corrected" className="mt-6">
              {exam.gradesPublished ? (
                myResult.status === 'graded' ? (
                <div className="space-y-6">
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader>
                      <CardTitle>Grading Result</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 md:flex-row justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Score</p>
                        <p className="text-3xl font-bold text-primary">{myResult.rawScore ?? myResult.score ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Grade</p>
                        <p className="text-3xl font-bold text-primary">{myResult.grade || '-'}</p>
                      </div>
                      {myResult.feedback && (
                        <div className="md:max-w-[50%]">
                          <p className="text-sm font-medium text-muted-foreground">Teacher Remarks</p>
                          <p className="text-base">{myResult.feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {myResult.correctedPdfUrl ? (
                    <Card className="border-secondary/50 shadow-md flex flex-col overflow-hidden">
                      <CardHeader className="py-4 border-b border-secondary/20 bg-secondary/5">
                        <CardTitle className="text-lg">Corrected Paper</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 min-h-[650px] relative">
                        <PdfViewer 
                          url={myResult.correctedPdfUrl} 
                          title="Teacher's Corrected Answer Sheet" 
                          height="650px" 
                          allowDownload={true}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground italic">
                        No corrected PDF paper was provided by the teacher.
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Not Yet Graded</h3>
                      <p className="text-muted-foreground">The teacher published grades, but your paper was not graded.</p>
                    </div>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Teacher is Correcting</h3>
                    <p className="text-muted-foreground">Your essay is being reviewed. The results and rank will be available here once the teacher publishes all the grades.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          )}


          <TabsContent value="question" className="mt-6">
            <Card className="border-secondary/50 shadow-md flex flex-col overflow-hidden">
              <CardContent className="p-0 flex-1 min-h-[650px] relative">
                <PdfViewer 
                  url={exam.questionPdfUrl} 
                  title={exam.title || "Question Paper"} 
                  height="650px" 
                  allowDownload={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue={myResult ? "answers" : "leaderboard"} className="w-full mt-8">
        <TabsList className={`grid w-full ${myResult ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {myResult && <TabsTrigger value="answers">My Answers</TabsTrigger>}
          <TabsTrigger value="leaderboard">Exam Leaderboard</TabsTrigger>
          <TabsTrigger value="analytics">Class Analytics</TabsTrigger>
        </TabsList>
        
        {/* MY ANSWERS TAB */}
        {myResult && (
        <TabsContent value="answers" className="mt-6 space-y-6">
          {exam.questions?.map((q: any, idx: number) => {
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
        )}

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
                      <tr key={res.id} className={`${res.id === myResult?.id ? 'bg-primary/5 font-medium' : 'hover:bg-secondary/5'} transition-colors`}>
                        <td className="px-6 py-4">
                          {idx === 0 ? <Trophy className="w-5 h-5 text-yellow-500" /> : 
                           idx === 1 ? <Trophy className="w-5 h-5 text-gray-400" /> : 
                           idx === 2 ? <Trophy className="w-5 h-5 text-amber-700" /> : 
                           <span className="text-muted-foreground font-mono pl-1">#{idx + 1}</span>}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          {res.studentName} {res.id === myResult?.id && <span className="bg-primary/20 text-primary text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ml-2">You</span>}
                          {user?.role === 'admin' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6 h-6 ml-2" 
                              onClick={() => {
                                setEditingResultId(res.id);
                                setEditRawScore(res.rawScore || 0);
                                setEditScore(res.score || 0);
                              }}
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold">
                          {editingResultId === res.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <input 
                                type="number" 
                                className="w-16 p-1 border rounded text-sm text-right bg-background text-foreground"
                                value={editRawScore} 
                                onChange={e => setEditRawScore(Number(e.target.value))} 
                              />
                              <Button size="sm" onClick={() => handleSaveScore(res.id)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingResultId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            `${res.rawScore} / ${exam.questions?.length || 100}`
                          )}
                        </td>
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
      )}

      {/* POST-EXAM DOUBT SECTION */}
      {!isExamActive && (
        <Card className="mt-8 border-secondary/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5"/> Ask a Doubt / Request Correction</CardTitle>
            <CardDescription>If you found an error in the grading or have a doubt about a question, send a message to the teacher.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Explain your doubt here..."
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
            />
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <ImageIcon className="w-5 h-5" />
                <span>{doubtImage ? doubtImage.name : "Attach Image (Optional)"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDoubtImage(e.target.files[0]);
                    }
                  }}
                />
              </label>
              {doubtImage && (
                <Button variant="ghost" size="sm" onClick={() => setDoubtImage(null)}>Remove Image</Button>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button onClick={handleSendDoubt} disabled={isDoubtSending || (!doubtText.trim() && !doubtImage)}>
              {isDoubtSending ? "Sending..." : "Send to Teacher"}
            </Button>
          </CardFooter>
        </Card>
      )}

    </div>
  );
}
