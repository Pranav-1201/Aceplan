import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trophy, Calendar, BarChart3 } from "lucide-react";

const QuizHistory = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const { data: attempts, isLoading } = useQuery({
    queryKey: ["quiz-attempts", refreshTrigger],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any).from("quiz_attempts").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading history...</p>;
  if (!attempts?.length) return (
    <div className="text-center py-12 border-2 border-dashed rounded-lg">
      <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
      <p className="text-sm text-muted-foreground">Generate a quiz to see your history here</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {attempts.map((attempt: any) => {
        const percentage = attempt.total_marks > 0 ? Math.round((attempt.obtained_marks / attempt.total_marks) * 100) : 0;
        const levelColors: Record<string, string> = {
          quick: "bg-green-500/10 text-green-700 dark:text-green-400",
          detailed: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
          comprehensive: "bg-red-500/10 text-red-700 dark:text-red-400",
        };

        return (
          <Card key={attempt.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  percentage >= 80 ? "bg-green-500/10" : percentage >= 50 ? "bg-yellow-500/10" : "bg-red-500/10"
                }`}>
                  <BarChart3 className={`h-5 w-5 ${
                    percentage >= 80 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-red-600"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{percentage}%</span>
                    <span className="text-sm text-muted-foreground">({attempt.obtained_marks}/{attempt.total_marks})</span>
                    <Badge variant="outline" className={levelColors[attempt.quiz_level] || ""}>
                      {attempt.quiz_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(attempt.created_at), "MMM d, yyyy h:mm a")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default QuizHistory;
