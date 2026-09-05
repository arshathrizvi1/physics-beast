"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { Lock, FileQuestion, Clock, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";

export default function ExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Keep 'now' updated every second for active state changes
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
      setLoading(false);
    });

    const fetchResults = async () => {
      try {
        const q = query(collection(db, 'examResults'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const ids = new Set<string>();
        snap.forEach(d => ids.add(d.data().examId));
        setCompletedExamIds(ids);
      } catch (err) {
        console.log("Could not fetch exam results, quota exceeded?");
      }
    };

    fetchResults();

    return () => unsubExams();
  }, [user]);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Available Exams</h1>
        <p className="text-muted-foreground mt-2">Test your knowledge with these interactive MCQ exams.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.length === 0 && (
          <div className="col-span-full p-8 text-center border rounded-lg bg-secondary/5 text-muted-foreground">
            No exams are currently available. Check back later!
          </div>
        )}
        
        {exams.map((exam) => {
          const isCompleted = completedExamIds.has(exam.id);
          const hasStart = !!exam.startTime;
          const hasEnd = !!exam.endTime;
          const isUpcoming = hasStart && now < exam.startTime;
          const isEnded = hasEnd && now > exam.endTime;
          const isActive = (!hasStart || now >= exam.startTime) && (!hasEnd || now <= exam.endTime);

          return (
            <Card key={exam.id} className={`flex flex-col ${isEnded ? 'opacity-80 grayscale-[0.2]' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <FileQuestion className="w-5 h-5 text-primary" />
                  </div>
                  {isCompleted ? (
                    <span className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Submitted
                    </span>
                  ) : isActive ? (
                    <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Active Now
                    </span>
                  ) : isUpcoming ? (
                    <span className="bg-secondary/20 text-muted-foreground text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Upcoming
                    </span>
                  ) : isEnded ? (
                    <span className="bg-destructive/10 text-destructive text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Ended
                    </span>
                  ) : null}
                </div>
                <CardTitle>{exam.title}</CardTitle>
                <CardDescription>{exam.course}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{Array.isArray(exam.questions) ? exam.questions.length : exam.questions} Questions</span>
                  <span>{exam.duration}</span>
                </div>
                
                {hasStart || hasEnd ? (
                  <div className="bg-secondary/10 p-3 rounded-md text-xs space-y-1">
                    {hasStart && <div className="text-muted-foreground">Starts: <span className="font-medium text-foreground">{new Date(exam.startTime).toLocaleString()}</span></div>}
                    {hasEnd && <div className="text-muted-foreground">Ends: <span className="font-medium text-foreground">{new Date(exam.endTime).toLocaleString()}</span></div>}
                  </div>
                ) : null}
              </CardContent>
              <CardFooter>
                {isCompleted ? (
                  isEnded || !hasEnd ? (
                    <Link href={`/exam/${exam.id}/results`} className={buttonVariants({ variant: "outline", className: "w-full border-primary/50 text-primary" })}>
                      View Results
                    </Link>
                  ) : (
                    <Button disabled variant="outline" className="w-full">
                      Results pending (Exam still active)
                    </Button>
                  )
                ) : isActive ? (
                  <Link href={`/exam/${exam.id}`} className={buttonVariants({ className: "w-full" })}>
                    Start Exam
                  </Link>
                ) : isUpcoming ? (
                  <Button disabled className="w-full">
                    Opens soon
                  </Button>
                ) : isEnded ? (
                  <Button disabled variant="secondary" className="w-full">
                    Exam Closed
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
