"use client";

import { useState, useEffect } from "react";
import { Shield, Settings, CheckCircle, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobilePermissionPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "granted" | "redirecting">("idle");
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if running inside the installed mobile APK (Capacitor native app)
    const isCapacitor = !!((window as any).Capacitor && (window as any).Capacitor.isNativePlatform());
    if (!isCapacitor) return;

    setIsMobileApp(true);

    // Check if previously dismissed in this session
    const hasPrompted = sessionStorage.getItem("mobile_perm_prompt_shown");
    if (!hasPrompted) {
      // Show the permission prompt after a brief delay so the app loads smoothly
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGrantPermission = async () => {
    setStatus("redirecting");

    try {
      // 1. Request notification permissions via Capacitor LocalNotifications
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.requestPermissions();
    } catch (err) {
      console.log("LocalNotifications error:", err);
    }

    try {
      // 2. Trigger native Android Battery Optimization / Settings redirect
      const capacitorPlugins = (window as any).Capacitor?.Plugins;
      if (capacitorPlugins?.BackgroundPermission) {
        await capacitorPlugins.BackgroundPermission.requestBatteryOptimization();
      }
    } catch (err) {
      console.log("BackgroundPermission error:", err);
    }

    setStatus("granted");
    sessionStorage.setItem("mobile_perm_prompt_shown", "true");

    setTimeout(() => {
      setIsOpen(false);
    }, 1500);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("mobile_perm_prompt_shown", "true");
    setIsOpen(false);
  };

  if (!isMobileApp || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-emerald-500/40 p-6 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-center space-y-5">
        
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Cloud Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cloud-Synced Mobile Feature</span>
        </div>

        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
          <Shield className="w-8 h-8 animate-pulse" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">
            Background Run Permission
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Allow Brilliant Academy to run in the background for live exam countdowns, assignment alerts, and study notifications.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <Button
            onClick={handleGrantPermission}
            disabled={status === "redirecting"}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {status === "redirecting" ? (
              <span>Opening Settings...</span>
            ) : status === "granted" ? (
              <>
                <CheckCircle className="w-5 h-5 text-white" />
                <span>Permission Configured!</span>
              </>
            ) : (
              <>
                <Settings className="w-5 h-5" />
                <span>Open Settings & Allow</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full text-xs text-zinc-400 hover:text-white"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
