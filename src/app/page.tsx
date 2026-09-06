"use client";

import { useEffect, useState, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit as fsLimit, where } from "firebase/firestore";
import { Lock, PlayCircle, Search, Users, MonitorPlay, Award, Code, Globe, TrendingUp, GraduationCap, ArrowRight, BookOpen, Star } from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";

// Simple counter component using Framer Motion
const Counter = ({ end, duration = 2, suffix = "" }: { end: number, duration?: number, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const endVal = end;
      if (start === endVal) return;
      
      const totalMilSecDur = duration * 1000;
      const incrementTime = 30; // 30ms per step
      const steps = totalMilSecDur / incrementTime;
      const stepValue = endVal / steps;
      
      const timer = setInterval(() => {
        start += stepValue;
        if (start >= endVal) {
          setCount(endVal);
          clearInterval(timer);
        } else {
          setCount(Math.ceil(start));
        }
      }, incrementTime);
      
      return () => clearInterval(timer);
    }
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// Word reveal animation variant
const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.2, 0.65, 0.3, 0.9] as const },
  }),
};

export default function Home() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [topReviews, setTopReviews] = useState<any[]>([]);

  // Initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingComplete(true);
    }, 2000); // 2 second intro
    return () => clearTimeout(timer);
  }, []);

  // Fetch real top reviews (4 and 5 star) for the testimonial slider
  useEffect(() => {
    const fetchTopReviews = async () => {
      try {
        // Simple query — only filter by rating to avoid needing a composite index
        const q = query(
          collection(db, "reviews"),
          where("rating", ">=", 4),
          fsLimit(30)
        );
        const snap = await getDocs(q);
        // Sort client-side: highest rating first, then newest
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .filter((r: any) => r.rating >= 4)
          .sort((a: any, b: any) => b.rating - a.rating || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 20);
        setTopReviews(data);
      } catch {
        // silently fail — no reviews yet is fine
      }
    };
    fetchTopReviews();
  }, []);

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
        setCourses(coursesData.slice(0, 8));

        // Fetch videos for search
        const videosSnap = await getDocs(query(collection(db, "videos")));
        const videosData = videosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        setAllVideos(videosData);
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    };
    fetchData();
  }, [user]);

  // Search handler
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); setShowSearch(false); return; }
    setShowSearch(true);
    const lq = q.toLowerCase();
    const matchedCourses = courses
      .filter(c => c.name?.toLowerCase().includes(lq) || c.description?.toLowerCase().includes(lq))
      .map(c => ({ type: 'course', id: c.id, title: c.name, subtitle: c.description || '' }));
    const matchedVideos = allVideos
      .filter(v => v.title?.toLowerCase().includes(lq))
      .slice(0, 6)
      .map(v => ({ type: 'video', id: v.courseId, title: v.title, subtitle: 'Video lesson' }));
    setSearchResults([...matchedCourses, ...matchedVideos].slice(0, 8));
  };

  const headingText = "Your Brighter Future Starts Here".split(" ");

  return (
    <>
      {/* 1. Initial Page Loading Animation */}
      <AnimatePresence>
        {!loadingComplete && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, filter: "brightness(0.5)" }}
              animate={{ scale: 1, opacity: 1, filter: "brightness(1.5)" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <GraduationCap className="w-20 h-20 text-[#d4af37] mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
              <h1 className="text-4xl font-bold tracking-wider text-foreground">BRILLIANT <span className="text-[#d4af37]">ACADEMY</span></h1>
              <motion.div 
                className="w-48 h-1 bg-white/20 mt-6 rounded-full overflow-hidden"
              >
                <motion.div 
                  className="h-full bg-[#d4af37]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#d4af37] selection:text-black overflow-hidden relative -mt-16 pt-16">
        
        {/* 3. Hero Background Particles */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#d4af37]/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#d4af37]/5 blur-[100px] rounded-full mix-blend-screen" />
          {/* Subtle floating stars */}
          {[
            { top: 12, left: 15, duration: 5.2 },
            { top: 45, left: 8, duration: 6.1 },
            { top: 78, left: 22, duration: 7.3 },
            { top: 23, left: 45, duration: 4.8 },
            { top: 67, left: 51, duration: 5.5 },
            { top: 89, left: 34, duration: 6.9 },
            { top: 34, left: 78, duration: 7.1 },
            { top: 18, left: 88, duration: 4.5 },
            { top: 56, left: 92, duration: 6.6 },
            { top: 92, left: 81, duration: 5.9 },
            { top: 7, left: 63, duration: 7.8 },
            { top: 51, left: 37, duration: 5.1 },
            { top: 82, left: 60, duration: 6.2 },
            { top: 33, left: 12, duration: 4.9 },
            { top: 95, left: 10, duration: 5.7 }
          ].map((p, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#d4af37]/40 rounded-full"
              style={{
                top: `${p.top}%`,
                left: `${p.left}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Hero Section */}
        <section className="relative z-10 container mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            {/* 5. Heading Text Animation */}
            <h1 className="text-5xl lg:text-7xl font-extrabold text-foreground leading-[1.1]">
              {headingText.map((word, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={wordVariants}
                  initial="hidden"
                  animate={loadingComplete ? "visible" : "hidden"}
                  className={`inline-block mr-3 ${word === "Brighter" || word === "Future" ? "text-[#d4af37] drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]" : ""}`}
                >
                  {word}
                </motion.span>
              ))}
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={loadingComplete ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-lg lg:text-xl text-muted-foreground max-w-xl"
            >
              Learn from expert instructors, gain in-demand skills, and turn your goals into real opportunities with Brilliant Academy.
            </motion.p>

            {/* 6. Search Bar Animation */}
            <motion.div
              initial={{ width: "0%", opacity: 0 }}
              animate={loadingComplete ? { width: "100%", opacity: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
              className="max-w-xl relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37]/30 to-[#d4af37]/0 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
              <div className="relative flex items-center bg-secondary border border-border rounded-full p-2 pl-6 shadow-2xl">
                <Search className="w-5 h-5 text-zinc-500 mr-3" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search courses, videos..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-zinc-600"
                />
                <Button className="rounded-full bg-[#d4af37] hover:bg-[#b5952f] text-black font-semibold px-8 h-12 shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all hover:shadow-[0_0_25px_rgba(212,175,55,0.6)]">
                  Search
                </Button>
              </div>
              <motion.div 
                className="mt-8 relative inline-block group cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-[#d4af37] via-[#f9e596] to-[#d4af37] rounded-full blur opacity-75 group-hover:opacity-100 animate-pulse transition duration-1000" />
                <Link href="/courses" className="relative flex items-center justify-center bg-black px-8 py-4 rounded-full border border-[#d4af37]/50 text-foreground font-bold tracking-wider hover:bg-zinc-900 transition-colors">
                  START LEARNING
                </Link>
              </motion.div>
              {/* Search Dropdown Results */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-secondary border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl z-50">
                  {searchResults.map((r, i) => (
                    <Link key={i} href={`/course/${r.id}`} onClick={() => { setSearchQuery(""); setShowSearch(false); }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800 transition-colors border-b border-border/50 last:border-0">
                      {r.type === 'video' ? <PlayCircle className="w-4 h-4 text-[#d4af37] shrink-0" /> : <BookOpen className="w-4 h-4 text-[#d4af37] shrink-0" />}
                      <div className="overflow-hidden">
                        <div className="text-foreground text-sm font-medium truncate">{r.title}</div>
                        <div className="text-zinc-500 text-xs truncate">{r.subtitle}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {showSearch && searchResults.length === 0 && searchQuery.trim() && (
                <div className="absolute top-full mt-2 w-full bg-secondary border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl z-50">
                  <div className="px-5 py-4 text-zinc-500 text-sm">No results found for "{searchQuery}"</div>
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={loadingComplete ? { opacity: 1 } : {}}
              transition={{ delay: 1, duration: 0.8 }}
              className="flex flex-wrap items-center gap-3 text-sm text-zinc-500"
            >
              <span className="font-semibold text-muted-foreground">Popular:</span>
              {courses.slice(0, 5).map(c => (
                <Link key={c.id} href={`/course/${c.id}`} className="px-3 py-1 rounded-full bg-zinc-900 border border-border hover:border-[#d4af37]/50 hover:text-[#d4af37] cursor-pointer transition-colors">
                  {c.name}
                </Link>
              ))}
            </motion.div>
          </div>

          {/* 4. Hero Student Image Animation */}
          <motion.div 
            className="flex-1 relative"
            initial={{ opacity: 0, x: 100 }}
            animate={loadingComplete ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
          >
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full max-w-[500px] mx-auto aspect-square rounded-[2rem] overflow-hidden border border-border bg-gradient-to-b from-zinc-900 to-black shadow-2xl"
            >
              {/* Fallback image if Unsplash fails, using generic student stock style */}
              <img 
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800" 
                alt="Student" 
                className="w-full h-full object-cover mix-blend-luminosity opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              
              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-8 right-[-20px] bg-card border border-[#d4af37]/30 p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-[#d4af37]/20 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-foreground font-bold text-sm">Quality Education</p>
                  <p className="text-muted-foreground text-xs">For a Brighter Tomorrow</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* 7. Feature Cards Animation (Scroll Reveal) */}
        <section className="border-y border-border/50 bg-[#0c0c0c] relative z-10">
          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { icon: Users, title: "Expert Instructors" },
                { icon: MonitorPlay, title: "Flexible Learning" },
                { icon: Award, title: "Certified Courses" },
                { icon: Code, title: "Practical Projects" },
                { icon: Globe, title: "Global Community" },
                { icon: TrendingUp, title: "Career Support" },
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="flex flex-col items-center text-center gap-3 p-4 rounded-2xl hover:bg-zinc-900 transition-colors group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-zinc-900 border border-border flex items-center justify-center group-hover:border-[#d4af37]/50 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all">
                    <feature.icon className="w-6 h-6 text-[#d4af37]" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground/90 group-hover:text-foreground transition-colors">{feature.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Statistics Counter Animation */}
        <section className="container mx-auto px-6 py-20 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: 2000, suffix: "+", label: "Students Learning", icon: Users },
              { num: 50, suffix: "+", label: "Online Courses", icon: BookOpen },
              { num: 30, suffix: "+", label: "Expert Instructors", icon: GraduationCap },
              { num: 4.8, suffix: "/5", label: "Average Rating", icon: Star, float: true },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl border border-border/50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <stat.icon className="w-8 h-8 text-[#d4af37] mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="text-4xl font-bold text-foreground mb-2">
                  <Counter end={stat.num} suffix={stat.suffix} duration={2} />
                </h3>
                <p className="text-zinc-500 text-sm uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Popular Courses Section */}
        <section className="bg-[#0c0c0c] py-24 relative z-10 border-t border-border/50">
          <div className="container mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-between items-end mb-12"
            >
              <div>
                <h2 className="text-4xl font-bold text-foreground mb-4">Popular Courses</h2>
                <p className="text-muted-foreground">Explore our most in-demand courses and start learning today.</p>
              </div>
              <Link href="/courses" className="text-[#d4af37] hover:text-[#b5952f] flex items-center gap-2 font-medium transition-colors">
                View All Courses <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {courses.length > 0 ? courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="group"
                >
                  <Link href={`/course/${course.id}`}>
                    <Card className="bg-card border-border hover:border-[#d4af37] hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)] hover:-translate-y-2 transition-all duration-300 overflow-hidden h-full flex flex-col">
                      <div className="relative h-48 overflow-hidden bg-zinc-900">
                        {/* 11. Course Image Hover Animation */}
                        <motion.img 
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.6 }}
                          src={course.image || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400`} 
                          alt={course.name} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                      </div>
                      <CardHeader className="p-5 pb-0 flex-1">
                        <CardTitle className="text-xl font-bold text-foreground group-hover:text-[#d4af37] transition-colors">{course.name}</CardTitle>
                        {course.description && (
                          <CardDescription className="text-muted-foreground line-clamp-2 mt-2">
                            {course.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardFooter className="p-5 pt-4 flex justify-between items-center text-sm border-t border-border/50 mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{Math.floor(Math.random() * 200 + 50)} students</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#d4af37]">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold">{(Math.random() * 0.5 + 4.5).toFixed(1)}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.div>
              )) : (
                // Skeleton placeholders if no courses fetched yet
                [...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-card border-border h-[320px] animate-pulse">
                    <div className="h-48 bg-zinc-900" />
                    <CardHeader className="p-5"><div className="h-6 bg-zinc-800 rounded w-3/4" /></CardHeader>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 13. About Section Animation */}
        <section className="py-24 relative z-10 overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16 bg-card border border-border rounded-[2.5rem] p-8 lg:p-16">
              
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="flex-1 space-y-8"
              >
                <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
                  Why Choose <span className="text-[#d4af37]">Brilliant Academy?</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  We are committed to providing high-quality education, practical skills, and real opportunities to help you achieve your goals. Our instructors are industry veterans dedicated to your success.
                </p>
                <ul className="space-y-4">
                  {["Industry-Relevant Courses", "Learn from Anywhere", "Join a Supportive Community", "Build Your Career Today"].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-foreground/90 font-medium">
                      <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/login">
                    <Button className="mt-4 bg-white text-black hover:bg-zinc-200 rounded-full px-8 h-12 font-bold shadow-xl">
                      Start Your Learning Journey <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="flex-1 relative"
              >
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border aspect-video">
                  <img 
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1000" 
                    alt="Study group" 
                    className="w-full h-full object-cover mix-blend-luminosity opacity-70"
                  />
                  <div className="absolute inset-0 bg-[#d4af37]/10 mix-blend-overlay" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-[#d4af37] rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:scale-110 transition-transform">
                      <PlayCircle className="w-8 h-8 text-black ml-1" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Student Reviews Section */}
        <section className="py-24 bg-background relative z-10 overflow-hidden">
          {/* background gold glow blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-[#d4af37]/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="container mx-auto px-6 text-center mb-14 relative z-10">
            {/* Animated gold star row */}
            <motion.div
              className="flex justify-center gap-2 mb-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {[1,2,3,4,5].map(s => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, scale: 0, rotate: -20 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + s * 0.08, duration: 0.5, type: "spring", stiffness: 300 }}
                >
                  <Star className="w-5 h-5 fill-[#d4af37] text-[#d4af37] drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                </motion.div>
              ))}
            </motion.div>

            {/* Heading fade + slide up */}
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              What Our{" "}
              <span className="relative inline-block">
                <span className="text-[#d4af37]">Students Say</span>
                {/* Animated gold underline */}
                <motion.span
                  className="absolute -bottom-1 left-0 h-[3px] rounded-full bg-gradient-to-r from-[#d4af37] via-[#f9e596] to-[#d4af37]"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
            </motion.h2>
          </div>

          {/* Slider — only if we have reviews */}
          {topReviews.length > 0 ? (
            <div className="relative w-full overflow-hidden mb-14">
              <motion.div
                className="flex gap-6 w-max pl-6"
                animate={{ x: ["0px", `-${topReviews.length * 424}px`] }}
                transition={{ duration: Math.max(topReviews.length * 5, 20), repeat: Infinity, ease: "linear" }}
              >
                {[...topReviews, ...topReviews].map((r: any, i: number) => (
                  <div key={`${r.id}-${i}`} className="w-[360px] bg-card border border-border rounded-2xl p-7 shrink-0 flex flex-col justify-between">
                    <div>
                      <div className="flex gap-0.5 mb-4">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-zinc-700"}`} />
                        ))}
                        <span className="ml-2 text-xs text-zinc-500 font-medium">{r.rating}.0</span>
                      </div>
                      <p className="text-foreground/90 italic text-sm leading-relaxed line-clamp-4">"{r.comment}"</p>
                    </div>
                    <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
                      <div className="w-9 h-9 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center font-bold text-[#d4af37] text-sm shrink-0">
                        {(r.userName || "S").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-foreground font-semibold text-sm">{r.userName || "Student"}</h4>
                        <p className="text-zinc-500 text-xs">Verified Student</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
              <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
              <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
            </div>
          ) : (
            <div className="text-center py-10 mb-10">
              <p className="text-zinc-600 text-sm italic">No reviews yet. Be the first to share your experience!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
            <Link href="/reviews">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="relative group cursor-pointer"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#d4af37] to-[#f9e596] rounded-full blur opacity-50 group-hover:opacity-80 transition duration-500" />
                <div className="relative bg-[#d4af37] text-black font-bold px-8 py-3.5 rounded-full flex items-center gap-2 text-sm tracking-wide">
                  <Star className="w-4 h-4 fill-black" />
                  Add Your Review
                </div>
              </motion.div>
            </Link>
            <Link href="/reviews">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="border border-zinc-700 hover:border-[#d4af37]/60 text-foreground/90 hover:text-foreground font-semibold px-8 py-3.5 rounded-full flex items-center gap-2 text-sm tracking-wide transition-all duration-300"
              >
                View All Reviews
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}

function CheckIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

