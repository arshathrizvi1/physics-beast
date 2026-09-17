"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Folder, Users, DollarSign } from "lucide-react";
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any | null;
  folders: any[];
  videos: any[];
}

export default function FolderManagerModal({
  isOpen,
  onClose,
  course,
  folders,
  videos
}: FolderManagerModalProps) {
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [folderStats, setFolderStats] = useState<Record<string, number>>({});

  const courseFolders = useMemo(() => {
    if (!course) return [];
    return folders.filter(f => f.courseId === course.id).sort((a, b) => a.createdAt - b.createdAt);
  }, [course, folders]);

  // Fetch purchase counts
  useEffect(() => {
    if (isOpen && courseFolders.length > 0) {
      const fetchStats = async () => {
        const stats: Record<string, number> = {};
        for (const f of courseFolders) {
          try {
            // Count approved payments for this folder
            const q = query(collection(db, 'payments'), where("folderId", "==", f.id), where("status", "==", "approved"));
            const snapshot = await getCountFromServer(q);
            stats[f.id] = snapshot.data().count;
          } catch (e) {
            console.error("Failed to fetch count for folder", f.id, e);
            stats[f.id] = 0;
          }
        }
        setFolderStats(stats);
      };
      fetchStats();
    }
  }, [isOpen, courseFolders.length]);

  const openCreateForm = () => {
    setEditingFolderId(null);
    setFormName("");
    setFormPrice("");
    setShowForm(true);
  };

  const openEditForm = (folder: any) => {
    setEditingFolderId(folder.id);
    setFormName(folder.name || "");
    setFormPrice(folder.price ? String(folder.price) : "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this folder and ALL its videos?")) {
      const folderVideos = videos.filter(v => v.folderId === id);
      const batchOp = writeBatch(db);
      
      batchOp.delete(doc(db, 'folders', id));
      
      for (const vid of folderVideos) {
        batchOp.delete(doc(db, 'videos', vid.id));
      }
      
      await batchOp.commit();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !course) return;
    setIsSubmitting(true);
    
    try {
      const payload: any = {
        name: formName,
        price: Number(formPrice) || 0,
        courseId: course.id,
        batchId: course.batchId
      };

      if (editingFolderId) {
        await updateDoc(doc(db, 'folders', editingFolderId), payload);
      } else {
        payload.createdAt = Date.now();
        const ref = doc(collection(db, 'folders'));
        await setDoc(ref, payload);
      }
      
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save folder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setShowForm(false);
        onClose();
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Folder className="w-6 h-6 text-primary" /> 
            Manage Folders: <span className="text-muted-foreground font-medium">{course.name}</span>
          </DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="bg-secondary/10 p-6 rounded-xl border border-secondary/20 mt-4">
            <h3 className="font-bold text-lg mb-4">{editingFolderId ? "Edit Folder" : "Create New Folder"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Folder Name</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Week 1, Module A..." required />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Price (Rs.)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="number" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="pl-9" placeholder="0 for Free" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Folder"}</Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Folders organize the videos inside this course. Students buy access to specific folders.
              </p>
              <Button onClick={openCreateForm} className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Add Folder</Button>
            </div>

            <div className="space-y-3">
              {courseFolders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                  No folders yet. Create one to start adding videos!
                </div>
              ) : (
                courseFolders.map(folder => {
                  const stats = folderStats[folder.id];
                  
                  return (
                    <div key={folder.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-secondary/10 p-4 rounded-xl border border-secondary/20 gap-4">
                      <div>
                        <h4 className="font-bold text-lg">{folder.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-primary">Rs. {folder.price || 0}</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" /> 
                            {stats !== undefined ? (
                              <span><b>{stats}</b> students bought</span>
                            ) : (
                              <span className="animate-pulse">Loading stats...</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" size="sm" onClick={() => openEditForm(folder)} className="flex-1 sm:flex-none">
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(folder.id)} className="flex-1 sm:flex-none hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
