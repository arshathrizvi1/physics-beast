import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\components\ZoomSettingsModal.tsx'

new_file_content = """"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Loader2, X, ExternalLink, Video } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function ZoomSettingsModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sdkKey, setSdkKey] = useState("");

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
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const authLink = sdkKey.trim() 
    ? 'https://zoom.us/oauth/authorize?response_type=code&client_id=' + sdkKey.trim() + '&redirect_uri=https://brillliantacademy.site'
    : '#';

  return (
    <>
      <Button variant="outline" className="gap-2 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:text-blue-500" onClick={() => setOpen(true)}>
        <Video className="w-4 h-4" />
        Connect Zoom
      </Button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-secondary/20 rounded-t-xl shrink-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">Connect Zoom</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full">
                <X className="w-5 h-5 opacity-70" />
              </Button>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>
              ) : (
                <div className="space-y-4">
                  {sdkKey.trim() ? (
                    <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-xl flex flex-col gap-4 items-center justify-center text-center">
                      <div className="bg-blue-500/10 p-4 rounded-full mb-2">
                        <Video className="w-10 h-10 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-blue-500">Link Monthly Account</h4>
                        <p className="text-sm text-muted-foreground mt-2">Click the button below to authorize the academy's automated system with your new Zoom account.</p>
                      </div>
                      <a 
                        href={authLink}
                        target="_self"
                        rel="noreferrer"
                        className="bg-blue-600 hover:bg-blue-500 w-full text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 mt-4 transition-colors shadow-lg shadow-blue-500/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Authorize App
                      </a>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground p-4">Zoom Developer ID is not configured in the database.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_file_content)

print("Updated ZoomSettingsModal.tsx successfully!")
