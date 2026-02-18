import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Trash2, Edit, CheckCircle, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { EditSubjectDialog } from "./EditSubjectDialog";

interface SubjectCardProps {
  subject: any;
  onUpdate: () => void;
}

const SubjectCard = ({ subject, onUpdate }: SubjectCardProps) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [score, setScore] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("subjects").delete().eq("id", subject.id);

      if (error) throw error;

      toast.success("Subject deleted successfully");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete subject");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleAddScore = async () => {
    if (!score || isNaN(parseFloat(score))) {
      toast.error("Please enter a valid score");
      return;
    }

    setSavingScore(true);
    try {
      // Create an exam entry for this subject with the score
      const { error } = await supabase.from("exams").insert({
        user_id: subject.user_id,
        title: `${subject.name} Exam`,
        exam_date: subject.exam_date,
        score: parseFloat(score),
      });

      if (error) throw error;

      toast.success("Score added successfully");
      setShowScoreDialog(false);
      setScore("");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to add score");
    } finally {
      setSavingScore(false);
    }
  };

  const daysUntilExam = subject.exam_date
    ? Math.ceil((new Date(subject.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isExamPassed = daysUntilExam !== null && daysUntilExam < 0;
  const isExamToday = daysUntilExam === 0;

  const getExamStatus = () => {
    if (isExamPassed) {
      return (
        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Exam done
        </span>
      );
    }
    if (isExamToday) {
      return <span className="text-destructive font-medium">Exam today!</span>;
    }
    if (daysUntilExam !== null && daysUntilExam <= 7) {
      return <span className="text-destructive font-medium">{daysUntilExam} days left</span>;
    }
    if (daysUntilExam !== null) {
      return <span>{daysUntilExam} days left</span>;
    }
    return null;
  };

  return (
    <>
      <Card 
        className="hover:shadow-[var(--shadow-medium)] transition-all cursor-pointer"
        onClick={() => navigate(`/subject/${subject.id}`)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                {subject.name}
              </CardTitle>
              {subject.exam_date && (
                <CardDescription className="flex items-center gap-1 mt-2">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(subject.exam_date), "MMM dd, yyyy")}
                  {" • "}
                  {getExamStatus()}
                  {isExamPassed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 ml-2 text-xs text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowScoreDialog(true);
                      }}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add Score
                    </Button>
                  )}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditDialog(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            View materials & notes
          </div>
        </CardContent>
      </Card>

      <EditSubjectDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        subject={subject}
        onSuccess={onUpdate}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{subject.name}"? This will also delete all associated study materials. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Add Exam Score</DialogTitle>
            <DialogDescription>
              Enter the score for {subject.name} exam on {subject.exam_date ? format(new Date(subject.exam_date), "MMM dd, yyyy") : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score</Label>
              <Input
                id="score"
                type="number"
                placeholder="Enter score (e.g., 85)"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddScore} disabled={savingScore}>
              {savingScore ? "Saving..." : "Save Score"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubjectCard;