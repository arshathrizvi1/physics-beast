"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";

export default function AboutAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    tagline: "",
    mission: "",
    vision: "",
    whyChooseUs: "",
    features: [] as { title: string, description: string }[],
    contact: {
      email: "",
      phone: "",
      location: "",
      website: ""
    }
  });

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/login');
      return;
    }

    const fetchAbout = async () => {
      try {
        const snap = await getDoc(doc(db, "siteConfig", "about"));
        if (snap.exists()) {
          const fetched = snap.data();
          setData({
            tagline: fetched.tagline || "",
            mission: fetched.mission || "",
            vision: fetched.vision || "",
            whyChooseUs: fetched.whyChooseUs || "",
            features: fetched.features || [],
            contact: fetched.contact || { email: "", phone: "", location: "", website: "" }
          });
        }
      } catch (error) {
        console.error("Failed to load about data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchAbout();
  }, [user, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "siteConfig", "about"), data, { merge: true });
      alert("About Us page updated successfully!");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save About Us data.");
    } finally {
      setSaving(false);
    }
  };

  const updateContact = (field: keyof typeof data.contact, value: string) => {
    setData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }));
  };

  const addFeature = () => {
    setData(prev => ({
      ...prev,
      features: [...prev.features, { title: "", description: "" }]
    }));
  };

  const updateFeature = (index: number, field: 'title' | 'description', value: string) => {
    setData(prev => {
      const newFeatures = [...prev.features];
      newFeatures[index][field] = value;
      return { ...prev, features: newFeatures };
    });
  };

  const removeFeature = (index: number) => {
    setData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  if (!user || user.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin')} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-2xl font-bold text-white">Edit About Us Page</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-[#d4af37] hover:bg-[#b5952f] text-black font-bold">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#111] border-zinc-800 col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Main Content</CardTitle>
              <CardDescription>The primary text shown on the About page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Tagline (Hero Section)</label>
                <Textarea 
                  value={data.tagline} 
                  onChange={e => setData({...data, tagline: e.target.value})} 
                  placeholder="Empowering students with quality education..."
                  className="bg-black border-zinc-800 min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Our Mission</label>
                <Textarea 
                  value={data.mission} 
                  onChange={e => setData({...data, mission: e.target.value})} 
                  className="bg-black border-zinc-800 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Our Vision</label>
                <Textarea 
                  value={data.vision} 
                  onChange={e => setData({...data, vision: e.target.value})} 
                  className="bg-black border-zinc-800 min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Why Choose Us (Description)</label>
                <Textarea 
                  value={data.whyChooseUs} 
                  onChange={e => setData({...data, whyChooseUs: e.target.value})} 
                  className="bg-black border-zinc-800 min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Contact Information</CardTitle>
              <CardDescription>Shown at the bottom of the About page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Email Address</label>
                <Input 
                  value={data.contact.email} 
                  onChange={e => updateContact('email', e.target.value)} 
                  className="bg-black border-zinc-800" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Phone Number</label>
                <Input 
                  value={data.contact.phone} 
                  onChange={e => updateContact('phone', e.target.value)} 
                  className="bg-black border-zinc-800" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Location / Address</label>
                <Input 
                  value={data.contact.location} 
                  onChange={e => updateContact('location', e.target.value)} 
                  className="bg-black border-zinc-800" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Website URL</label>
                <Input 
                  value={data.contact.website} 
                  onChange={e => updateContact('website', e.target.value)} 
                  className="bg-black border-zinc-800" 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-zinc-800 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-white">Features</CardTitle>
                <CardDescription>3 key benefits shown in the "Why Choose Us" grid.</CardDescription>
              </div>
              <Button onClick={addFeature} variant="outline" size="sm" className="border-zinc-700 text-zinc-300">
                <Plus className="w-4 h-4 mr-2" />
                Add Feature
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {data.features.map((feature, index) => (
                <div key={index} className="flex gap-4 p-4 border border-zinc-800 rounded-lg bg-black/50">
                  <div className="flex-1 space-y-4">
                    <Input 
                      placeholder="Feature Title (e.g., Expert Instructors)" 
                      value={feature.title} 
                      onChange={e => updateFeature(index, 'title', e.target.value)} 
                      className="bg-black border-zinc-800 font-bold"
                    />
                    <Textarea 
                      placeholder="Feature Description" 
                      value={feature.description} 
                      onChange={e => updateFeature(index, 'description', e.target.value)} 
                      className="bg-black border-zinc-800 h-20"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFeature(index)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
              {data.features.length === 0 && (
                <p className="text-center text-zinc-500 py-4">No features added yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
