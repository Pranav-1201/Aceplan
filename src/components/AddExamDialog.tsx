import { useState } from "react";
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
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { checkAndAwardBadge } from "@/lib/badgeUtils";

interface AddExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: any[];
  onSuccess: () => void;
}

interface SelectedSubject {
  id: string;
  name: string;
  topics: string;
}

const AddExamDialog = ({ open, onOpenChange, subjects, onSuccess }: AddExamDialogProps) => {
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState<Date>();
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [loading, setLoading] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create the exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          user_id: user.id,
          title: title.trim(),
          exam_date: format(examDate, "yyyy-MM-dd"),
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create exam_subjects entries
      const examSubjects = selectedSubjects.map((subject) => ({
        exam_id: exam.id,
        subject_id: subject.id,
        topics: subject.topics.trim() || null,
      }));

      const { error: subjectsError } = await supabase
        .from("exam_subjects")
        .insert(examSubjects);

      if (subjectsError) throw subjectsError;

      // Check and award first exam badge
      await checkAndAwardBadge(user.id, 'first_exam');

      toast.success("Exam added successfully!");
      setTitle("");
      setExamDate(undefined);
      setSelectedSubjects([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add exam");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Exam</DialogTitle>
          <DialogDescription>
            Create an exam and select the subjects included
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Exam"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExamDialog;
