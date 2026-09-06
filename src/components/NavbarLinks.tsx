"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import LiveNavLink from "@/components/LiveNavLink";

export default function NavbarLinks() {
  const links = [
    { href: "/courses", label: "Courses" },
    { href: "/about", label: "About" },
    { href: "/exams", label: "Exams" },
  ];

  return (
    <nav className="hidden md:flex items-center gap-6 text-sm font-semibold whitespace-nowrap">
      {links.map((link, i) => (
        <motion.div
          key={link.href}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i, duration: 0.5 }}
        >
          <Link
            href={link.href}
            className="text-foreground/90 hover:text-[#d4af37] transition-all duration-200"
          >
            {link.label}
          </Link>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 * links.length, duration: 0.5 }}
      >
        <LiveNavLink />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 * (links.length + 1), duration: 0.5 }}
      >
        <Link
          href="/leaderboard"
          className="text-foreground/90 hover:text-[#d4af37] transition-all duration-200"
        >
          Leaderboard
        </Link>
      </motion.div>
    </nav>
  );
}

