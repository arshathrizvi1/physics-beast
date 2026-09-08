"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, ArrowLeft, Globe, Link2, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const defaultFooter = {
  tagline: "Learn Today · Build Tomorrow",
  contactEmail: "contact@brilliantacademy.com",
  contactPhone: "",
  contactLocation: "",
  quickLinks: [
    { label: "Courses", href: "/courses" },
    { label: "Exams", href: "/exams" },
    { label: "Leaderboard", href: "/leaderboard" },
  ],
  companyLinks: [
    { label: "About Us", href: "/about" },
    { label: "Reviews", href: "/reviews" },
    { label: "Contact Us", href: "/about#contact" },
    { label: "Login", href: "/login" },
  ],
};

export default function FooterEditorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [tagline, setTagline] = useState(defaultFooter.tagline);
  const [contactEmail, setContactEmail] = useState(defaultFooter.contactEmail);
  const [contactPhone, setContactPhone] = useState(defaultFooter.contactPhone);
  const [contactLocation, setContactLocation] = useState(defaultFooter.contactLocation);
  const [quickLinks, setQuickLinks] = useState(defaultFooter.quickLinks);
  const [companyLinks, setCompanyLinks] = useState(defaultFooter.companyLinks);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
      return;
    }
    getDoc(doc(db, "siteConfig", "footer")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.tagline) setTagline(d.tagline);
        if (d.contactEmail) setContactEmail(d.contactEmail);
        if (d.contactPhone) setContactPhone(d.contactPhone || "");
        if (d.contactLocation) setContactLocation(d.contactLocation || "");
        if (d.quickLinks) setQuickLinks(d.quickLinks);
        if (d.companyLinks) setCompanyLinks(d.companyLinks);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "siteConfig", "footer"), {
        tagline,
        contactEmail,
        contactPhone,
        contactLocation,
        quickLinks: quickLinks.filter(l => l.label.trim()),
        companyLinks: companyLinks.filter(l => l.label.trim()),
        updatedAt: Date.now(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateLink = (
    list: typeof quickLinks,
    setList: typeof setQuickLinks,
    index: number,
    field: "label" | "href",
    value: string
  ) => {
    const updated = [...list];
    updated[index] = { ...updated[index], [field]: value };
    setList(updated);
  };

  const removeLink = (list: typeof quickLinks, setList: typeof setQuickLinks, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const addLink = (list: typeof quickLinks, setList: typeof setQuickLinks) => {
    setList([...list, { label: "", href: "/" }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" /> Footer Editor
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Edit footer text, links and contact info</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 min-w-[120px]"
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : saving ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </Button>
      </div>

      {/* Live Preview */}
      <div className="rounded-2xl border border-secondary/40 overflow-hidden">
        <div className="bg-secondary/10 px-5 py-3 border-b border-secondary/30 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Live Preview</span>
        </div>
        <div className="p-6 bg-secondary/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h3 className="font-bold text-primary mb-2">Brilliant Academy</h3>
              <p className="text-muted-foreground">{tagline || "Your tagline here"}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Quick Links</h4>
              <div className="flex flex-col gap-1 text-muted-foreground">
                {quickLinks.filter(l => l.label).map((l, i) => <span key={i}>{l.label}</span>)}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Company</h4>
              <div className="flex flex-col gap-1 text-muted-foreground">
                {companyLinks.filter(l => l.label).map((l, i) => <span key={i}>{l.label}</span>)}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Contact</h4>
              <p className="text-muted-foreground text-xs">{contactEmail || "Email"}</p>
              {contactPhone && <p className="text-muted-foreground text-xs mt-1">{contactPhone}</p>}
              {contactLocation && <p className="text-muted-foreground text-xs mt-1">{contactLocation}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Branding + Contact */}
        <div className="space-y-6">
          {/* Branding */}
          <div className="rounded-2xl border border-secondary/30 bg-card p-6 space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Branding
            </h2>
            <div className="space-y-2">
              <Label>Tagline <span className="text-muted-foreground font-normal text-xs">(shown under Academy name)</span></Label>
              <Input
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="e.g. Learn Today · Build Tomorrow"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-2xl border border-secondary/30 bg-card p-6 space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Contact Information
            </h2>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="contact@brilliantacademy.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="+94 77 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Location <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input
                value={contactLocation}
                onChange={e => setContactLocation(e.target.value)}
                placeholder="Colombo, Sri Lanka"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Links */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="rounded-2xl border border-secondary/30 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" /> Quick Links
              </h2>
              <Button size="sm" variant="outline" onClick={() => addLink(quickLinks, setQuickLinks)} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Link
              </Button>
            </div>
            <div className="space-y-3">
              {quickLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={link.label}
                    onChange={e => updateLink(quickLinks, setQuickLinks, i, "label", e.target.value)}
                    placeholder="Label (e.g. Courses)"
                    className="flex-1"
                  />
                  <Input
                    value={link.href}
                    onChange={e => updateLink(quickLinks, setQuickLinks, i, "href", e.target.value)}
                    placeholder="/courses"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLink(quickLinks, setQuickLinks, i)}
                    className="text-destructive hover:bg-destructive/10 h-9 w-9 p-0 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {quickLinks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No links yet. Click "Add Link" to add one.</p>
              )}
            </div>
          </div>

          {/* Company Links */}
          <div className="rounded-2xl border border-secondary/30 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" /> Company Links
              </h2>
              <Button size="sm" variant="outline" onClick={() => addLink(companyLinks, setCompanyLinks)} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add Link
              </Button>
            </div>
            <div className="space-y-3">
              {companyLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={link.label}
                    onChange={e => updateLink(companyLinks, setCompanyLinks, i, "label", e.target.value)}
                    placeholder="Label (e.g. About Us)"
                    className="flex-1"
                  />
                  <Input
                    value={link.href}
                    onChange={e => updateLink(companyLinks, setCompanyLinks, i, "href", e.target.value)}
                    placeholder="/about"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLink(companyLinks, setCompanyLinks, i)}
                    className="text-destructive hover:bg-destructive/10 h-9 w-9 p-0 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {companyLinks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No links yet. Click "Add Link" to add one.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save button at bottom too */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 px-10">
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : saving ? "Saving..." : <><Save className="w-4 h-4" /> Save All Changes</>}
        </Button>
      </div>
    </div>
  );
}
