"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc, arrayUnion } from "firebase/firestore";
import toast from "react-hot-toast";

export interface AppNotification {
  id: string;
  target: "admin" | "all_students" | string; // target audience
  title: string;
  message: string;
  link?: string;
  timestamp: number;
  readBy: string[]; // array of userIds who have read it
  type?: "technical" | "exam" | "course" | "contact_us" | "general";
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  browserEnabled: boolean;
  requestBrowserPermission: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  browserEnabled: false,
  requestBrowserPermission: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Check initial browser permission and register Service Worker for Android
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setBrowserEnabled(Notification.permission === "granted");
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.log("Service Worker registration:", err);
        });
      }
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Your browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserEnabled(permission === "granted");
    if (permission === "granted") {
      toast.success("Notifications enabled!");
      // Ensure service worker is ready
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    } else {
      toast.error("Notifications denied.");
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const isAdmin = user.role === "admin";
    const targetValue = isAdmin ? "admin" : "all_students";
    
    // Query by target without orderBy to avoid requiring a composite index in Firestore Console
    const q = query(
      collection(db, "notifications"),
      where("target", "in", [targetValue, user.uid]),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: AppNotification[] = [];
      const newNotifs: AppNotification[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<AppNotification, "id">;
        const notif = { id: docSnap.id, ...data };
        
        // Ensure readBy exists
        if (!notif.readBy) notif.readBy = [];

        fetched.push(notif);

        // Check if this is a NEW unread notification that we haven't seen in this session
        if (!seenIdsRef.current.has(notif.id) && !notif.readBy.includes(user.uid)) {
          seenIdsRef.current.add(notif.id);
          // Only fire web notification if it's actually new (within last 5 minutes) to avoid spam on initial load
          if (Date.now() - notif.timestamp < 5 * 60 * 1000) {
            newNotifs.push(notif);
          }
        } else {
          seenIdsRef.current.add(notif.id);
        }
      });

      // Sort client-side by timestamp descending
      fetched.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setNotifications(fetched);

      // Trigger notifications: works on Android via ServiceWorker, desktop via ServiceWorker or Notification API
      if (newNotifs.length > 0 && browserEnabled && typeof window !== "undefined") {
        newNotifs.forEach(async (n) => {
          try {
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.ready;
              reg.showNotification(n.title, {
                body: n.message,
                icon: "/logo.jpg",
                badge: "/logo.jpg",
                data: { link: n.link || "/" }
              } as NotificationOptions);
            } else if ("Notification" in window) {
              new Notification(n.title, {
                body: n.message,
                icon: "/logo.jpg",
              });
            }
          } catch (e) {
            console.error("Error firing notification:", e);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [user, browserEnabled]);

  const unreadCount = notifications.filter(n => !n.readBy?.includes(user?.uid || "")).length;

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      const notifRef = doc(db, "notifications", id);
      await updateDoc(notifRef, {
        readBy: arrayUnion(user.uid)
      });
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, readBy: [...n.readBy, user.uid] } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const unread = notifications.filter(n => !n.readBy?.includes(user.uid));
      await Promise.all(
        unread.map(n => updateDoc(doc(db, "notifications", n.id), { readBy: arrayUnion(user.uid) }))
      );
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, readBy: [...(n.readBy || []), user.uid] })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, browserEnabled, requestBrowserPermission, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
