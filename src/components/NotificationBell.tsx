"use client";

import React, { useState } from "react";
import { Bell, Check, Trash2, BellOff, BellRing, ChevronRight, Smartphone, UserCheck, CreditCard } from "lucide-react";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  const { notifications, unreadCount, browserEnabled, toggleBrowserNotifications, markAsRead, markAllAsRead, clearNotification, clearAllNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleToggle = () => setIsOpen(!isOpen);

  // Close dropdown if clicking outside
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
        aria-label="Open notifications"
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
          <div className="p-4 border-b border-white/5 flex flex-col gap-3 bg-zinc-900/50">
            <div className="flex items-center justify-between">
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
              
              <div className="flex items-center gap-2">
                {/* Push Toggle Switch Button */}
                <button
                  onClick={toggleBrowserNotifications}
                  title={browserEnabled ? "Push Notifications: ON (Click to Turn Off)" : "Push Notifications: OFF (Click to Turn On)"}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                    browserEnabled 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {browserEnabled ? (
                    <>
                      <BellRing className="w-3 h-3 text-emerald-400 animate-pulse" />
                      <span>Push: ON</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3 h-3 text-zinc-400" />
                      <span>Push: OFF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center justify-end gap-3">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-[#d4af37] hover:text-white font-medium transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button 
                  onClick={clearAllNotifications}
                  className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              </div>
            )}
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
                {notifications.map((notif) => (
                  <NotificationItem 
                    key={notif.id} 
                    notif={notif} 
                    markAsRead={markAsRead}
                    clearNotification={clearNotification}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
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

function NotificationItem({ 
  notif, 
  markAsRead, 
  clearNotification,
  onClose 
}: { 
  notif: any; 
  markAsRead: (id: string) => void; 
  clearNotification: (id: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isRead = notif.readBy?.includes(user?.uid || "");
  
  // Detect if notification is for Device Login Approval or Student Signup Approval
  const isDeviceLogin = notif.type === 'student_login' || 
    notif.title?.toLowerCase().includes('device login') || 
    notif.message?.toLowerCase().includes('new device');

  const isStudentSignup = notif.type === 'student_signup' || 
    notif.title?.toLowerCase().includes('registration') || 
    notif.title?.toLowerCase().includes('signup') || 
    notif.title?.toLowerCase().includes('permission allow') ||
    notif.message?.toLowerCase().includes('registered as a student') ||
    notif.message?.toLowerCase().includes('permission allow') ||
    notif.message?.toLowerCase().includes('pending approval');

  const isPayment = notif.type === 'payment' ||
    notif.title?.toLowerCase().includes('payment') ||
    notif.title?.toLowerCase().includes('receipt') ||
    notif.message?.toLowerCase().includes('pending payment') ||
    notif.message?.toLowerCase().includes('pending receipt') ||
    notif.message?.toLowerCase().includes('paid');

  // Direct approval notifications straight to Admin Live Dashboard -> Pending Student Approvals or Payments
  let targetLink = notif.link;
  if (isDeviceLogin || isStudentSignup) {
    targetLink = '/admin#pending-approvals';
  } else if (isPayment) {
    targetLink = '/admin#payments';
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isRead) markAsRead(notif.id);
    onClose();

    if (targetLink && targetLink.includes('#pending-approvals')) {
      if (pathname === '/admin') {
        e.preventDefault();
        window.location.hash = 'pending-approvals';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        const el = document.getElementById('pending-approvals');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary');
          }, 2500);
        }
      }
    } else if (targetLink && targetLink.includes('#payments')) {
      if (pathname === '/admin') {
        e.preventDefault();
        window.location.hash = 'payments';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        const el = document.getElementById('admin-payments-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('ring-2', 'ring-primary', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary');
          }, 2500);
        }
      }
    }
  };

  const getIcon = () => {
    if (isPayment) {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-emerald-400 bg-emerald-400/10">
          <CreditCard className="w-4 h-4" />
        </div>
      );
    }
    if (isDeviceLogin) {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-orange-400 bg-orange-400/10">
          <Smartphone className="w-4 h-4" />
        </div>
      );
    }
    if (isStudentSignup) {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-emerald-400 bg-emerald-400/10">
          <UserCheck className="w-4 h-4" />
        </div>
      );
    }
    if (notif.type === 'technical') {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-amber-500 bg-amber-500/10">
          <Bell className="w-4 h-4" />
        </div>
      );
    }
    if (notif.type === 'contact_us') {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-blue-500 bg-blue-500/10">
          <Bell className="w-4 h-4" />
        </div>
      );
    }
    if (notif.type === 'exam') {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-purple-500 bg-purple-500/10">
          <Bell className="w-4 h-4" />
        </div>
      );
    }
    if (notif.type === 'course') {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-green-500 bg-green-500/10">
          <Bell className="w-4 h-4" />
        </div>
      );
    }
    if (notif.type === 'teacher_signup') {
      return (
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-yellow-400 bg-yellow-400/10">
          <Bell className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/5 text-[#d4af37] bg-[#d4af37]/10">
        <Bell className="w-4 h-4" />
      </div>
    );
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearNotification(notif.id);
  };

  const content = (
    <div 
      onClick={handleClick}
      className={`p-4 flex gap-4 transition-colors cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.04] group relative ${!isRead ? 'bg-white/[0.04]' : 'opacity-70'}`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0 pr-6">
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
      
      {/* Action Indicators (Read Dot / Delete Button) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        {!isRead && (
          <div className="w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
        )}
        <button
          onClick={handleClear}
          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-md transition-all duration-200 focus:opacity-100"
          title="Clear notification"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );

  if (targetLink) {
    return <Link href={targetLink} onClick={handleClick} className="block">{content}</Link>;
  }

  return content;
}
