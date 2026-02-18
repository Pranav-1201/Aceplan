import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Subject {
  id: string;
  name: string;
  teacher?: string | null;
  location?: string | null;
}

interface Period {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  teacher?: string;
  notes?: string;
}

interface EditPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: Period;
  subjects: Subject[];
  onSuccess: () => void;
}

export const EditPeriodDialog = ({ open, onOpenChange, period, subjects, onSuccess }: EditPeriodDialogProps) => {
  const [formData, setFormData] = useState({
    subject_id: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    location: "",
    teacher: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (period) {
      setFormData({
        subject_id: period.subject_id,
        day_of_week: period.day_of_week.toString(),
        start_time: period.start_time.substring(0, 5),
        end_time: period.end_time.substring(0, 5),
        location: period.location || "",
        teacher: period.teacher || "",
        notes: period.notes || ""
      });
    }
  }, [period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Ensure time format includes seconds (HH:MM:SS)
      const startTime = formData.start_time.includes(':') && formData.start_time.split(':').length === 2 
        ? `${formData.start_time}:00` 
        : formData.start_time;
      const endTime = formData.end_time.includes(':') && formData.end_time.split(':').length === 2 
        ? `${formData.end_time}:00` 
        : formData.end_time;

      const { error } = await supabase
        .from("timetable_periods")
        .update({
          subject_id: formData.subject_id,
          day_of_week: parseInt(formData.day_of_week),
          start_time: startTime,
          end_time: endTime,
          location: formData.location || null,
          teacher: formData.teacher || null,
          notes: formData.notes || null
        })
        .eq("id", period.id);

      if (error) throw error;

      // Update all other periods with the same subject to have the same details
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (formData.location || formData.teacher || formData.notes)) {
        const updateData: { location?: string | null; teacher?: string | null; notes?: string | null } = {};
        if (formData.location) updateData.location = formData.location;
        if (formData.teacher) updateData.teacher = formData.teacher;
        if (formData.notes) updateData.notes = formData.notes;

        await supabase
          .from("timetable_periods")
          .update(updateData)
          .eq("user_id", user.id)
          .eq("subject_id", formData.subject_id)
          .neq("id", period.id); // Don't update the current period again
      }

      // Also update the subject's teacher and location
      if (formData.location || formData.teacher) {
        const subjectUpdateData: { location?: string | null; teacher?: string | null } = {};
        if (formData.location) subjectUpdateData.location = formData.location;
        if (formData.teacher) subjectUpdateData.teacher = formData.teacher;

        await supabase
          .from("subjects")
          .update(subjectUpdateData)
          .eq("id", formData.subject_id);
      }

      toast.success("Period updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating period:", error);
      toast.error("Failed to update period");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this period?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("timetable_periods")
        .delete()
        .eq("id", period.id);

      if (error) throw error;

      toast.success("Period deleted successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting period:", error);
      toast.error("Failed to delete period");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Class Period</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Select
              value={formData.subject_id}
              onValueChange={(value) => {
                const selectedSubject = subjects.find(s => s.id === value);
                setFormData({ 
                  ...formData, 
                  subject_id: value,
                  // Pre-fill with subject's teacher/location if changing subject
                  teacher: selectedSubject?.teacher || "",
                  location: selectedSubject?.location || ""
                });
              }}
            >
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day">Day *</Label>
            <Select
              value={formData.day_of_week}
              onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
            >
              <SelectTrigger id="day">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Room 101, Building A"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher</Label>
            <Input
              id="teacher"
              placeholder="Teacher's name"
              value={formData.teacher}
              onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <div className="flex-1 flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
