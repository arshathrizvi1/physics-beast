"use client";

import { useEffect, useState, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit as fsLimit } from "firebase/firestore";
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

  // Initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingComplete(true);
    }, 2000); // 2 second intro
    return () => clearTimeout(timer);
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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0a]"
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
              <h1 className="text-4xl font-bold tracking-wider text-white">BRILLIANT <span className="text-[#d4af37]">ACADEMY</span></h1>
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

      <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-[#d4af37] selection:text-black overflow-hidden relative -mt-16 pt-16">
        
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
            <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1]">
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
              className="text-lg lg:text-xl text-zinc-400 max-w-xl"
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
              <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-full p-2 pl-6 shadow-2xl">
                <Search className="w-5 h-5 text-zinc-500 mr-3" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search courses, videos..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-600"
                />
                <Button className="rounded-full bg-[#d4af37] hover:bg-[#b5952f] text-black font-semibold px-8 h-12 shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all hover:shadow-[0_0_25px_rgba(212,175,55,0.6)]">
                  Search
                </Button>
              </div>
              {/* Search Dropdown Results */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-[#1a1a1a] border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl z-50">
                  {searchResults.map((r, i) => (
                    <Link key={i} href={`/course/${r.id}`} onClick={() => { setSearchQuery(""); setShowSearch(false); }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0">
                      {r.type === 'video' ? <PlayCircle className="w-4 h-4 text-[#d4af37] shrink-0" /> : <BookOpen className="w-4 h-4 text-[#d4af37] shrink-0" />}
                      <div className="overflow-hidden">
                        <div className="text-white text-sm font-medium truncate">{r.title}</div>
                        <div className="text-zinc-500 text-xs truncate">{r.subtitle}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {showSearch && searchResults.length === 0 && searchQuery.trim() && (
                <div className="absolute top-full mt-2 w-full bg-[#1a1a1a] border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl z-50">
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
              <span className="font-semibold text-zinc-400">Popular:</span>
              {courses.slice(0, 5).map(c => (
                <Link key={c.id} href={`/course/${c.id}`} className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-[#d4af37]/50 hover:text-[#d4af37] cursor-pointer transition-colors">
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
              className="relative w-full max-w-[500px] mx-auto aspect-square rounded-[2rem] overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black shadow-2xl"
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
                className="absolute bottom-8 right-[-20px] bg-[#111] border border-[#d4af37]/30 p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-[#d4af37]/20 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Quality Education</p>
                  <p className="text-zinc-400 text-xs">For a Brighter Tomorrow</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* 7. Feature Cards Animation (Scroll Reveal) */}
        <section className="border-y border-zinc-900 bg-[#0c0c0c] relative z-10">
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
                  <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-[#d4af37]/50 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all">
                    <feature.icon className="w-6 h-6 text-[#d4af37]" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">{feature.title}</h3>
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
                className="flex flex-col items-center justify-center text-center p-8 bg-[#111] rounded-3xl border border-zinc-900 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <stat.icon className="w-8 h-8 text-[#d4af37] mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="text-4xl font-bold text-white mb-2">
                  <Counter end={stat.num} suffix={stat.suffix} duration={2} />
                </h3>
                <p className="text-zinc-500 text-sm uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Popular Courses Section */}
        <section className="bg-[#0c0c0c] py-24 relative z-10 border-t border-zinc-900">
          <div className="container mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-between items-end mb-12"
            >
              <div>
                <h2 className="text-4xl font-bold text-white mb-4">Popular Courses</h2>
                <p className="text-zinc-400">Explore our most in-demand courses and start learning today.</p>
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
                    <Card className="bg-[#111] border-zinc-800 hover:border-[#d4af37] hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)] hover:-translate-y-2 transition-all duration-300 overflow-hidden h-full flex flex-col">
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
                        <CardTitle className="text-xl font-bold text-white group-hover:text-[#d4af37] transition-colors">{course.name}</CardTitle>
                        {course.description && (
                          <CardDescription className="text-zinc-400 line-clamp-2 mt-2">
                            {course.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardFooter className="p-5 pt-4 flex justify-between items-center text-sm border-t border-zinc-800/50 mt-4">
                        <div className="flex items-center gap-2 text-zinc-400">
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
                  <Card key={i} className="bg-[#111] border-zinc-800 h-[320px] animate-pulse">
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
            <div className="flex flex-col lg:flex-row items-center gap-16 bg-[#111] border border-zinc-800 rounded-[2.5rem] p-8 lg:p-16">
              
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="flex-1 space-y-8"
              >
                <h2 className="text-4xl lg:text-5xl font-bold text-white">
                  Why Choose <span className="text-[#d4af37]">Brilliant Academy?</span>
                </h2>
                <p className="text-lg text-zinc-400">
                  We are committed to providing high-quality education, practical skills, and real opportunities to help you achieve your goals. Our instructors are industry veterans dedicated to your success.
                </p>
                <ul className="space-y-4">
                  {["Industry-Relevant Courses", "Learn from Anywhere", "Join a Supportive Community", "Build Your Career Today"].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-zinc-300 font-medium">
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
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 aspect-video">
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
