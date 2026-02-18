import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Subject {
  id: string;
  name: string;
  color: string;
  exam_date: string | null;
}

interface ParsedPeriod {
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  teacher?: string;
}

interface UploadTimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onSuccess: () => void;
}

export const UploadTimetableDialog = ({
  open,
  onOpenChange,
  subjects,
  onSuccess,
}: UploadTimetableDialogProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const findOrCreateSubject = async (subjectName: string, userId: string): Promise<string> => {
    // Try to find existing subject with intelligent matching
    const { data: existingSubjects } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("user_id", userId);

    if (!existingSubjects || existingSubjects.length === 0) {
      // No existing subjects, create new one
      const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { data: newSubject, error } = await supabase
        .from("subjects")
        .insert({
          name: subjectName,
          color: randomColor,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return newSubject.id;
    }

    const normalizedInput = subjectName.toLowerCase().trim();

    // 1. Exact match (case-insensitive)
    const exactMatch = existingSubjects.find(
      s => s.name.toLowerCase() === normalizedInput
    );
    if (exactMatch) return exactMatch.id;

    // 2. Check if input is an abbreviation or shortened form
    const abbreviationMatch = existingSubjects.find(s => {
      const existingName = s.name.toLowerCase();
      // Check if the existing name starts with the input (e.g., "CN" matches "Computer Networks")
      if (existingName.startsWith(normalizedInput)) return true;
      
      // Check if input matches the initials of the existing name
      const initials = s.name.split(/\s+/).map(word => word[0]?.toLowerCase()).join('');
      if (initials === normalizedInput) return true;
      
      return false;
    });
    if (abbreviationMatch) return abbreviationMatch.id;

    // 3. Check if existing subject contains the input or vice versa (fuzzy matching)
    const containsMatch = existingSubjects.find(s => {
      const existingName = s.name.toLowerCase();
      return existingName.includes(normalizedInput) || normalizedInput.includes(existingName);
    });
    if (containsMatch) return containsMatch.id;

    // 4. Calculate similarity score for very similar names (e.g., "Analytics" vs "Analysis")
    const similarityMatch = existingSubjects.find(s => {
      const existingWords = s.name.toLowerCase().split(/\s+/);
      const inputWords = normalizedInput.split(/\s+/);
      
      // Count matching words
      const matchingWords = existingWords.filter(word => 
        inputWords.some(inputWord => 
          word.includes(inputWord) || inputWord.includes(word)
        )
      );
      
      // If more than 70% of words match, consider it the same subject
      const similarity = matchingWords.length / Math.max(existingWords.length, inputWords.length);
      return similarity > 0.7;
    });
    if (similarityMatch) return similarityMatch.id;

    // No match found, create new subject
    const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { data: newSubject, error } = await supabase
      .from("subjects")
      .insert({
        name: subjectName,
        color: randomColor,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return newSubject.id;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert file to base64
      const imageBase64 = await convertFileToBase64(file);

      // Call edge function to parse timetable with existing subjects for better matching
      const { data, error } = await supabase.functions.invoke('parse-timetable', {
        body: { 
          imageBase64,
          additionalContext: instructions || undefined,
          existingSubjects: subjects.map(s => ({ name: s.name }))
        }
      });

      if (error) throw error;

      if (!data.periods || data.periods.length === 0) {
        toast.error("No periods found in the image. Please try a clearer image.");
        return;
      }

      const parsedPeriods = data.periods as ParsedPeriod[];

      // Create subjects and periods
      const periodPromises = parsedPeriods.map(async (period) => {
        const subjectId = await findOrCreateSubject(period.subject, user.id);

        // Ensure time format includes seconds
        const startTime = period.start_time.length === 5 
          ? `${period.start_time}:00` 
          : period.start_time;
        const endTime = period.end_time.length === 5 
          ? `${period.end_time}:00` 
          : period.end_time;

        return supabase.from("timetable_periods").insert({
          user_id: user.id,
          subject_id: subjectId,
          day_of_week: period.day_of_week,
          start_time: startTime,
          end_time: endTime,
          location: period.location || null,
          teacher: period.teacher || null,
        });
      });

      await Promise.all(periodPromises);

      toast.success(`Successfully imported ${parsedPeriods.length} periods from timetable`);
      setFile(null);
      setInstructions("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error uploading timetable:", error);
      toast.error(error instanceof Error ? error.message : "Failed to parse timetable");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Timetable</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Upload an image of your timetable and AI will automatically extract all periods.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="file">Timetable Image</Label>
            <input
              id="file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-sm w-full"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="Example: Each period is 50 minutes. Day starts at 1:10 PM. PE-2 means Physical Education slot 2. Labs are indicated with 'Batch1' or 'Batch2'."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[100px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Help the AI understand your timetable better by describing the format, time structure, special notations, or any unique conventions used.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setInstructions("");
                onOpenChange(false);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Parse
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
