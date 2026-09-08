"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { Mail, Phone, MapPin, Globe, GraduationCap, Users, BookOpen, Star, ChevronDown, ShieldCheck, Clock, Send } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

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
              About & <span className="text-[#d4af37]">Contact Us</span>
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
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <span className="w-2 h-7 bg-[#d4af37] rounded-full inline-block" />
                  Our Mission
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed pl-5 border-l border-white/10">
                  {data.mission}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <span className="w-2 h-7 bg-[#d4af37] rounded-full inline-block" />
                  Our Vision
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed pl-5 border-l border-white/10">
                  {data.vision}
                </p>
              </div>
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

      {/* Contact Section */}
      <section id="contact" className="py-24 border-t border-border/50 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#d4af37]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
            
            {/* Left Side: Contact Info */}
            <div className="lg:col-span-2 space-y-10">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">Get in Touch</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Have questions about our classes or need technical support? We're here to help. Reach out to us anytime.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                {[
                  { icon: Mail, label: "Email", value: data.contact?.email || "contact@brilliantacademy.com" },
                  { icon: Phone, label: "Phone", value: data.contact?.phone || "+94 77 123 4567" },
                  { icon: MapPin, label: "Location", value: data.contact?.location || "Colombo, Sri Lanka" },
                  { icon: Globe, label: "Website", value: data.contact?.website || "www.brilliantacademy.com" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-5 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#d4af37]/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{item.label}</div>
                      {item.label === 'Email' ? (
                        <a href={`mailto:${item.value}`} className="text-foreground font-medium break-all hover:text-[#d4af37] transition-colors">{item.value}</a>
                      ) : item.label === 'Phone' ? (
                        <a href={`tel:${item.value}`} className="text-foreground font-medium break-all hover:text-[#d4af37] transition-colors">{item.value}</a>
                      ) : item.label === 'Website' ? (
                        <a href={item.value.startsWith('http') ? item.value : `https://${item.value}`} target="_blank" rel="noopener noreferrer" className="text-foreground font-medium break-all hover:text-[#d4af37] transition-colors">{item.value}</a>
                      ) : (
                        <div className="text-foreground font-medium break-all">{item.value}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Side: The Contact Form */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-3"
            >
              <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
                {/* Subtle gold glow inside form card */}
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#d4af37]/10 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="text-[#d4af37] text-xs font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" /> Send a message
                  </div>
                  <h3 className="text-4xl font-semibold text-white mb-10 tracking-tight">How can we help?</h3>

                  <form 
                    onSubmit={async (e) => { 
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const data = Object.fromEntries(formData.entries());
                      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                      
                      try {
                        submitBtn.disabled = true;
                        submitBtn.innerText = "Sending...";
                        
                        await addDoc(collection(db, "examMessages"), {
                          type: "contact_us",
                          studentName: data.fullName,
                          email: data.email,
                          phone: data.phone || "",
                          topic: data.topic,
                          message: data.message,
                          timestamp: Date.now(),
                          status: "unread",
                        });
                        
                        toast.success("Message sent successfully! We will get back to you soon."); 
                        form.reset(); 
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to send message. Please try again.");
                      } finally {
                        submitBtn.disabled = false;
                        submitBtn.innerText = "Send Message";
                      }
                    }} 
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-[11px] font-bold tracking-[0.15em] text-zinc-500 uppercase mb-2">Full Name</label>
                      <input name="fullName" required type="text" placeholder="Your name" className="w-full bg-[#161616] border border-white/5 focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 transition-colors outline-none" />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold tracking-[0.15em] text-zinc-500 uppercase mb-2">Email Address</label>
                      <input name="email" required type="email" placeholder="you@example.com" className="w-full bg-[#161616] border border-white/5 focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 transition-colors outline-none" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold tracking-[0.15em] text-zinc-500 uppercase mb-2">Phone <span className="text-zinc-600 ml-1 font-medium">· Optional</span></label>
                      <input name="phone" type="number" placeholder="07XXXXXXXX" className="w-full bg-[#161616] border border-white/5 focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 transition-colors outline-none" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold tracking-[0.15em] text-zinc-500 uppercase mb-2">I'm Asking About</label>
                      <div className="relative">
                        <select name="topic" required defaultValue="" className="w-full bg-[#161616] border border-white/5 focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 rounded-2xl px-5 py-4 text-white appearance-none cursor-pointer outline-none">
                          <option value="" disabled hidden className="text-zinc-600">Choose a topic</option>
                          <option value="A/L Physics classes">A/L Physics classes</option>
                          <option value="Recordings & access">Recordings & access</option>
                          <option value="Course enrollment">Course enrollment</option>
                          <option value="Technical support">Technical support</option>
                          <option value="Something else">Something else</option>
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold tracking-[0.15em] text-zinc-500 uppercase mb-2">Your Message</label>
                      <textarea name="message" required rows={4} placeholder="Tell us what you need help with..." className="w-full bg-[#161616] border border-white/5 focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 transition-colors resize-none outline-none" />
                    </div>

                    <div className="pt-2">
                      <button type="submit" className="w-full bg-gradient-to-r from-[#d4af37] to-[#b5952f] text-black font-bold text-lg rounded-2xl px-4 py-4 hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                        Send Message
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-6 mt-4 text-[10px] sm:text-xs font-bold tracking-widest text-zinc-500 uppercase border-t border-white/5">
                      <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#d4af37]" /> Private</div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#d4af37]" /> Usually within 24h</div>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
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

