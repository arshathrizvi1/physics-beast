"use client";

import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export function CustomToastProvider() {
  useEffect(() => {
    // Save original alert just in case
    const originalAlert = window.alert;

    // Override default window.alert
    window.alert = (message?: any) => {
      if (!message) return;
      const msg = String(message);
      
      const lowerMsg = msg.toLowerCase();
      
      if (lowerMsg.includes("failed") || lowerMsg.includes("error") || lowerMsg.includes("denied") || lowerMsg.includes("too large") || lowerMsg.includes("exceeded")) {
        toast.error(msg, { 
          duration: 6000,
          icon: <XCircle className="w-5 h-5 text-red-500" />
        });
      } else if (lowerMsg.includes("success") || lowerMsg.includes("sent") || lowerMsg.includes("updated") || lowerMsg.includes("published") || lowerMsg.includes("granted") || lowerMsg.includes("created")) {
        toast.success(msg, { 
          duration: 5000,
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
        });
      } else if (lowerMsg.includes("warning") || lowerMsg.includes("important") || lowerMsg.includes("anti-cheat") || lowerMsg.includes("locked") || lowerMsg.includes("blocked")) {
        toast(msg, { 
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          duration: 8000,
          style: {
            border: '1px solid rgba(245, 158, 11, 0.3)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: '#fff',
          }
        });
      } else {
        toast(msg, { 
          duration: 5000,
          icon: <Info className="w-5 h-5 text-blue-400" />
        });
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <Toaster 
      position="top-center"
      toastOptions={{
        style: {
          background: '#1a1a1a', // Dark theme background
          color: '#fff',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
          padding: '16px',
          maxWidth: '500px',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
        },
        success: {
          style: {
            border: '1px solid rgba(34, 197, 94, 0.3)',
            backgroundColor: 'rgba(20, 30, 20, 0.95)',
          },
        },
        error: {
          style: {
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(30, 20, 20, 0.95)',
          },
        },
      }} 
    />
  );
}
