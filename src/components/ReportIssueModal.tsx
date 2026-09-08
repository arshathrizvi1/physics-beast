"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, ShieldAlert, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import toast from "react-hot-toast";

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportIssueModal({ isOpen, onClose }: ReportIssueModalProps) {
  const { user } = useAuth();
  const [issueCategory, setIssueCategory] = useState("Loading Error");
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please describe the technical issue.");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = "";
      if (selectedFile) {
        toast("Uploading screenshot...", { icon: "⏳" });
        imageUrl = await uploadToCloudinary(selectedFile);
      }

      await addDoc(collection(db, "examMessages"), {
        type: "technical",
        studentName: user?.name || user?.email?.split("@")[0] || "Student",
        studentEmail: user?.email || "",
        studentId: user?.uid || "",
        topic: issueCategory,
        message: `[Category: ${issueCategory}]\n${message}`,
        imageUrl: imageUrl || null,
        timestamp: Date.now(),
        status: "unread",
      });

      await addDoc(collection(db, "notifications"), {
        target: "admin",
        title: "New Technical Issue Reported 🚨",
        message: `A student reported a ${issueCategory}.`,
        link: "/admin#messages",
        timestamp: Date.now(),
        type: "technical",
        readBy: []
      });

      toast.success("Technical issue reported to Admin successfully!");
      setMessage("");
      handleRemoveImage();
      setIssueCategory("Loading Error");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to report issue: " + (err?.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[500px] bg-zinc-950 border border-white/10 text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[#d4af37]">
            <ShieldAlert className="w-5 h-5" /> Report Technical Issue
          </h3>
          <p className="text-zinc-400 text-xs">
            Notice a bug or glitch? Send technical problems directly to System Administrators.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Issue Type / Category
            </Label>
            <select
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
            >
              <option value="Loading Error">Loading Error (Page/Video won't load)</option>
              <option value="Quality Issue">Quality Issue (Video or audio glitch)</option>
              <option value="Exam Not Working">Exam Not Working (Timer/Submission error)</option>
              <option value="Payment & Access">Payment & Course Access Issue</option>
              <option value="Other Issue">Other Issue (Describe below)</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Description of the Problem
            </Label>
            <Textarea
              rows={4}
              required
              placeholder="Please describe what happened, what page you were on, or any error message you saw..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-zinc-900 border-white/10 focus:border-[#d4af37] text-sm text-white placeholder:text-zinc-600 rounded-xl resize-none"
            />
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Attach Screenshot / Image <span className="text-zinc-500 font-normal">(Optional)</span>
            </Label>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-zinc-900 p-2 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                  <span className="text-xs text-zinc-300 truncate max-w-[200px]">{selectedFile?.name}</span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleRemoveImage}
                  className="text-zinc-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/10 hover:border-[#d4af37]/50 bg-zinc-900/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                <ImageIcon className="w-6 h-6 text-zinc-500" />
                <span className="text-xs text-zinc-400 font-medium">Click to upload screenshot (Max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-[#d4af37]" /> Admin Only
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-zinc-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#d4af37] text-black font-bold hover:bg-[#b5952f] text-xs px-5 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Submitting...
                  </>
                ) : (
                  "Report Issue"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
