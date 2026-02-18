import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Edit } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AddExamDialog from "./AddExamDialog";
import EditExamDialog from "./EditExamDialog";

interface UpcomingExamsProps {
  subjects: any[];
  refreshTrigger?: number;
}

const UpcomingExams = ({ subjects, refreshTrigger }: UpcomingExamsProps) => {
  const [exams, setExams] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);

  useEffect(() => {
    fetchExams();
  }, [refreshTrigger]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select(`
          id,
          title,
          exam_date,
          score,
          exam_subjects (
            id,
            topics,
            subjects (
              id,
              name,
              color
            )
          )
        `)
        .gte("exam_date", format(new Date(), "yyyy-MM-dd"))
        .order("exam_date", { ascending: true });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      toast.error("Failed to load exams");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                Upcoming Exams
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Stay on track with your exam schedule</CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="sm:inline">Add Exam</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {exams.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              No upcoming exams scheduled
            </p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {exams.map((exam) => {
                const daysUntil = Math.ceil(
                  (new Date(exam.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={exam.id}
                    className="p-3 md:p-4 rounded-lg border hover:bg-accent/50 transition-colors space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <p className="font-semibold text-base md:text-lg break-words">{exam.title}</p>
                          {exam.score && (
                            <span className="text-xs md:text-sm font-medium px-2 py-0.5 rounded bg-primary/10 text-primary w-fit">
                              Score: {exam.score}
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          {format(new Date(exam.exam_date), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExam(exam);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <div
                          className={`text-xs md:text-sm font-medium px-2 md:px-3 py-1 rounded-full ${
                            daysUntil <= 7
                              ? "bg-destructive/10 text-destructive"
                              : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {daysUntil === 0 ? "Today" : `${daysUntil}d`}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {exam.exam_subjects.map((examSubject: any) => (
                        <div key={examSubject.id} className="flex items-start gap-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-full mt-0.5"
                            style={{ backgroundColor: examSubject.subjects.color }}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{examSubject.subjects.name}</span>
                            {examSubject.topics && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                Topics: {examSubject.topics}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddExamDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        subjects={subjects}
        onSuccess={fetchExams}
      />

      {selectedExam && (
        <EditExamDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          subjects={subjects}
          exam={selectedExam}
          onSuccess={fetchExams}
        />
      )}
    </>
  );
};

export default UpcomingExams;