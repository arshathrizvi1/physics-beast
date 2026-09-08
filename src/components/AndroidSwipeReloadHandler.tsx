"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, ArrowDown } from "lucide-react";

export function AndroidSwipeReloadHandler() {
  const pathname = usePathname();
  const [pullDistance, setPullDistance] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [triggerType, setTriggerType] = useState<"up" | "down" | null>(null);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isPullingRef = useRef(false);
  const isReloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Do not enable reload gesture during active exams to prevent accidental data loss
    if (pathname.startsWith("/exam/") && !pathname.endsWith("/results")) {
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (isReloadingRef.current) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const target = e.target as HTMLElement | null;

      // Ignore if touching interactive form elements, video players, or range sliders
      if (target) {
        const interactive = target.closest("input, textarea, select, button, video, audio, [role='slider'], .no-swipe-reload");
        if (interactive) return;
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      // Check if at the top of the page for pull-down detection
      if (window.scrollY <= 10) {
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || isReloadingRef.current) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);

      // Pull-down visual indicator if starting from top of page and dragging downwards
      if (isPullingRef.current && deltaY > 0 && deltaY > deltaX) {
        const distance = Math.min(90, deltaY * 0.45);
        setPullDistance(distance);
      }
    };

    const triggerReload = (type: "up" | "down") => {
      if (isReloadingRef.current) return;
      isReloadingRef.current = true;
      setIsReloading(true);
      setTriggerType(type);

      // Haptic feedback on Android if supported
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([40, 30, 40]);
        }
      } catch {
        // ignore
      }

      // Short delay for visual feedback before reloading
      setTimeout(() => {
        window.location.reload();
      }, 350);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || isReloadingRef.current) {
        setPullDistance(0);
        touchStartRef.current = null;
        isPullingRef.current = false;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaY = touchStartRef.current.y - touch.clientY; // positive = swipe UP, negative = swipe DOWN
      const deltaX = touch.clientX - touchStartRef.current.x;
      const duration = Date.now() - touchStartRef.current.time;
      const absDeltaY = Math.abs(deltaY);
      const absDeltaX = Math.abs(deltaX);
      const velocityY = absDeltaY / Math.max(1, duration); // px/ms

      // Check for FAST SWIPE UP ("sweep up over fastly")
      // Conditions:
      // 1. deltaY >= 75 (moved upwards by at least 75px)
      // 2. duration <= 350ms (quick flick gesture)
      // 3. velocity >= 0.55 px/ms
      // 4. predominantly vertical: absDeltaY > absDeltaX * 1.25
      if (deltaY >= 75 && duration <= 350 && velocityY >= 0.55 && absDeltaY > absDeltaX * 1.25) {
        triggerReload("up");
        setPullDistance(0);
        touchStartRef.current = null;
        isPullingRef.current = false;
        return;
      }

      // Check for Pull-to-refresh (swiped down from the top)
      if (isPullingRef.current) {
        const pullDownDistance = -deltaY; // negative deltaY means pulled down
        if (pullDownDistance >= 60 || (pullDownDistance >= 35 && velocityY >= 0.5 && duration <= 300)) {
          triggerReload("down");
          setPullDistance(65);
          touchStartRef.current = null;
          isPullingRef.current = false;
          return;
        }
      }

      // Reset
      setPullDistance(0);
      touchStartRef.current = null;
      isPullingRef.current = false;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pathname]);

  // If not reloading and no pull distance, render nothing
  if (!isReloading && pullDistance === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center px-4">
      {/* Visual Feedback for Fast Swipe Up */}
      {isReloading && triggerType === "up" && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300 bg-zinc-900/95 border border-[#ffc107]/50 backdrop-blur-xl px-5 py-3 rounded-full shadow-[0_10px_30px_rgba(255,193,7,0.25)] flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-[#ffc107] animate-spin" />
          <span className="text-xs font-bold text-white tracking-wide">
            Fast Swipe Up &bull; <span className="text-[#ffc107]">Reloading...</span>
          </span>
        </div>
      )}

      {/* Visual Feedback for Pull-to-Refresh / Downward Swipe */}
      {(pullDistance > 0 || (isReloading && triggerType === "down")) && (
        <div
          style={{
            transform: `translateY(${isReloading ? 48 : Math.max(0, pullDistance - 10)}px)`,
            opacity: Math.min(1, pullDistance / 35),
            transition: isReloading ? "transform 0.2s ease-out" : "none",
          }}
          className="bg-zinc-900/95 border border-[#ffc107]/40 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5"
        >
          {isReloading ? (
            <>
              <RefreshCw className="w-4 h-4 text-[#ffc107] animate-spin" />
              <span className="text-xs font-semibold text-white">Reloading...</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-4 h-4 text-[#ffc107] transition-transform duration-150"
                style={{
                  transform: `rotate(${Math.min(180, (pullDistance / 60) * 180)}deg)`,
                }}
              />
              <span className="text-xs font-medium text-zinc-300">
                {pullDistance >= 60 ? "Release to reload" : "Pull to reload"}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
