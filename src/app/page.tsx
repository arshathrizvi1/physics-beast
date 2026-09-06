"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { Lock, PlayCircle } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(query(collection(db, "courses")));
        let coursesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        // Filter based on user batch
        if (user && user.role === 'student') {
          const batchesSnap = await getDocs(collection(db, "batches"));
          const batchesMap: Record<string, string> = {};
          batchesSnap.forEach(doc => {
            batchesMap[doc.id] = doc.data().year;
          });

          coursesData = coursesData.filter(c => {
            if (c.batchId === 'all') return true;
            return batchesMap[c.batchId] === user.graduationYear;
          });
        }

        setCourses(coursesData);

        const foldersSnap = await getDocs(query(collection(db, "folders")));
        let foldersData = foldersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        // Only keep folders for the filtered courses
        foldersData = foldersData.filter(f => coursesData.some(c => c.id === f.courseId));
        setFolders(foldersData);
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    };
    fetchData();
  }, [user]);

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero Section */}
      <section className="pt-20 pb-10 text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">
          Master Physics with <span className="text-primary text-glow">Physics Beast</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-[600px] mx-auto">
          Sri Lanka&apos;s most advanced online physics learning platform. Watch high-quality video lectures, track your progress, and dominate your exams.
        </p>
        <div className="flex gap-4 justify-center">
          {!user ? (
            <>
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Login to Portal
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Register Now
              </Link>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Go to Dashboard
            </Link>
          )}
        </div>
      </section>

      {/* Featured Topics Animated Preview */}
      {!user && (
        <section className="container mx-auto px-4 overflow-hidden py-10">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideUpFade {
              0% { opacity: 0; transform: translateY(60px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .topic-card {
              opacity: 0;
              animation: slideUpFade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}} />
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Explore Core Topics</h2>
            <p className="text-muted-foreground">Dive deep into our comprehensive physics curriculum</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: "Mechanics", img: "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?auto=format&fit=crop&q=80&w=800", delay: "0.1s" },
              { name: "Electricity", img: "https://images.unsplash.com/photo-1549216390-1c6fc79a83ab?auto=format&fit=crop&q=80&w=800", delay: "0.2s" },
              { name: "Electronics", img: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=800", delay: "0.3s" },
              { name: "Properties of Matter", img: "https://images.unsplash.com/photo-1603126857599-f6e1570d815b?auto=format&fit=crop&q=80&w=800", delay: "0.4s" },
              { name: "Waves & Oscillations", img: "https://images.unsplash.com/photo-1522069213448-443a614da9b6?auto=format&fit=crop&q=80&w=800", delay: "0.5s" },
            ].map((topic) => (
              <div 
                key={topic.name} 
                className="topic-card group relative aspect-[4/5] rounded-xl overflow-hidden shadow-lg border border-primary/20 bg-black"
                style={{ animationDelay: topic.delay }}
              >
                <img 
                  src={topic.img} 
                  alt={topic.name} 
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700 ease-in-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-lg font-bold text-white leading-tight">{topic.name}</h3>
                  <div className="w-8 h-1 bg-primary mt-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Courses Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Available Courses</h2>
        </div>
        
        {courses.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground border border-dashed rounded-lg">
            No courses available at the moment. Check back later!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              // Determine if user has access to ANY folder in this course, OR legacy course access
              const courseFolders = folders.filter(f => f.courseId === course.id);
              const hasFolderAccess = courseFolders.some(f => {
                const expiration = user?.folderAccess?.[f.id];
                return expiration && expiration > Date.now();
              });
              const legacyCourseAccess = user?.accessibleCourses && user.accessibleCourses.includes(course.id);
              const hasAccess = user?.role === 'admin' || user?.role === 'teacher' || legacyCourseAccess || hasFolderAccess;
              
              return (
                <Card key={course.id} className="overflow-hidden border-secondary/50 bg-card transition-colors flex flex-col hover:border-primary/50">
                  <div className="aspect-video relative overflow-hidden bg-secondary/20 flex items-center justify-center group">
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center transition-all group-hover:bg-primary/20">
                      <PlayCircle className="w-16 h-16 text-primary/50 group-hover:scale-110 transition-transform" />
                    </div>
                    {course.thumbnailUrl && (
                      <img src={course.thumbnailUrl} alt={course.title} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay" />
                    )}
                  </div>
                  <CardHeader className="flex-none">
                    <CardTitle className="text-xl">{course.name}</CardTitle>
                    <CardDescription>Created: {new Date(course.createdAt).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between mt-auto">
                    <Link href={`/course/${course.id}`} className={buttonVariants({ size: "sm", className: "w-full" })}>
                      {hasAccess ? "Watch Now" : "View Syllabus & Buy"}
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
