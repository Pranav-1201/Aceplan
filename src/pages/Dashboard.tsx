import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookOpen, Plus } from "lucide-react";
import SubjectCard from "@/components/SubjectCard";
import AddSubjectDialog from "@/components/AddSubjectDialog";
import StudyTimer from "@/components/StudyTimer";
import UpcomingExams from "@/components/UpcomingExams";
import TodayTimetable from "@/components/TodayTimetable";
import AppHeader from "@/components/AppHeader";


const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubjects(data || []);
      // Trigger refresh for UpcomingExams
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="dashboard" />

      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Track your study progress and ace your exams</p>
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2 mb-6 md:mb-8">
          <UpcomingExams subjects={subjects} refreshTrigger={refreshTrigger} />
          <div className="flex flex-col gap-4 md:gap-6">
            <StudyTimer subjects={subjects} />
            <TodayTimetable />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 md:mb-6">
          <h3 className="text-xl sm:text-2xl font-semibold">Your Subjects</h3>
          <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-8 md:py-12 border-2 border-dashed rounded-lg px-4">
            <BookOpen className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg md:text-xl font-semibold mb-2">No subjects yet</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-4">Add your first subject to get started</p>
            <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Subject
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} onUpdate={fetchSubjects} />
            ))}
          </div>
        )}

        <AddSubjectDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={fetchSubjects}
        />
      </main>
    </div>
  );
};

export default Dashboard;