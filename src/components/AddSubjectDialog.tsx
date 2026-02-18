import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { checkAndAwardBadge } from "@/lib/badgeUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required").max(100, "Name too long"),
  examDate: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color"),
  semester: z.string().optional(),
});

interface AddSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const colors = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"
];

const SEMESTERS = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

const AddSubjectDialog = ({ open, onOpenChange, onSuccess }: AddSubjectDialogProps) => {
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selectedColor, setSelectedColor] = useState(() => colors[Math.floor(Math.random() * colors.length)]);
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = subjectSchema.parse({
        name: name.trim(),
        examDate: examDate || undefined,
        color: selectedColor,
        semester: semester || undefined,
      });

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .insert({
          user_id: user.id,
          name: validated.name,
          exam_date: validated.examDate || null,
          color: validated.color,
          semester: validated.semester || null,
        })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // If exam date is provided, create an exam entry
      if (validated.examDate && subjectData) {
        const { data: examData, error: examError } = await supabase
          .from("exams")
          .insert({
            user_id: user.id,
            title: `${validated.name} Exam`,
            exam_date: validated.examDate,
          })
          .select()
          .single();

        if (examError) throw examError;

        // Link the exam to the subject
        if (examData) {
          const { error: linkError } = await supabase
            .from("exam_subjects")
            .insert({
              exam_id: examData.id,
              subject_id: subjectData.id,
            });

          if (linkError) throw linkError;
        }
      }

      // Check and award first subject badge
      await checkAndAwardBadge(user.id, 'first_subject');

      toast.success("Subject added successfully!");
      setName("");
      setExamDate("");
      setSemester("");
      setSelectedColor(colors[Math.floor(Math.random() * colors.length)]);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to add subject");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject-name">Subject Name</Label>
            <Input
              id="subject-name"
              placeholder="e.g., Mathematics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="semester">Semester</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {SEMESTERS.map(sem => (
                  <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exam-date">Exam Date (Optional)</Label>
            <Input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subject Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color ? "border-primary scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Subject"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSubjectDialog;