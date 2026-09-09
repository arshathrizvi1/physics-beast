"use client";

import { useEffect } from "react";

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanup = async () => {
      try {
        // 1. Unregister all service workers to destroy old PWA shells
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            // Unregister everything just in case, NotificationProvider will re-register the correct one
            await registration.unregister();
            console.log("Unregistered service worker:", registration.scope);
          }
        }

        // 2. Clear Cache Storage API (which stores old JS chunks/HTML)
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          for (let cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log("Deleted old cache:", cacheName);
          }
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };

    // Run once on mount
    cleanup();
  }, []);

  return null;
}
