"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, LogOut, LayoutDashboard, Menu, GraduationCap,
  ChevronDown, User
} from "lucide-react";

const NAV_LINKS = [
  { href: "/courses",     label: "Courses"     },
  { href: "/exams",       label: "Exams"       },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/live",        label: "Live"        },
  { href: "/about",       label: "About"       },
];

export default function PremiumNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Live class indicator
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    const q = query(collection(db, "live_classes"), where("status", "==", "live"));
    const unsub = onSnapshot(q, (snap) => setIsLive(!snap.empty), () => {});
    return () => unsub();
  }, []);

  // Navbar entrance
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  // Mouse-tracking glow
  const navRef = useRef<HTMLElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    setGlowPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const isAdmin   = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  return (
    <>
      {/* ───────────────── NAVBAR ───────────────── */}
      <motion.header
        ref={navRef}
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0, y: -30, scale: 0.97, filter: "blur(10px)" }}
        animate={mounted ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : {}}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 w-full"
        style={{ perspective: "1000px" }}
      >
        {/* Gold border glow line top */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={mounted ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 1.2 }}
          style={{ background: "linear-gradient(90deg, transparent, #d4af37, #f9e596, #d4af37, transparent)" }}
        />

        {/* Glass panel */}
        <div
          className="relative overflow-hidden"
          style={{
            background: "rgba(8,8,8,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(212,175,55,0.12)",
          }}
        >
          {/* Mouse-tracking glow */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              background: `radial-gradient(400px circle at ${glowPos.x}% ${glowPos.y}%, rgba(212,175,55,0.06), transparent 60%)`,
            }}
          />

          {/* Slow-moving liquid shine strip */}
          <motion.div
            className="absolute top-0 bottom-0 w-40 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.04), transparent)" }}
            animate={{ x: ["-160px", "calc(100vw + 160px)"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
          />

          <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between gap-4 relative z-10">

            {/* ── LOGO ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={mounted ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href="/" className="flex items-center gap-3 shrink-0 group">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-[#d4af37]/30 shadow-[0_0_15px_rgba(212,175,55,0.15)] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] group-hover:border-[#d4af37]/60 transition-all duration-500">
                    <Image src="/logo.jpg" alt="Brilliant Academy" width={44} height={44} className="object-cover w-full h-full" priority />
                  </div>
                  {/* shine sweep visible on hover */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.4) 0%, transparent 60%)" }}
                  />
                </div>
                <div className="hidden sm:flex flex-col uppercase leading-none justify-center">
                  {/* Gold shine sweep on BRILLIANT text (hover only) */}
                  <div className="relative overflow-hidden">
                    <span className="font-bold text-[18px] tracking-widest font-serif text-[#d4af37]">Brilliant</span>
                    <div
                      className="absolute inset-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out"
                      style={{ background: "linear-gradient(90deg, transparent 0%, rgba(249,229,150,0.6) 50%, transparent 100%)" }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[11px] tracking-[0.22em] font-sans">Academy</span>
                </div>
              </Link>
            </motion.div>

            {/* ── DESKTOP NAV ── */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link, i) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={mounted ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link href={link.href} className="relative px-3 py-2 text-sm font-semibold group flex flex-col items-center gap-0.5">
                      <span className={`transition-colors duration-200 flex items-center gap-1.5 ${active ? "text-[#d4af37]" : "text-muted-foreground group-hover:text-foreground"}`}>
                        {link.label}
                        {link.label === "Live" && isLive && (
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                        )}
                      </span>
                      {/* animated gold underline */}
                      <motion.span
                        className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#d4af37] origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: active ? 1 : 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      />
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#d4af37]/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* ── RIGHT SIDE ── */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Teacher / Admin dashboard glowing button */}
              <AnimatePresence>
                {(isTeacher || isAdmin) && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden hidden md:block"
                  >
                    <Link href="/admin" className="relative group flex items-center rounded-full p-[1px] overflow-hidden bg-[#d4af37]/20">
                      {/* moving gold border glow - visible only on hover */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] aspect-square bg-[conic-gradient(from_0deg,transparent_0_300deg,#f9e596_330deg,#d4af37_360deg)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-[spin_3s_linear_infinite]" />
                      <div className="relative flex items-center gap-2 bg-background text-[#d4af37] text-xs font-bold px-4 py-2 rounded-full transition-all whitespace-nowrap w-full h-full">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        {isAdmin ? "Admin Dashboard" : "Teacher Dashboard"}
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              <motion.div
                className="hidden md:flex items-center"
                animate={{ width: searchOpen ? 220 : 36 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {searchOpen ? (
                  <div className="flex items-center w-full bg-card border border-[#d4af37]/30 rounded-full px-3 py-1.5 gap-2">
                    <Search className="w-4 h-4 text-[#d4af37] shrink-0" />
                    <input
                      ref={searchRef}
                      value={searchVal}
                      onChange={e => setSearchVal(e.target.value)}
                      placeholder="Search..."
                      className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-zinc-600"
                    />
                    <button onClick={() => { setSearchOpen(false); setSearchVal(""); }}>
                      <X className="w-4 h-4 text-zinc-500 hover:text-foreground transition-colors" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border hover:border-[#d4af37]/40 hover:bg-secondary transition-all group"
                  >
                    <Search className="w-4 h-4 text-muted-foreground group-hover:text-[#d4af37] transition-colors" />
                  </button>
                )}
              </motion.div>

              {/* User or Login */}
              {user ? (
                <div className="flex items-center gap-2">
                  <Link href={(user.role === 'admin' || user.role === 'teacher') ? "/admin#myprofile" : "/login"}>
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="w-9 h-9 rounded-full border-2 border-[#d4af37]/40 overflow-hidden bg-secondary flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:border-[#d4af37]/70 transition-all cursor-pointer shrink-0"
                    >
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#d4af37] font-bold text-sm">
                          {(user.name || user.email || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </motion.div>
                  </Link>
                  {/* Logout */}
                  <motion.button
                    onClick={logout}
                    whileHover={{ y: -2, boxShadow: "0 4px 20px rgba(212,175,55,0.25)" }}
                    whileTap={{ scale: 0.95 }}
                    className="hidden sm:flex items-center gap-1.5 bg-card border border-border hover:border-[#d4af37]/40 text-foreground/90 hover:text-foreground text-xs font-semibold px-3 py-2 rounded-full transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Logout</span>
                  </motion.button>
                </div>
              ) : (
                <Link href="/login">
                  <motion.div
                    whileHover={{ scale: 1.04, y: -1 }}
                    className="flex items-center gap-1.5 bg-[#d4af37] text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-[#c9a830] transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)]"
                  >
                    <User className="w-3.5 h-3.5" /> Login
                  </motion.div>
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border hover:border-[#d4af37]/40 transition-all"
                onClick={() => setMobileOpen(v => !v)}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {mobileOpen ? (
                    <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <X className="w-4 h-4 text-[#d4af37]" />
                    </motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Menu className="w-4 h-4 text-foreground/90" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* ── MOBILE MENU ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 top-16 z-40 flex flex-col bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-[#d4af37]/20"
            >
              <div className="flex flex-col p-6 gap-1">
                {NAV_LINKS.map((link, i) => {
                  const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.4 }}
                    >
                      <Link
                        href={link.href}
                        className={`flex items-center justify-between py-4 border-b border-border/50 text-lg font-semibold transition-colors ${active ? "text-[#d4af37]" : "text-foreground/90 hover:text-foreground"}`}
                      >
                        {link.label}
                        {active && <span className="w-2 h-2 rounded-full bg-[#d4af37]" />}
                      </Link>
                    </motion.div>
                  );
                })}

                {(isTeacher || isAdmin) && (
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="mt-4"
                  >
                    <Link href="/admin" className="flex items-center gap-3 py-3 px-5 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl text-[#d4af37] font-bold">
                      <LayoutDashboard className="w-5 h-5" />
                      {isAdmin ? "Admin Dashboard" : "Teacher Dashboard"}
                    </Link>
                  </motion.div>
                )}

                {user ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                    className="mt-6 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-[#d4af37]/40 overflow-hidden bg-secondary flex items-center justify-center">
                        {user.photoUrl ? <img src={user.photoUrl} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-[#d4af37] font-bold">{(user.name || "U").charAt(0)}</span>}
                      </div>
                      <div>
                        <p className="text-foreground font-semibold text-sm">{user.name || user.email?.split("@")[0]}</p>
                        <p className="text-zinc-500 text-xs capitalize">{user.role}</p>
                      </div>
                    </div>
                    <button onClick={logout} className="flex items-center gap-2 text-muted-foreground hover:text-red-400 transition-colors text-sm font-semibold">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-6">
                    <Link href="/login" className="flex items-center justify-center gap-2 w-full bg-[#d4af37] text-black font-bold py-3.5 rounded-xl text-base">
                      <User className="w-5 h-5" /> Login to Brilliant Academy
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}

