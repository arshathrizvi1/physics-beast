"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Mail, Phone, MapPin, Globe, GraduationCap, Users, BookOpen, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function AboutPage() {
  const [aboutData, setAboutData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const snap = await getDoc(doc(db, "siteConfig", "about"));
        if (snap.exists()) {
          setAboutData(snap.data());
        } else {
          setAboutData(defaultAbout);
        }
      } catch {
        setAboutData(defaultAbout);
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  const data = aboutData || defaultAbout;

  return (
    <div className="min-h-screen bg-background text-foreground/90">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <GraduationCap className="w-16 h-16 text-[#d4af37] mx-auto mb-6 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
            <h1 className="text-5xl font-extrabold text-foreground mb-6">
              About <span className="text-[#d4af37]">Brilliant Academy</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {data.tagline}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-bold text-foreground">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{data.mission}</p>
              <p className="text-lg text-muted-foreground leading-relaxed">{data.vision}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-2 gap-6"
            >
              {[
                { icon: Users, num: "2,000+", label: "Students" },
                { icon: BookOpen, num: "50+", label: "Courses" },
                { icon: GraduationCap, num: "30+", label: "Instructors" },
                { icon: Star, num: "4.8/5", label: "Rating" },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 text-center hover:border-[#d4af37]/50 transition-colors">
                  <stat.icon className="w-8 h-8 text-[#d4af37] mx-auto mb-3" />
                  <div className="text-3xl font-bold text-foreground mb-1">{stat.num}</div>
                  <div className="text-zinc-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team / Why Choose Us */}
      <section className="py-16 bg-[#0c0c0c] border-t border-border/50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-foreground text-center mb-4">Why Choose Us</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">{data.whyChooseUs}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(data.features || defaultAbout.features).map((f: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-card border border-border rounded-2xl p-8 hover:border-[#d4af37]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all group"
              >
                <div className="w-12 h-12 bg-[#d4af37]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#d4af37]/20 transition-colors">
                  <Star className="w-6 h-6 text-[#d4af37]" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Have questions? We're here to help. Reach out to us anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Mail, label: "Email", value: data.contact?.email || "contact@brilliantacademy.com" },
              { icon: Phone, label: "Phone", value: data.contact?.phone || "+94 77 123 4567" },
              { icon: MapPin, label: "Location", value: data.contact?.location || "Colombo, Sri Lanka" },
              { icon: Globe, label: "Website", value: data.contact?.website || "www.brilliantacademy.com" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card border border-border rounded-2xl p-6 text-center hover:border-[#d4af37]/40 transition-colors"
              >
                <item.icon className="w-8 h-8 text-[#d4af37] mx-auto mb-3" />
                <div className="text-sm text-zinc-500 mb-2 uppercase tracking-wider">{item.label}</div>
                <div className="text-foreground font-medium break-all">{item.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const defaultAbout = {
  tagline: "Empowering students with quality education, practical skills, and real opportunities to achieve their goals.",
  mission: "Our mission is to provide world-class education that is accessible, affordable, and effective. We believe every student deserves the best learning experience possible.",
  vision: "We envision a future where every student in Sri Lanka has access to top-quality education and can compete on the global stage.",
  whyChooseUs: "We combine expert instruction with modern technology to deliver an unmatched learning experience.",
  features: [
    { title: "Expert Instructors", description: "Learn from industry professionals with years of real-world experience in their fields." },
    { title: "Flexible Learning", description: "Study at your own pace, on any device, from anywhere in the world — whenever you're ready." },
    { title: "Certified Courses", description: "Earn recognized certificates that boost your career and prove your expertise to employers." },
  ],
  contact: {
    email: "contact@brilliantacademy.com",
    phone: "+94 77 123 4567",
    location: "Colombo, Sri Lanka",
    website: "www.brilliantacademy.com",
  },
};

