import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, BookOpen, XCircle, CheckCircle2 } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Course { id: string; name: string; batchId?: string; teacherId?: string; isMonthly?: boolean; }
interface Batch { id: string; name: string; }

interface CourseSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (courseId: string) => void;
  selectedCourseId: string;
  courses: Course[];
  batches: Batch[];
  title?: string;
  allowNone?: boolean;
}

export function CourseSelectModal({
  isOpen, onClose, onSelect, selectedCourseId, courses, batches, title = "Select a Course", allowNone = false
}: CourseSelectModalProps) {
  const [filterYear, setFilterYear] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [search, setSearch] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && teamMembers.length === 0) {
      getDocs(collection(db, 'team')).then(snap => {
        setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCourses = courses.filter(c => {
    const matchYear = filterYear === "all" || c.batchId === filterYear;
    const matchTeacher = filterTeacher === "all" || c.teacherId === filterTeacher;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchYear && matchTeacher && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-primary/5 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg hidden sm:block">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground hidden sm:block">Filter by year or teacher to find the right course</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <XCircle className="w-6 h-6 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>

        <div className="p-4 border-b bg-secondary/10 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Batch / Year</Label>
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Teacher</Label>
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterTeacher}
              onChange={e => setFilterTeacher(e.target.value)}
            >
              <option value="all">All Teachers</option>
              {teamMembers.filter(t => t.role === 'teacher').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 opacity-50" />
              <Input 
                placeholder="Search course..." 
                className="pl-9 h-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-2 bg-background/50 relative">
          {allowNone && (
             <button 
                type="button"
                onClick={() => { 
                  onSelect("none"); 
                  onClose(); 
                }} 
                className={w-full p-4 mb-2 text-left rounded-xl border transition-all text-sm font-bold flex items-center justify-between hover:scale-[1.01] }
              >
                <span className="truncate mr-2">None (Clear Selection)</span>
                {selectedCourseId === "none" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              </button>
          )}
          
          {filteredCourses.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No courses match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCourses.map(course => {
                const teacherName = teamMembers.find(t => t.id === course.teacherId)?.name || 'Unknown';
                const batchName = batches.find(b => b.id === course.batchId)?.name || 'Unknown';

                return (
                  <button 
                    key={course.id}
                    type="button"
                    onClick={() => { 
                      onSelect(course.id); 
                      onClose(); 
                    }} 
                    className={p-4 text-left rounded-xl border transition-all flex flex-col justify-between hover:scale-[1.02] }
                  >
                    <div className="flex w-full items-start justify-between gap-2 mb-3">
                      <span className="font-bold text-sm truncate" title={course.name}>{course.name}</span>
                      {selectedCourseId === course.id && <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />}
                    </div>
                    <div className="flex gap-2 flex-wrap mt-auto">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{teacherName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{batchName}</span>
                      {course.isMonthly && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Monthly</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
