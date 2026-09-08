"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

export function AndroidBackButtonHandler() {
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isCapacitor = (window as any).Capacitor && (window as any).Capacitor.isNativePlatform();
    if (!isCapacitor) return;

    let unsub: any;

    import("@capacitor/app").then(async ({ App }) => {
      // Hide status bar to make it fully immersive
      try {
        const { StatusBar } = await import("@capacitor/status-bar");
        await StatusBar.hide();
      } catch (err) {
        console.error("Failed to hide status bar", err);
      }

      unsub = await App.addListener("backButton", (event) => {
        // If can Go Back in browser history and not on homepage, go back
        if (window.location.pathname !== "/" && window.location.pathname !== "/login") {
          window.history.back();
        } else {
          // Double back press logic to exit app
          const now = Date.now();
          if (now - lastBackPressRef.current < 2000) {
            App.exitApp();
          } else {
            lastBackPressRef.current = now;
            toast("Press back again to exit app", {
              icon: "📱",
              duration: 2000,
              style: {
                background: "#18181b",
                color: "#ffffff",
                border: "1px solid #27272a"
              }
            });
          }
        }
      });
    });

    return () => {
      if (unsub && typeof unsub.remove === "function") {
        unsub.remove();
      }
    };
  }, []);

  return null;
}
