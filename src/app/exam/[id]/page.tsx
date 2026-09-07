"use client";

import { useState, useEffect, use, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, Send, Trophy, Award, Zap, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, increment, getDocs, query, where, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { calculateExamXp, calculateXpLevel, formatSeconds, ExamXpResult } from "@/lib/xp";

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  
  const [examData, setExamData] = useState({ title: "Loading...", durationSeconds: 15 * 60 });
  const [questions, setQuestions] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [essayPdfFile, setEssayPdfFile] = useState<File | null>(null);
  const [essayUploading, setEssayUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [xpResult, setXpResult] = useState<ExamXpResult | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const initExam = async () => {
      try {
        const examDoc = await getDoc(doc(db, 'exams', id));
        if (!examDoc.exists()) {
          setErrorMsg("Exam not found or has been deleted.");
          return;
        }
        
        const examData = examDoc.data();
        setExam(examData);

        // Security check: Single attempt
        const qResults = query(collection(db, 'examResults'), where('userId', '==', user.uid), where('examId', '==', id));
        const existingResults = await getDocs(qResults);
        if (!existingResults.empty) {
          router.replace(`/exam/${id}/results`);
          return;
        }

        // Security check: Timing bounds
        const now = Date.now();
        if (examData.startTime && now < examData.startTime) {
          setErrorMsg("This exam has not started yet.");
          return;
        }
        if (examData.endTime && now > examData.endTime) {
          setErrorMsg("This exam has ended and is closed for new submissions.");
          return;
        }

        // Initialize exam state
        const duration = examData.durationSeconds || 900;
        setExamData({ title: examData.title, durationSeconds: duration });
        setQuestions(examData.questions);
        setTimeLeft(duration);
        setIsLoaded(true);

      } catch (err) {
        console.error("Failed to load exam", err);
        setErrorMsg("Failed to load exam data.");
      }
    };

    initExam();
  }, [id, user]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">{errorMsg}</p>
        <Button onClick={() => router.push('/exams')} variant="outline" className="w-full">
          Back to Exams
        </Button>
      </div>
    );
  }

  useEffect(() => {
    if (isSubmitted || !isLoaded) return;

    const timer = setInterval(() => {
      // Check if scheduled exam end time has arrived
      if (exam?.endTime && Date.now() >= exam.endTime) {
        clearInterval(timer);
        setTimeUp(true);
        handleSubmit();
        return;
      }

      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, isLoaded, exam?.endTime]);

  const lastStudyDateRef = useRef(user?.lastStudyDate || new Date().toISOString().split('T')[0]);

  // Exam Heartbeat & Presence
  useEffect(() => {
    if (!user?.uid || isSubmitted || !isLoaded) return;
    lastStudyDateRef.current = user.lastStudyDate || new Date().toISOString().split('T')[0];

    const heartbeat = setInterval(() => {
      const userRef = doc(db, 'users', user.uid);
      const newXp = (user.totalXp || 0) + 10;
      const nowStr = new Date().toISOString().split('T')[0];
      
      const isSameDay = lastStudyDateRef.current === nowStr;
      if (!isSameDay) {
        lastStudyDateRef.current = nowStr;
      }
      
      updateDoc(userRef, {
        totalStudyTimeMins: increment(1),
        todayStudyTimeMins: isSameDay ? increment(1) : 1,
        [`studyHistory.${nowStr}`]: increment(1),
        lastStudyPing: Date.now(),
        lastStudyDate: nowStr,
        totalXp: newXp,
        xpLevel: calculateXpLevel(newXp),
      }).catch(e => console.log("Exam heartbeat failed", e?.message));
    }, 60000); // 1 minute

    return () => clearInterval(heartbeat);
  }, [user?.uid, isSubmitted, isLoaded]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: value }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || isSubmitted) return;

    // If the exam window has closed more than 60s ago, reject late submissions
    if (exam?.endTime && Date.now() > exam.endTime + 60000) {
      alert("This exam's submission window has officially ended. Late submissions cannot be processed.");
      router.push('/exams');
      return;
    }

    if (exam?.examType === 'essay' && !essayPdfFile && !timeUp) {
      alert("Please upload your answer sheet (PDF) before submitting.");
      return;
    }

    setIsSubmitting(true);
    setEssayUploading(true);

    let answerPdfUrl = "";
    if (exam?.examType === 'essay' && essayPdfFile) {
      try {
        const fileRef = ref(storage, `exam_answers/${user?.uid}_${id}_${Date.now()}.pdf`);
        const snapshot = await uploadBytes(fileRef, essayPdfFile);
        answerPdfUrl = await getDownloadURL(snapshot.ref);
      } catch (err) {
        console.error("Answer PDF upload failed", err);
        alert("Failed to upload your answer sheet. Please try again.");
        setIsSubmitting(false);
        setEssayUploading(false);
        return;
      }
    }
    setEssayUploading(false);

    let totalCorrect = 0;
    if (exam?.examType === 'mcq') {
      questions.forEach((q, idx) => {
        const isCorrect = Array.isArray(q.correct) ? q.correct.includes(answers[idx]) : answers[idx] === q.correct;
        if (isCorrect) totalCorrect++;
      });
    }
    setScore(totalCorrect);

    const duration = examData.durationSeconds || 900;
    const taken = Math.max(1, duration - timeLeft);
    setTimeTaken(taken);

    // Calculate XP based on Marks, Time efficiency, and Completion!
    const xpDetails = calculateExamXp({
      correctAnswers: totalCorrect,
      totalQuestions: exam?.examType === 'essay' ? 100 : (questions.length || 1), // dummy values for essay
      timeTakenSeconds: taken,
      durationSeconds: duration,
    });
    setXpResult(xpDetails);

    // Save to Firestore if user is authenticated
    if (user && user.role === 'student') {
      try {
        // 1. Record exam result
        await addDoc(collection(db, 'examResults'), {
          examId: String(id),
          examTitle: examData.title,
          userId: user.uid,
          studentName: user.name || user.email?.split('@')[0] || "Student",
          score: exam?.examType === 'essay' ? 0 : xpDetails.percentage,
          rawScore: totalCorrect,
          totalQuestions: exam?.examType === 'essay' ? 0 : questions.length,
          grade: exam?.examType === 'essay' ? "Pending" : xpDetails.grade,
          status: exam?.examType === 'essay' ? "pending_grading" : "done",
          timeSeconds: taken,
          timeTakenSeconds: taken,
          durationSeconds: duration,
          xpEarned: exam?.examType === 'essay' ? 10 : xpDetails.totalXp, // minimum 10 XP for doing it
          timestamp: Date.now(),
          answers: exam?.examType === 'essay' ? {} : answers,
          answerPdfUrl: answerPdfUrl,
          examType: exam?.examType || 'mcq'
        });

        // 2. Fetch past exams to compute fresh average grade
        const qResults = query(collection(db, 'examResults'), where('userId', '==', user.uid));
        const resultsSnap = await getDocs(qResults);
        const allScores: number[] = [];
        resultsSnap.forEach(d => {
          const data = d.data();
          if (data.examType !== 'essay' && typeof data.score === 'number') allScores.push(data.score);
        });
        if (exam?.examType !== 'essay') {
          allScores.push(xpDetails.percentage);
        }
        const avgGrade = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

        // 3. Update student user document with XP, Level, Exam Count, Study Time, and Average Grade
        const userRef = doc(db, 'users', user.uid);
        const xpToGain = exam?.examType === 'essay' ? 10 : xpDetails.totalXp;
        const currentTotalXp = (user.totalXp || 0) + xpToGain;
        const newLevel = calculateXpLevel(currentTotalXp);

        await updateDoc(userRef, {
          totalXp: increment(xpToGain),
          xpLevel: newLevel,
          examsDone: increment(1),
          totalStudyTimeMins: increment(xpDetails.studyMinutes), // exam time counts as study time
          averageGrade: avgGrade
        });
      } catch (err) {
        console.error("Failed to save exam result & XP", err);
      }
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (!isLoaded) return <div className="p-8 text-center text-muted-foreground">Loading Exam...</div>;

  if (isSubmitted) {
    const hasEndTime = !!exam?.endTime;
    
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <Card className="w-full max-w-lg text-center border-primary/50 shadow-2xl shadow-primary/10 bg-card overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/20 pb-6 pt-10">
            <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <CardTitle className="text-3xl font-black text-foreground">
              {timeUp ? "Time's Up! Auto-Submitted" : "Exam Submitted!"}
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-2 font-medium">{examData.title}</p>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-8 pb-8 px-8 text-muted-foreground text-sm">
            <p>Your answers have been securely saved to the database. XP for your performance and study time has been awarded in the background.</p>
            
            {hasEndTime ? (
              <div className="bg-secondary/20 p-4 rounded-lg border border-border">
                <p className="font-semibold text-foreground mb-1">Results Pending</p>
                <p>You can view your score, correct answers, and the leaderboard once the exam window closes at:</p>
                <p className="font-bold text-primary mt-2">{new Date(exam.endTime).toLocaleString()}</p>
              </div>
            ) : (
              <div className="bg-secondary/20 p-4 rounded-lg border border-border">
                <p>You can view your results and the exam leaderboard now.</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2 pb-8 px-8">
            <Button onClick={() => router.push('/exams')} className="w-full h-12 text-md font-semibold">
              Back to Exams
            </Button>
            {(!hasEndTime || Date.now() > exam.endTime) && (
              <Button onClick={() => router.push(`/exam/${exam.id}/results`)} variant="outline" className="w-full h-12 text-primary border-primary/50">
                View Results Now
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  const progressPercentage = (timeLeft / examData.durationSeconds) * 100;
  const isLowTime = timeLeft < 60;

  if (exam?.examType === 'essay') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-secondary/20 p-4 rounded-xl border border-secondary/50">
          <div>
            <h2 className="text-xl font-bold">{examData.title}</h2>
            <p className="text-sm text-muted-foreground">Essay Exam - Answer on paper and upload a scanned PDF</p>
          </div>
          <div className={`flex items-center gap-2 text-xl font-mono p-2 rounded-md ${isLowTime ? 'text-destructive bg-destructive/10 font-bold animate-pulse' : 'text-primary'}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
        <Progress value={progressPercentage} className={`h-2 ${isLowTime ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-secondary/50 shadow-md">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Question Paper</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <iframe 
                src={`${exam.questionPdfUrl}#toolbar=0`} 
                className="w-full h-[600px] border-0" 
                title="Question Paper"
              />
            </CardContent>
          </Card>

          <Card className="border-secondary/50 shadow-md h-fit">
            <CardHeader className="py-4">
              <CardTitle className="text-lg text-primary">Submit Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Write your answers clearly on paper. Scan or take photos of your answers and convert them into a <b>single PDF file</b> to upload here.
              </p>
              
              <div className="border-2 border-dashed border-input rounded-xl p-6 flex flex-col items-center justify-center text-center bg-secondary/5 hover:bg-secondary/10 transition-colors">
                {essayPdfFile ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                    <span className="font-bold text-sm mb-1">{essayPdfFile.name}</span>
                    <span className="text-xs text-muted-foreground mb-4">{(essayPdfFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <Button variant="outline" size="sm" onClick={() => setEssayPdfFile(null)}>Change File</Button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center w-full">
                    <Send className="w-8 h-8 text-primary mb-3" />
                    <span className="font-bold text-sm mb-1">Select Answer PDF</span>
                    <span className="text-xs text-muted-foreground">No file size limit</span>
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEssayPdfFile(e.target.files[0]);
                        }
                      }} 
                    />
                  </label>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-6 px-6">
              <Button 
                onClick={handleSubmit} 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12"
                disabled={isSubmitting || !essayPdfFile}
              >
                {isSubmitting || essayUploading ? "Submitting..." : "Submit Exam"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="flex items-center justify-center text-sm text-muted-foreground gap-2 pt-4">
          <AlertTriangle className="w-4 h-4 text-primary" />
          Exam will auto-submit when the timer reaches 00:00. Ensure your PDF is uploaded before time runs out.
        </div>
      </div>
    );
  }

  const q = questions[currentQuestion];
  
  if (!q) {
    return <div className="p-8 text-center text-destructive">Error: Exam questions not found or corrupted. Please contact an admin.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-secondary/20 p-4 rounded-xl border border-secondary/50">
        <div>
          <h2 className="text-xl font-bold">{examData.title}</h2>
          <p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</p>
        </div>
        <div className={`flex items-center gap-2 text-xl font-mono p-2 rounded-md ${isLowTime ? 'text-destructive bg-destructive/10 font-bold animate-pulse' : 'text-primary'}`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>
      <Progress value={progressPercentage} className={`h-2 ${isLowTime ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />

      <Card className="border-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">{q.text}</CardTitle>
          {q.image && (
            <div className="mt-4 rounded-lg overflow-hidden border border-secondary/20">
              <img src={q.image} alt="Question Diagram" className="max-w-full h-auto max-h-[300px] mx-auto" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <RadioGroup value={answers[currentQuestion] || ""} onValueChange={handleSelect} className="space-y-3">
            {q.options.map((opt: any) => (
              <div key={opt.id} className="flex items-center space-x-3 bg-secondary/5 p-4 rounded-lg border border-transparent hover:border-secondary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
                <Label htmlFor={`opt-${opt.id}`} className="flex-1 cursor-pointer text-base">
                  {opt.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))} disabled={currentQuestion === 0}>
            Previous
          </Button>
          
          {currentQuestion === questions.length - 1 ? (
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2">
              <Send className="w-4 h-4" /> Submit Exam
            </Button>
          ) : (
            <Button onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}>
              Next Question
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <div className="flex items-center justify-center text-sm text-muted-foreground gap-2 pt-4">
        <AlertTriangle className="w-4 h-4 text-primary" />
        Exam will auto-submit when the timer reaches 00:00.
      </div>
    </div>
  );
}

