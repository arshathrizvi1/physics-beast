"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, X } from "lucide-react";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 1. Don't show in native mobile apps
    if (typeof window !== "undefined") {
      const isCapacitor = !!((window as any).Capacitor && (window as any).Capacitor.isNativePlatform());
      if (isCapacitor) return;

      const consent = localStorage.getItem("ba_cookie_consent");
      if (!consent) {
        // Show after a brief delay so page loads smoothly
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleChoice = (preference: "all" | "essential") => {
    localStorage.setItem("ba_cookie_consent", preference);
    localStorage.setItem("ba_cookie_consent_date", new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-[120] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-5 text-card-foreground">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1 pr-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Cookie & Data Privacy Notice
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Brilliant Academy uses essential cookies to secure your sessions, verify DRM video access, and ensure study continuity. We never sell your personal data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChoice("essential")}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 pt-3 border-t border-border/50">
          <button
            type="button"
            onClick={() => handleChoice("all")}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={() => handleChoice("essential")}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-secondary/40 transition-all text-foreground"
          >
            Essential Only
          </button>
          <Link
            href="/cookie-policy"
            className="text-xs text-center sm:text-left text-muted-foreground hover:text-primary transition-colors py-1 sm:ml-auto"
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
