"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlayCircle, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 3000)
        );

        const [querySnapshot, teachersSnap] = await Promise.race([
          Promise.all([
            getDocs(collection(db, "courses")),
            getDocs(query(collection(db, "users"), where("role", "in", ["teacher", "admin"])))
          ]),
          timeoutPromise
        ]);
        
        let fetchedCourses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as any
        }));

        const fetchedTeachers = teachersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as any
        }));
        setTeachers(fetchedTeachers);
        
        if (user && user.role === 'student') {
          const batchesSnap = await Promise.race([
            getDocs(collection(db, "batches")),
            timeoutPromise
          ]);
          const batchesMap: Record<string, string> = {};
          batchesSnap.forEach(doc => {
            batchesMap[doc.id] = doc.data().year;
          });

          fetchedCourses = fetchedCourses.filter(c => {
            if (c.batchId === 'all') return true;
            return batchesMap[c.batchId] === user.graduationYear;
          });
        }

        setCourses(fetchedCourses);
      } catch (error: any) {
        if (error.message === "FIRESTORE_TIMEOUT") {
          console.log("Database timeout - likely quota exceeded.");
          setDbError(true);
        } else {
          console.error("Error fetching courses:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  const displayedCourses = courses.filter(c => {
    if (selectedTeacherId === 'all') return true;
    return c.teacherId === selectedTeacherId;
  });

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Course Explorer</h1>
        <p className="text-muted-foreground mt-2">Browse all available physics courses and start learning today.</p>
      </div>

      {/* TEACHER SELECTION / FILTER BEFORE COURSES */}
      {teachers.length > 0 && !loading && !dbError && (
        <div className="p-5 rounded-2xl border border-secondary/30 bg-secondary/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                <GraduationCap className="w-5 h-5 text-primary" /> Browse Courses by Teacher
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a teacher to explore the specific courses and subjects they teach.
              </p>
            </div>
            {selectedTeacherId !== "all" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTeacherId("all")} 
                className="text-xs text-primary h-7 px-2"
              >
                Show All Courses ({courses.length})
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              onClick={() => setSelectedTeacherId("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                selectedTeacherId === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                  : "bg-background/80 hover:bg-secondary/40 border-secondary/40 text-foreground"
              }`}
            >
              <span>All Teachers</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedTeacherId === "all" ? "bg-black/20 text-white" : "bg-secondary text-muted-foreground"}`}>
                {courses.length}
              </span>
            </button>

            {teachers.map(teacher => {
              const teacherCourseCount = courses.filter(c => c.teacherId === teacher.id).length;
              const isSelected = selectedTeacherId === teacher.id;
              return (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "bg-background/80 hover:bg-secondary/40 border-secondary/40 text-foreground"
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {teacher.name?.charAt(0) || teacher.email?.charAt(0).toUpperCase()}
                  </span>
                  <div className="text-left">
                    <p className="leading-none">{teacher.name || teacher.email?.split('@')[0]}</p>
                    {teacher.subject && (
                      <p className={`text-[10px] font-normal mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {teacher.subject}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-black/20 text-white" : "bg-secondary text-muted-foreground"}`}>
                    {teacherCourseCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {dbError ? (
        <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Connection Error</h2>
          <p className="text-red-400">Could not fetch courses. The database daily quota might be exceeded.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center p-12 text-muted-foreground animate-pulse">Loading live courses...</div>
      ) : displayedCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-secondary/10 rounded-xl border border-secondary/30">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold">No Courses Available</h3>
          <p className="text-muted-foreground mt-2">
            {selectedTeacherId !== "all" 
              ? `No courses found taught by ${selectedTeacher?.name || 'this teacher'}.` 
              : "The admin hasn't published any courses yet."}
          </p>
          {selectedTeacherId !== "all" && (
            <Button variant="outline" size="sm" onClick={() => setSelectedTeacherId("all")} className="mt-4">
              View All Courses
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden border-secondary/50 bg-card hover:border-primary/50 transition-colors flex flex-col h-full group">
              <div className="aspect-video relative overflow-hidden bg-secondary/20 flex items-center justify-center border-b border-secondary/30">
                {course.image || course.thumbnailUrl ? (
                  <img 
                    src={course.image || course.thumbnailUrl} 
                    alt={course.name || course.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <BookOpen className="w-16 h-16 text-primary/30" />
                )}
                {/* Teacher Badge overlay on card */}
                {course.teacherName && (
                  <div 
                    onClick={(e) => {
                      e.preventDefault();
                      if (course.teacherId) setSelectedTeacherId(course.teacherId);
                    }}
                    className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-medium text-white flex items-center gap-1.5 shadow cursor-pointer hover:border-primary/50 transition-colors"
                    title={`Click to filter by ${course.teacherName}`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    <span>{course.teacherName}</span>
                    {course.teacherSubject && (
                      <span className="text-primary text-[10px] font-bold">• {course.teacherSubject}</span>
                    )}
                  </div>
                )}
              </div>
              <CardHeader className="flex-grow">
                <CardTitle>{course.name || course.title}</CardTitle>
                {course.teacherName && (
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Instructor: {course.teacherName}</span>
                    {course.teacherSubject && <span className="text-muted-foreground">({course.teacherSubject})</span>}
                  </div>
                )}
                <CardDescription className="mt-1">{course.description || "A comprehensive Physics Beast learning path."}</CardDescription>
              </CardHeader>
              <CardFooter className="bg-secondary/5 border-t border-secondary/20 p-4 mt-auto">
                <Link href={`/course/${course.id}`} className={buttonVariants({ variant: "default", className: "w-full" })}>
                  <PlayCircle className="w-4 h-4 mr-2" /> Start Learning
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
