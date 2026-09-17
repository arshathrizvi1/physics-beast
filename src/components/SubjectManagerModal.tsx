"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Save, Plus } from "lucide-react";
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editSubject) {
        setFormName(editSubject.name || "");
        setFormStreamIds(editSubject.streamIds || []);
      } else {
        setFormName("");
        setFormStreamIds([]);
      }
    }
  }, [isOpen, editSubject]);

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
      const payload = {
        name: formName,
        streamIds: formStreamIds
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
