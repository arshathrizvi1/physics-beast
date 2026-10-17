"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Save, Plus, Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { uploadToS3 } from "@/lib/s3Storage";

interface SubjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editSubject: any | null; // null means create mode
  streams: any[];
  courses: any[];
}

export default function SubjectManagerModal({
  isOpen,
  onClose,
  editSubject,
  streams,
  courses
}: SubjectManagerModalProps) {
  const [formName, setFormName] = useState("");
  const [formStreamIds, setFormStreamIds] = useState<string[]>([]);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editSubject) {
        setFormName(editSubject.name || "");
        setFormStreamIds(editSubject.streamIds || []);
        setFormImageUrl(editSubject.imageUrl || "");
      } else {
        setFormName("");
        setFormStreamIds([]);
        setFormImageUrl("");
      }
    }
  }, [isOpen, editSubject]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      let url = "";
      try {
        url = await uploadToCloudinary(file);
      } catch (cErr) {
        console.warn("Cloudinary upload failed, attempting S3 fallback...", cErr);
        try {
          url = await uploadToS3(file, "subjects");
        } catch (s3Err) {
          console.warn("S3 upload failed, attempting Firebase Storage fallback...", s3Err);
          const storageRef = ref(storage, `subjects/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          url = await getDownloadURL(storageRef);
        }
      }
      setFormImageUrl(url);
    } catch (err: any) {
      console.error("All upload providers failed:", err);
      alert("Failed to upload image. Please try again or provide an image URL.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!editSubject) return;
    if (confirm("Are you sure you want to delete this Subject? This will NOT delete its courses automatically.")) {
      try {
        await deleteDoc(doc(db, 'subjects', editSubject.id));
        onClose();
      } catch (e) {
        console.error("Failed to delete", e);
        alert("Failed to delete subject.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;
    setIsSubmitting(true);
    
    try {
      const payload: any = {
        name: formName.trim(),
        streamIds: formStreamIds,
        imageUrl: formImageUrl.trim() || null
      };

      if (editSubject) {
        await updateDoc(doc(db, 'subjects', editSubject.id), payload);
      } else {
        const ref = doc(collection(db, 'subjects'));
        await setDoc(ref, { ...payload, createdAt: Date.now() });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save subject.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200 p-6 relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-4">
          <h2 className="text-xl font-bold text-foreground">
            {editSubject ? "Edit Subject" : "Create Subject"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Subject Name</label>
            <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Physics" required />
          </div>

          {/* Subject Cover Image */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">
              Subject Cover Image (Optional)
            </label>
            
            {formImageUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-border/80 bg-secondary/20 aspect-video w-full max-h-48 flex items-center justify-center">
                <img 
                  src={formImageUrl} 
                  alt="Subject Preview" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium backdrop-blur-sm transition-colors flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Change
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormImageUrl("")}
                    className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium backdrop-blur-sm transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-5 cursor-pointer bg-secondary/10 hover:bg-secondary/20 transition-all text-center group">
                  {isUploadingImage ? (
                    <div className="flex flex-col items-center py-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mb-1.5" />
                      <span className="text-xs text-muted-foreground">Uploading image...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <ImageIcon className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors mb-1.5" />
                      <span className="text-xs font-semibold text-foreground">Click to upload subject image</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">Supports PNG, JPG, WebP</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingImage}
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">or Image URL:</span>
                  <Input 
                    value={formImageUrl} 
                    onChange={e => setFormImageUrl(e.target.value)} 
                    placeholder="https://.../subject-cover.png"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Assign to Streams</label>
            <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20 space-y-2 max-h-48 overflow-y-auto">
              {streams.length === 0 ? (
                <p className="text-xs text-muted-foreground">No streams available. Create a stream first.</p>
              ) : (
                streams.map(s => (
                  <label key={s.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-secondary/20 p-2 rounded-md transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      checked={formStreamIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) setFormStreamIds(prev => [...prev, s.id]);
                        else setFormStreamIds(prev => prev.filter(id => id !== s.id));
                      }}
                    />
                    <span className="font-medium">{s.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border/50">
            <div>
              {editSubject && (
                <Button type="button" variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (editSubject ? "Save Changes" : "Create Subject")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
