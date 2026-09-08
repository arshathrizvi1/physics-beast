"use client";

import React, { useState } from "react";
import { Bell, Check, Trash2, BellOff, BellRing, ChevronRight } from "lucide-react";
import { useNotifications } from "@/components/providers/NotificationProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

function timeAgo(timestamp: number | string | Date): string {
  if (!timestamp) return "";
  const time = new Date(timestamp).getTime();
  if (isNaN(time)) return "";
  const now = Date.now();
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, browserEnabled, toggleBrowserNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleToggle = () => setIsOpen(!isOpen);

  // Close dropdown if clicking outside (simple hack for now, could use a ref hook)
  React.useEffect(() => {
    const handleOutClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutClick);
    }
    return () => document.removeEventListener('mousedown', handleOutClick);
  }, [isOpen]);

  // Close when path changes
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="relative notification-container">
      {/* Bell Button */}
      <button 
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-white/5 transition-colors group focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
      >
        <Bell className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 border-2 border-black rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm shadow-red-500/40 animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 max-w-[380px] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 w-auto sm:w-[380px] bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[1000] animate-in slide-in-from-top-2 fade-in duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-red-500/20 text-red-500 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-[#d4af37] hover:text-white font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
              {/* Push Toggle Switch Button */}
              <button
                onClick={toggleBrowserNotifications}
                title={browserEnabled ? "Push Notifications: ON (Click to Turn Off)" : "Push Notifications: OFF (Click to Turn On)"}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  browserEnabled 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {browserEnabled ? (
                  <>
                    <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Push: ON</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Push: OFF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Browser Push Quick Enable Banner if OFF */}
          {!browserEnabled && (
            <div className="bg-[#d4af37]/10 border-b border-[#d4af37]/20 p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <BellRing className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span className="text-xs text-zinc-300 truncate">
                  Get instant PC & Mobile alerts
                </span>
              </div>
              <button 
                onClick={toggleBrowserNotifications}
                className="bg-[#d4af37] text-black hover:bg-[#b5952f] text-xs font-bold py-1 px-3 rounded-lg shrink-0 transition-colors"
              >
                Turn On
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto overscroll-contain custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-500">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3 border border-white/5">
                  <BellOff className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400">All caught up!</p>
                <p className="text-xs mt-1">No new notifications right now.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => {
                  const isRead = notif.readBy?.includes("currentUser"); // We need to check read status against user ID, but Provider returns unreadCount properly.
                  // Actually Provider has `unreadCount`. Let's assume Provider gives `notif.readBy`.
                  // Wait, we need `user.uid`. Let's import it.
                  
                  return (
                    <NotificationItem 
                      key={notif.id} 
                      notif={notif} 
                      markAsRead={markAsRead} 
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-white/5 bg-zinc-900/30 text-center">
             <span className="text-[10px] text-zinc-500 font-medium">Notification Center v1.0</span>
          </div>

        </div>
      )}
    </div>
  );
}

function NotificationItem({ notif, markAsRead }: { notif: any, markAsRead: (id: string) => void }) {
  const { user } = require('@/lib/AuthContext').useAuth();
  const isRead = notif.readBy?.includes(user?.uid);
  
  const handleClick = () => {
    if (!isRead) markAsRead(notif.id);
  };

  const getIconColor = () => {
    if (notif.type === 'technical') return 'text-amber-500 bg-amber-500/10';
    if (notif.type === 'contact_us') return 'text-blue-500 bg-blue-500/10';
    if (notif.type === 'exam') return 'text-purple-500 bg-purple-500/10';
    if (notif.type === 'course') return 'text-green-500 bg-green-500/10';
    if (notif.type === 'student_login') return 'text-cyan-400 bg-cyan-400/10';
    if (notif.type === 'student_signup') return 'text-emerald-400 bg-emerald-400/10';
    if (notif.type === 'teacher_signup') return 'text-yellow-400 bg-yellow-400/10';
    return 'text-[#d4af37] bg-[#d4af37]/10';
  };

  const content = (
    <div 
      onClick={handleClick}
      className={`p-4 flex gap-4 transition-colors cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.02] ${!isRead ? 'bg-white/[0.04]' : 'opacity-70'}`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 ${getIconColor()}`}>
        <Bell className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className={`text-sm font-semibold truncate ${!isRead ? 'text-white' : 'text-zinc-300'}`}>
            {notif.title}
          </h4>
          <span className="text-[10px] text-zinc-500 shrink-0 whitespace-nowrap mt-0.5">
            {timeAgo(notif.timestamp)}
          </span>
        </div>
        <p className={`text-xs line-clamp-2 ${!isRead ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {notif.message}
        </p>
      </div>
      {!isRead && (
        <div className="w-2 h-2 rounded-full bg-[#d4af37] shrink-0 mt-1.5 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
      )}
    </div>
  );

  if (notif.link) {
    return <Link href={notif.link}>{content}</Link>;
  }

  return content;
}
