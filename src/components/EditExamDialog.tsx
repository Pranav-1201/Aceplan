import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EditExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: any[];
  exam: any;
  onSuccess: () => void;
}

interface SelectedSubject {
  id: string;
  name: string;
  topics: string;
}

const EditExamDialog = ({ open, onOpenChange, subjects, exam, onSuccess }: EditExamDialogProps) => {
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState<Date>();
  const [score, setScore] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exam && open) {
      setTitle(exam.title);
      setExamDate(new Date(exam.exam_date));
      setScore(exam.score?.toString() || "");
      
      // Set selected subjects from exam data
      const subjects = exam.exam_subjects.map((es: any) => ({
        id: es.subjects.id,
        name: es.subjects.name,
        topics: es.topics || "",
      }));
      setSelectedSubjects(subjects);
    }
  }, [exam, open]);

  const handleSubjectToggle = (subject: any, checked: boolean) => {
    if (checked) {
      setSelectedSubjects([...selectedSubjects, { id: subject.id, name: subject.name, topics: "" }]);
    } else {
      setSelectedSubjects(selectedSubjects.filter((s) => s.id !== subject.id));
    }
  };

  const handleTopicsChange = (subjectId: string, topics: string) => {
    setSelectedSubjects(
      selectedSubjects.map((s) => (s.id === subjectId ? { ...s, topics } : s))
    );
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this exam? This action cannot be undone.")) {
      return;
    }

    setLoading(true);

    try {
      // Delete exam_subjects first (foreign key constraint)
      const { error: deleteSubjectsError } = await supabase
        .from("exam_subjects")
        .delete()
        .eq("exam_id", exam.id);

      if (deleteSubjectsError) throw deleteSubjectsError;

      // Delete the exam
      const { error: examError } = await supabase
        .from("exams")
        .delete()
        .eq("id", exam.id);

      if (examError) throw examError;

      toast.success("Exam deleted successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete exam");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter an exam title");
      return;
    }

    if (!examDate) {
      toast.error("Please select an exam date");
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    setLoading(true);

    try {
      // Update the exam
      const { error: examError } = await supabase
        .from("exams")
        .update({
          title: title.trim(),
          exam_date: format(examDate, "yyyy-MM-dd"),
          score: score.trim() ? parseFloat(score) : null,
        })
        .eq("id", exam.id);

      if (examError) throw examError;

      // Delete existing exam_subjects
      const { error: deleteError } = await supabase
        .from("exam_subjects")
        .delete()
        .eq("exam_id", exam.id);

      if (deleteError) throw deleteError;

      // Create new exam_subjects entries
      const examSubjects = selectedSubjects.map((subject) => ({
        exam_id: exam.id,
        subject_id: subject.id,
        topics: subject.topics.trim() || null,
      }));

      const { error: subjectsError } = await supabase
        .from("exam_subjects")
        .insert(examSubjects);

      if (subjectsError) throw subjectsError;

      toast.success("Exam updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update exam");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exam</DialogTitle>
          <DialogDescription>
            Update exam details and add your score
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Exam Title</Label>
            <Input
              id="title"
              placeholder="e.g., Final Exams, Midterm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Exam Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !examDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {examDate ? format(examDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={examDate}
                  onSelect={setExamDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="score">Score (Optional)</Label>
            <Input
              id="score"
              type="number"
              step="0.01"
              placeholder="e.g., 85.5 or 90"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <Label>Select Subjects</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No subjects available. Create subjects first.
              </p>
            ) : (
              <div className="space-y-3">
                {subjects.map((subject) => {
                  const isSelected = selectedSubjects.some((s) => s.id === subject.id);
                  const selectedSubject = selectedSubjects.find((s) => s.id === subject.id);

                  return (
                    <div key={subject.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={subject.id}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSubjectToggle(subject, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={subject.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </label>
                      </div>
                      {isSelected && (
                        <div className="ml-6 space-y-1">
                          <Label
                            htmlFor={`topics-${subject.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            Topics (optional)
                          </Label>
                          <Textarea
                            id={`topics-${subject.id}`}
                            placeholder="e.g., Chapter 1-5, Integration, Limits..."
                            value={selectedSubject?.topics || ""}
                            onChange={(e) => handleTopicsChange(subject.id, e.target.value)}
                            className="resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete Exam
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Exam"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditExamDialog;
