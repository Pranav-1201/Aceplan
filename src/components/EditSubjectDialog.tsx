import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subject {
  id: string;
  name: string;
  color: string;
  exam_date: string | null;
  semester?: string | null;
}

interface EditSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#6366F1"
];

const SEMESTERS = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

export const EditSubjectDialog = ({
  open,
  onOpenChange,
  subject,
  onSuccess,
}: EditSubjectDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
    exam_date: "",
    semester: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        color: subject.color,
        exam_date: subject.exam_date || "",
        semester: subject.semester || "",
      });
    }
  }, [subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject) return;
    
    if (!formData.name.trim()) {
      toast.error("Please enter a subject name");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("subjects")
        .update({
          name: formData.name.trim(),
          color: formData.color,
          exam_date: formData.exam_date || null,
          semester: formData.semester || null,
        })
        .eq("id", subject.id);

      if (error) throw error;

      // Sync exam date to linked exams
      const { data: linkedExams } = await supabase
        .from("exam_subjects")
        .select("exam_id")
        .eq("subject_id", subject.id);

      if (linkedExams && linkedExams.length > 0) {
        const examIds = linkedExams.map(e => e.exam_id);
        
        if (formData.exam_date) {
          // Update linked exams with new date
          await supabase
            .from("exams")
            .update({ 
              exam_date: formData.exam_date,
              title: `${formData.name.trim()} Exam`
            })
            .in("id", examIds);
        }
      } else if (formData.exam_date) {
        // No linked exam exists, create one
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: examData } = await supabase
            .from("exams")
            .insert({
              user_id: user.id,
              title: `${formData.name.trim()} Exam`,
              exam_date: formData.exam_date,
            })
            .select()
            .single();

          if (examData) {
            await supabase
              .from("exam_subjects")
              .insert({
                exam_id: examData.id,
                subject_id: subject.id,
              });
          }
        }
      }

      toast.success("Subject updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating subject:", error);
      toast.error("Failed to update subject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Subject Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mathematics"
              maxLength={100}
              required
            />
          </div>

          <div>
            <Label htmlFor="semester">Semester</Label>
            <Select 
              value={formData.semester || "none"} 
              onValueChange={(value) => setFormData({ ...formData, semester: value === "none" ? "" : value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No semester</SelectItem>
                {SEMESTERS.map(sem => (
                  <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Color</Label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? "border-primary scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="exam_date">Exam Date (Optional)</Label>
            <Input
              id="exam_date"
              type="date"
              value={formData.exam_date}
              onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
