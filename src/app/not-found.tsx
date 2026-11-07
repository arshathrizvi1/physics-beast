"use client";

import Link from "next/link";
import { Home, Compass, GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center w-full">
      <div className="w-20 h-20 bg-[var(--gold)]/10 border border-[var(--gold)]/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-[var(--gold)]/10">
        <Compass className="w-10 h-10 text-[var(--gold)] animate-spin-slow" />
      </div>

      <h1 className="text-5xl font-black text-white tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-bold text-[var(--gold)] mb-3">Page Not Found</h2>

      <p className="text-muted-foreground mb-8 max-w-md text-sm leading-relaxed">
        The page you are looking for doesn't exist, has been removed, or was redirected.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/"
          className={buttonVariants({ variant: "default", size: "lg", className: "font-bold px-8 flex items-center gap-2" })}
        >
          <Home className="w-4 h-4" />
          Return to Home
        </Link>
        <Link
          href="/courses"
          className={buttonVariants({ variant: "outline", size: "lg", className: "font-semibold px-8 flex items-center gap-2" })}
        >
          <GraduationCap className="w-4 h-4" />
          Browse Courses
        </Link>
      </div>
    </div>
  );
}
