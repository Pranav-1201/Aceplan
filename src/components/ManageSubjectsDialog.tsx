import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import EditSubjectWithDetailsDialog from "./EditSubjectWithDetailsDialog";

interface Subject {
  id: string;
  name: string;
  color: string;
  exam_date: string | null;
  semester: string | null;
  location: string | null;
  teacher: string | null;
  is_active: boolean;
}

interface ManageSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onSuccess: () => void;
}

export const ManageSubjectsDialog = ({
  open,
  onOpenChange,
  subjects,
  onSuccess,
}: ManageSubjectsDialogProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleDeleteSubject = async (subjectId: string) => {
    setDeletingId(subjectId);
    try {
      // First delete all timetable periods for this subject
      const { error: periodsError } = await supabase
        .from("timetable_periods")
        .delete()
        .eq("subject_id", subjectId);

      if (periodsError) throw periodsError;

      // Then delete the subject
      const { error: subjectError } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId);

      if (subjectError) throw subjectError;

      toast.success("Subject deleted successfully");
      setSubjectToDelete(null);
      onSuccess();
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Subjects</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No subjects created yet.
              </p>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Deleting a subject will also remove all its timetable periods.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="font-medium">{subject.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSubjectToEdit(subject);
                            setShowEditDialog(true);
                          }}
                          disabled={deletingId === subject.id}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSubjectToDelete(subject)}
                          disabled={deletingId === subject.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {subjectToEdit && (
        <EditSubjectWithDetailsDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          subject={subjectToEdit}
          onSuccess={onSuccess}
        />
      )}

      <AlertDialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{subjectToDelete?.name}&quot; and all its timetable periods. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => subjectToDelete && handleDeleteSubject(subjectToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
