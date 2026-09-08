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

  // Check initial browser permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserEnabled(Notification.permission === "granted");
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
      toast.success("Browser notifications enabled!");
    } else {
      toast.error("Browser notifications denied.");
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const isAdmin = user.role === "admin";
    const targetValue = isAdmin ? "admin" : "all_students";
    
    // Build query: Get global notifications or user-specific ones
    // We will do a single query for now: target == userRoleOrID
    const q = query(
      collection(db, "notifications"),
      where("target", "in", [targetValue, user.uid]),
      orderBy("timestamp", "desc"),
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

      setNotifications(fetched);

      // Trigger browser notifications for newly arrived docs
      if (newNotifs.length > 0 && browserEnabled && typeof window !== "undefined" && "Notification" in window) {
        newNotifs.forEach((n) => {
          new Notification(n.title, {
            body: n.message,
            icon: "/icon.png", // Assuming there is an icon.png in public folder
          });
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
