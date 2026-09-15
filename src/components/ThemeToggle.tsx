
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed bottom-24 md:bottom-6 right-6 z-[100] p-3 bg-zinc-900 border border-[#d4af37]/30 text-white rounded-full shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 dark:bg-[#d4af37] dark:text-black dark:border-white/20"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun className="w-6 h-6" />
      ) : (
        <Moon className="w-6 h-6 text-[#d4af37]" />
      )}
    </button>
  );
}

