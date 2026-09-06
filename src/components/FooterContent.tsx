"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { motion } from "framer-motion";

const defaultFooter = {
  tagline: "Learn Today · Build Tomorrow",
  contactEmail: "contact@brilliantacademy.com",
  quickLinks: [
    { label: "Courses", href: "/courses" },
    { label: "Exams", href: "/exams" },
    { label: "Leaderboard", href: "/leaderboard" },
  ],
  companyLinks: [
    { label: "About Us", href: "/about" },
    { label: "Reviews", href: "/reviews" },
    { label: "Login", href: "/login" },
  ],
};

export default function FooterContent() {
  const [footer, setFooter] = useState(defaultFooter);

  useEffect(() => {
    getDoc(doc(db, "siteConfig", "footer"))
      .then(snap => {
        if (snap.exists()) setFooter({ ...defaultFooter, ...snap.data() });
      })
      .catch(() => {/* use defaults */});
  }, []);

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-lg text-primary mb-3">Brilliant Academy</h3>
          <p className="text-sm text-muted-foreground">{footer.tagline}</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Quick Links</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {footer.quickLinks.map((link, i) => (
              <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {footer.companyLinks.map((link, i) => (
              <Link key={i} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <p className="text-sm text-muted-foreground">{footer.contactEmail}</p>
        </div>
      </div>
      <div className="relative pt-6 mt-8">
        <motion.div 
          className="absolute top-0 left-0 h-px bg-[#d4af37]"
          initial={{ width: "0%" }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        <div className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Brilliant Academy. All rights reserved.
        </div>
      </div>
    </div>
  );
}
