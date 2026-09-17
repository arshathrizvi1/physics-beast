"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, User, Image as ImageIcon, Video, Edit2, FolderOpen, Trash2 } from "lucide-react";
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CourseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If provided, the modal acts as a context-specific manager.
  // The user won't be able to change these filters.
  defaultBatchId?: string | null;
  defaultSubjectId?: string | null;
  
  // Data from parent
  batches: any[];
  subjects: any[];
  courses: any[];
  teachers: any[]; // Team members with role === 'teacher'
  folders: any[]; // For deletion logic
  videos: any[]; // For deletion logic
  
  // To open the folder manager
  onManageFolders: (courseId: string) => void;
}

export default function CourseManagerModal({
  isOpen,
  onClose,
  defaultBatchId,
  defaultSubjectId,
  batches,
  subjects,
  courses,
  teachers,
  folders,
  videos,
  onManageFolders
}: CourseManagerModalProps) {
  
  // Filters
  const [filterBatchId, setFilterBatchId] = useState<string>("all");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("all");
  const [filterTeacherId, setFilterTeacherId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Reset filters when opened with specific context
  useEffect(() => {
    if (isOpen) {
      if (defaultBatchId) setFilterBatchId(defaultBatchId);
      else setFilterBatchId("all");
      
      if (defaultSubjectId) setFilterSubjectId(defaultSubjectId);
      else setFilterSubjectId("all");
    }
  }, [isOpen, defaultBatchId, defaultSubjectId]);

  // Form State
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBatchId, setFormBatchId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formIsMonthly, setFormIsMonthly] = useState(false);
  const [formImage, setFormImage] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      if (filterBatchId !== "all" && c.batchId !== filterBatchId) return false;
      if (filterSubjectId !== "all" && c.subjectId !== filterSubjectId) return false;
      if (filterTeacherId !== "all" && c.teacherId !== filterTeacherId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name?.toLowerCase().includes(q) && !c.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [courses, filterBatchId, filterSubjectId, filterTeacherId, searchQuery]);

  const openCreateForm = () => {
    setEditingCourseId(null);
    setFormName("");
    setFormDescription("");
    setFormBatchId(defaultBatchId && defaultBatchId !== "all" ? defaultBatchId : "");
    setFormSubjectId(defaultSubjectId && defaultSubjectId !== "all" ? defaultSubjectId : "");
    setFormTeacherId("");
    setFormIsMonthly(false);
    setFormImage(null);
    setShowForm(true);
  };

  const openEditForm = (course: any) => {
    setEditingCourseId(course.id);
    setFormName(course.name || "");
    setFormDescription(course.description || "");
    setFormBatchId(course.batchId || "");
    setFormSubjectId(course.subjectId || "");
    setFormTeacherId(course.teacherId || "");
    setFormIsMonthly(course.isMonthly || false);
    setFormImage(null); // We don't load the existing image into the File object
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this course and ALL its folders/videos?")) {
      // Find dependent folders
      const courseFolders = folders.filter(f => f.courseId === id);
      const batchOp = writeBatch(db);
      
      batchOp.delete(doc(db, 'courses', id));
      
      for (const folder of courseFolders) {
        batchOp.delete(doc(db, 'folders', folder.id));
        const folderVideos = videos.filter(v => v.folderId === folder.id);
        for (const vid of folderVideos) {
          batchOp.delete(doc(db, 'videos', vid.id));
        }
      }
      
      await batchOp.commit();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBatchId || !formSubjectId) return;
    setIsSubmitting(true);
    
    try {
      let thumbnailUrl = "";
      if (formImage) {
        thumbnailUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_WIDTH = 800;
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            if (ev.target?.result) img.src = ev.target.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(formImage);
        });
      }

      const assignedTeacher = teachers.find(m => m.id === formTeacherId);
      const subject = subjects.find(s => s.id === formSubjectId);
      
      const payload: any = {
        name: formName,
        description: formDescription,
        batchId: formBatchId,
        subjectId: formSubjectId,
        subjectName: subject?.name || "",
        isMonthly: formIsMonthly,
        teacherId: formTeacherId || null,
        teacherName: assignedTeacher ? (assignedTeacher.name || assignedTeacher.email?.split('@')[0]) : null,
        teacherSubject: assignedTeacher?.subject || null,
      };

      if (thumbnailUrl) {
        payload.image = thumbnailUrl;
      }

      if (editingCourseId) {
        await updateDoc(doc(db, 'courses', editingCourseId), payload);
      } else {
        payload.createdAt = Date.now();
        const ref = doc(collection(db, 'courses'));
        await setDoc(ref, payload);
      }
      
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save course. Image might be too large.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setShowForm(false);
        onClose();
      }
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Course Manager</DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="bg-secondary/10 p-6 rounded-xl border border-secondary/20">
            <h3 className="font-bold text-lg mb-4">{editingCourseId ? "Edit Course" : "Create New Course"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Course Name</label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Cover Image</label>
                  <Input type="file" accept="image/*" onChange={e => setFormImage(e.target.files?.[0] || null)} className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Batch / Year</label>
                  <select 
                    value={formBatchId} 
                    onChange={e => setFormBatchId(e.target.value)} 
                    required 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!!defaultBatchId && defaultBatchId !== "all"}
                  >
                    <option value="" disabled>Select Batch...</option>
                    <option value="all">All Batches (Global)</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Subject</label>
                  <select 
                    value={formSubjectId} 
                    onChange={e => setFormSubjectId(e.target.value)} 
                    required 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={!!defaultSubjectId && defaultSubjectId !== "all"}
                  >
                    <option value="" disabled>Select Subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Assign Teacher</label>
                  <select 
                    value={formTeacherId} 
                    onChange={e => setFormTeacherId(e.target.value)} 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- No Teacher --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name || t.email}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="isMonthly" checked={formIsMonthly} onChange={e => setFormIsMonthly(e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="isMonthly" className="text-sm font-bold">Monthly Live Classes Course</label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
                  <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Course"}</Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search courses..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <select 
                  value={filterBatchId} 
                  onChange={e => setFilterBatchId(e.target.value)} 
                  disabled={!!defaultBatchId && defaultBatchId !== "all"}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                >
                  <option value="all">All Batches</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select 
                  value={filterSubjectId} 
                  onChange={e => setFilterSubjectId(e.target.value)} 
                  disabled={!!defaultSubjectId && defaultSubjectId !== "all"}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select 
                  value={filterTeacherId} 
                  onChange={e => setFilterTeacherId(e.target.value)} 
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All Teachers</option>
                  <option value="">No Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                </select>
              </div>
              <Button onClick={openCreateForm} className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Create Course</Button>
            </div>

            {/* Course List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No courses found matching these filters.
                </div>
              ) : (
                filteredCourses.map(course => (
                  <div key={course.id} className="border border-border/50 rounded-xl overflow-hidden flex flex-col bg-card hover:border-primary/50 transition-colors shadow-sm">
                    {course.image ? (
                      <div className="h-32 w-full bg-secondary/20 relative">
                        <img src={course.image} alt={course.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-secondary/10 flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-bold text-lg leading-tight">{course.name}</h4>
                      </div>
                      {course.teacherName && (
                        <p className="text-xs text-primary font-medium flex items-center mb-1">
                          <User className="w-3 h-3 mr-1" /> {course.teacherName}
                        </p>
                      )}
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      )}
                      <div className="mt-auto pt-4 flex gap-2">
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => onManageFolders(course.id)}>
                          <FolderOpen className="w-4 h-4 mr-2" /> Folders
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(course)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
