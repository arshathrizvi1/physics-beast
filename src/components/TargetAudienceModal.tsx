import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { XCircle, CheckCircle2, ChevronRight, GraduationCap, BookOpen, FolderOpen, Video } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TargetAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string, courseId: string, batchId: string) => void;
  batches: any[];
  courses: any[];
  folders: any[];
  defaultBatchId?: string;
}

export function TargetAudienceModal({
  isOpen, onClose, onSelect, batches, courses, folders, defaultBatchId = "all"
}: TargetAudienceModalProps) {
  const [step, setStep] = useState(1);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedBatch(defaultBatchId !== "all" ? defaultBatchId : "");
      setSelectedSubject("");
      setSelectedTeacher("");
      setSelectedCourse("");
      
      if (subjects.length === 0) {
        getDocs(collection(db, 'subjects')).then(snap => {
          setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
      if (teachers.length === 0) {
        getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'teacher']))).then(snap => {
          setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGlobal = () => {
    onSelect("all", "all", "all");
    onClose();
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Step 1: Select Year / Batch</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {batches.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBatch(b.id); setStep(2); }}
                  className="p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="font-bold group-hover:text-primary transition-colors">{b.name}</div>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        const availableSubjectIds = new Set(courses.filter(c => c.batchId === selectedBatch).map(c => c.subjectId).filter(Boolean));
        const availableSubjects = subjects.filter(s => availableSubjectIds.has(s.id));
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Step 2: Select Subject</h3>
            {availableSubjects.length === 0 ? <p className="text-muted-foreground">No subjects found for this year.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableSubjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSubject(s.id); setStep(3); }}
                    className="p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3 group"
                  >
                    <BookOpen className="w-5 h-5 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="font-bold truncate group-hover:text-primary transition-colors">{s.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case 3:
        const availableTeacherIds = new Set(courses.filter(c => c.batchId === selectedBatch && c.subjectId === selectedSubject).map(c => c.teacherId).filter(Boolean));
        const availableTeachers = teachers.filter(t => availableTeacherIds.has(t.id));
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Step 3: Select Teacher</h3>
            {availableTeachers.length === 0 ? <p className="text-muted-foreground">No teachers found.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableTeachers.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTeacher(t.id); setStep(4); }}
                    className="p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3 group"
                  >
                    <GraduationCap className="w-5 h-5 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="font-bold truncate group-hover:text-primary transition-colors">{t.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case 4:
        const availableCourses = courses.filter(c => c.batchId === selectedBatch && c.subjectId === selectedSubject && c.teacherId === selectedTeacher);
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Step 4: Select Course</h3>
            {availableCourses.length === 0 ? <p className="text-muted-foreground">No courses found.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableCourses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCourse(c.id); setStep(5); }}
                    className="p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3 group"
                  >
                    <Video className="w-5 h-5 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="font-bold truncate group-hover:text-primary transition-colors">{c.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case 5:
        const availableFolders = folders.filter(f => f.courseId === selectedCourse);
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Step 5: Select Folder (Final Target)</h3>
            {availableFolders.length === 0 ? <p className="text-muted-foreground">No folders found in this course.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableFolders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { 
                      onSelect(f.id, selectedCourse, selectedBatch);
                      onClose();
                    }}
                    className="p-4 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left flex flex-col gap-1 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <div className="font-bold truncate group-hover:text-primary transition-colors pr-6">{f.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground pl-7">Target this specific folder</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-primary/5 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg hidden sm:block">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Select Target Audience Folder</h2>
              <p className="text-xs text-muted-foreground hidden sm:block">Step-by-step selection for live broadcast audience</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <XCircle className="w-6 h-6 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="p-3 border-b bg-secondary/10 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <div className="flex items-center gap-2 text-xs font-medium min-w-max">
            <button onClick={() => setStep(1)} className={`hover:text-primary transition-colors px-2 py-1 rounded ${step === 1 ? 'bg-background shadow-sm' : ''} ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Year {selectedBatch && <span className="text-primary ml-1 font-bold">({batches.find(b=>b.id===selectedBatch)?.name || '...'})</span>}
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <button onClick={() => selectedBatch && setStep(2)} disabled={!selectedBatch} className={`hover:text-primary transition-colors px-2 py-1 rounded ${step === 2 ? 'bg-background shadow-sm' : ''} disabled:opacity-50 ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Subject {selectedSubject && <span className="text-primary ml-1 font-bold">({subjects.find(s=>s.id===selectedSubject)?.name || '...'})</span>}
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <button onClick={() => selectedSubject && setStep(3)} disabled={!selectedSubject} className={`hover:text-primary transition-colors px-2 py-1 rounded ${step === 3 ? 'bg-background shadow-sm' : ''} disabled:opacity-50 ${step >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Teacher {selectedTeacher && <span className="text-primary ml-1 font-bold">({teachers.find(t=>t.id===selectedTeacher)?.name || '...'})</span>}
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <button onClick={() => selectedTeacher && setStep(4)} disabled={!selectedTeacher} className={`hover:text-primary transition-colors px-2 py-1 rounded ${step === 4 ? 'bg-background shadow-sm' : ''} disabled:opacity-50 ${step >= 4 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Course {selectedCourse && <span className="text-primary ml-1 font-bold">({courses.find(c=>c.id===selectedCourse)?.name || '...'})</span>}
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            <span className={`px-2 py-1 rounded ${step === 5 ? 'bg-background shadow-sm text-primary font-bold' : 'text-muted-foreground'}`}>
              Folder
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-background/50">
          {getStepContent()}
        </div>
        
        <div className="p-4 border-t bg-secondary/10 flex justify-between items-center shrink-0">
          <Button variant="outline" onClick={handleGlobal} className="font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Broadcast to Everyone (Global)
          </Button>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
