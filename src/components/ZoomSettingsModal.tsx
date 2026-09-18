"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, X, ExternalLink } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function ZoomSettingsModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sdkKey, setSdkKey] = useState("");
  const [sdkSecret, setSdkSecret] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'zoom');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSdkKey(snap.data().sdkKey || "");
        setSdkSecret(snap.data().sdkSecret || "");
        setWebhookToken(snap.data().webhookToken || "");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'zoom'), {
        sdkKey: sdkKey.trim(),
        sdkSecret: sdkSecret.trim(),
        webhookToken: webhookToken.trim(),
        updatedAt: Date.now()
      }, { merge: true });
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save Zoom settings.");
    }
    setSaving(false);
  };

  const authLink = sdkKey.trim() 
    ? 'https://zoom.us/oauth/authorize?response_type=code&client_id=' + sdkKey.trim() + '&redirect_uri=https://brilliantacademy.vercel.app'
    : '#';

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Settings className="w-4 h-4" />
        Zoom App Settings
      </Button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-primary/5 rounded-t-xl shrink-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Settings className="w-5 h-5"/> Zoom Meeting SDK Configuration</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full">
                <X className="w-5 h-5 opacity-70" />
              </Button>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-secondary/20 p-4 rounded-md text-sm mb-4 border border-secondary">
                    To get these keys, go to <b>marketplace.zoom.us</b> &rarr; Develop &rarr; Build App &rarr; Meeting SDK.
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID (or SDK Key)</Label>
                    <Input 
                      value={sdkKey} 
                      onChange={(e) => setSdkKey(e.target.value)} 
                      placeholder="Paste Client ID here" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret (or SDK Secret)</Label>
                    <Input 
                      type="password"
                      value={sdkSecret} 
                      onChange={(e) => setSdkSecret(e.target.value)} 
                      placeholder="Paste Client Secret here" 
                    />
                  </div>
                  
                  {sdkKey.trim() && (
                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-md mt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-400">Connect Zoom Account</h4>
                        <p className="text-xs text-muted-foreground">Authorize this app with your Zoom account to enable API features.</p>
                      </div>
                      <a 
                        href={authLink}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-md flex items-center gap-2 shrink-0 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Authorize App
                      </a>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-border/50 mt-2">
                    <Label>Webhook Secret Token (Optional - For Auto-Start)</Label>
                    <p className="text-xs text-muted-foreground mb-2">If you want classes to automatically change to "Live" when the teacher starts them on Zoom, create a Webhook in Zoom and paste the Secret Token here.</p>
                    <Input 
                      type="password"
                      value={webhookToken} 
                      onChange={(e) => setWebhookToken(e.target.value)} 
                      placeholder="Paste Webhook Secret Token" 
                    />
                  </div>
                  <div className="flex justify-end pt-4 gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
