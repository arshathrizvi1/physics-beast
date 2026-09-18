"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, X } from "lucide-react";
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
                  <div className="flex justify-end pt-4">
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
