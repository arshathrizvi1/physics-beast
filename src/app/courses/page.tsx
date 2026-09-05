"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlayCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 3000)
        );

        const querySnapshot = await Promise.race([
          getDocs(collection(db, "courses")),
          timeoutPromise
        ]);
        
        let fetchedCourses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as any
        }));
        
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-3xl font-bold">Course Explorer</h1>
        <p className="text-muted-foreground mt-2">Browse all available physics courses and start learning today.</p>
      </div>

      {dbError ? (
        <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Connection Error</h2>
          <p className="text-red-400">Could not fetch courses. The database daily quota might be exceeded.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center p-12 text-muted-foreground animate-pulse">Loading live courses...</div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-secondary/10 rounded-xl border border-secondary/30">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold">No Courses Available</h3>
          <p className="text-muted-foreground mt-2">The admin hasn't published any courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden border-secondary/50 bg-card hover:border-primary/50 transition-colors flex flex-col h-full">
              <div className="aspect-video relative overflow-hidden bg-secondary/20 flex items-center justify-center border-b border-secondary/30">
                {course.image || course.thumbnailUrl ? (
                  <img 
                    src={course.image || course.thumbnailUrl} 
                    alt={course.name || course.title}
                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <BookOpen className="w-16 h-16 text-primary/30" />
                )}
              </div>
              <CardHeader className="flex-grow">
                <CardTitle>{course.name || course.title}</CardTitle>
                <CardDescription>{course.description || "A comprehensive Physics Beast learning path."}</CardDescription>
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
