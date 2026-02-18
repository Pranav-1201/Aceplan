import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Subject {
  id: string;
  name: string;
  teacher?: string | null;
  location?: string | null;
}

interface AddPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onSuccess: () => void;
}

export const AddPeriodDialog = ({ open, onOpenChange, subjects, onSuccess }: AddPeriodDialogProps) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Ensure time format includes seconds (HH:MM:SS)
      const startTime = formData.start_time.includes(':') && formData.start_time.split(':').length === 2 
        ? `${formData.start_time}:00` 
        : formData.start_time;
      const endTime = formData.end_time.includes(':') && formData.end_time.split(':').length === 2 
        ? `${formData.end_time}:00` 
        : formData.end_time;

      const { error } = await supabase.from("timetable_periods").insert({
        user_id: user.id,
        subject_id: formData.subject_id,
        day_of_week: parseInt(formData.day_of_week),
        start_time: startTime,
        end_time: endTime,
        location: formData.location || null,
        teacher: formData.teacher || null,
        notes: formData.notes || null
      });

      if (error) throw error;

      // Update all other periods with the same subject to have the same details
      if (formData.location || formData.teacher || formData.notes) {
        const updateData: { location?: string | null; teacher?: string | null; notes?: string | null } = {};
        if (formData.location) updateData.location = formData.location;
        if (formData.teacher) updateData.teacher = formData.teacher;
        if (formData.notes) updateData.notes = formData.notes;

        await supabase
          .from("timetable_periods")
          .update(updateData)
          .eq("user_id", user.id)
          .eq("subject_id", formData.subject_id);
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

      toast.success("Period added successfully");
      setFormData({
        subject_id: "",
        day_of_week: "",
        start_time: "",
        end_time: "",
        location: "",
        teacher: "",
        notes: ""
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding period:", error);
      toast.error("Failed to add period");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Class Period</DialogTitle>
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
                  // Pre-fill with subject's teacher/location if not already set
                  teacher: formData.teacher || selectedSubject?.teacher || "",
                  location: formData.location || selectedSubject?.location || ""
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Period"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
