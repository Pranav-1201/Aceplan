import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, Plus, Edit, Trash2, MapPin, GraduationCap, Calendar, Archive, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddSubjectWithDetailsDialog from "@/components/AddSubjectWithDetailsDialog";
import EditSubjectWithDetailsDialog from "@/components/EditSubjectWithDetailsDialog";
import AppHeader from "@/components/AppHeader";

interface Subject {
  id: string;
  name: string;
  color: string;
  exam_date: string | null;
  semester: string | null;
  location: string | null;
  teacher: string | null;
  is_active: boolean;
  created_at: string;
}

const SEMESTERS = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

const MySubjects = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [deleting, setDeleting] = useState(false);

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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubjects((data as Subject[]) || []);
    } catch (error: any) {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!deletingSubject) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", deletingSubject.id);

      if (error) throw error;

      toast.success("Subject deleted successfully");
      fetchSubjects();
    } catch (error: any) {
      toast.error("Failed to delete subject");
    } finally {
      setDeleting(false);
      setDeletingSubject(null);
    }
  };

  const handleArchive = async (subject: Subject) => {
    try {
      const { error } = await supabase
        .from("subjects")
        .update({ is_active: !subject.is_active })
        .eq("id", subject.id);

      if (error) throw error;

      toast.success(subject.is_active ? "Subject archived" : "Subject restored");
      fetchSubjects();
    } catch (error: any) {
      toast.error("Failed to update subject");
    }
  };

  const activeSubjects = subjects.filter(s => s.is_active);
  const archivedSubjects = subjects.filter(s => !s.is_active);

  const getFilteredSubjects = (subjectList: Subject[]) => {
    if (selectedSemester === "all") return subjectList;
    return subjectList.filter(s => s.semester === selectedSemester);
  };

  const getSemestersFromSubjects = () => {
    const sems = new Set(subjects.map(s => s.semester).filter(Boolean));
    return Array.from(sems).sort();
  };

  const groupBySemester = (subjectList: Subject[]) => {
    const grouped: Record<string, Subject[]> = {};
    subjectList.forEach(subject => {
      const sem = subject.semester || "Unassigned";
      if (!grouped[sem]) grouped[sem] = [];
      grouped[sem].push(subject);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading subjects...</p>
        </div>
      </div>
    );
  }

  const SubjectCard = ({ subject }: { subject: Subject }) => (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: subject.color }}
              />
              {subject.name}
            </CardTitle>
            {subject.semester && (
              <Badge variant="secondary" className="mt-2">
                {subject.semester}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingSubject(subject)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchive(subject)}
              title={subject.is_active ? "Archive" : "Restore"}
            >
              {subject.is_active ? <Archive className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeletingSubject(subject)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {subject.teacher && (
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>{subject.teacher}</span>
          </div>
        )}
        {subject.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{subject.location}</span>
          </div>
        )}
        {subject.exam_date && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(subject.exam_date), "MMM dd, yyyy")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSubjectGrid = (subjectList: Subject[]) => {
    if (subjectList.length === 0) {
      return (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No subjects found</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjectList.map(subject => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    );
  };

  const renderGroupedSubjects = (subjectList: Subject[]) => {
    const grouped = groupBySemester(subjectList);
    const sortedSemesters = Object.keys(grouped).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });

    if (sortedSemesters.length === 0) {
      return (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No archived subjects</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {sortedSemesters.map(semester => (
          <div key={semester}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Badge variant="outline">{semester}</Badge>
              <span className="text-muted-foreground text-sm">
                ({grouped[semester].length} subject{grouped[semester].length !== 1 ? 's' : ''})
              </span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[semester].map(subject => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="my-subjects" />

      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Manage Subjects</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Add, edit, and organize your subjects by semester
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeSubjects.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Past/Archived ({archivedSubjects.length})
              </TabsTrigger>
            </TabsList>

            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {SEMESTERS.map(sem => (
                  <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="active">
            {renderSubjectGrid(getFilteredSubjects(activeSubjects))}
          </TabsContent>

          <TabsContent value="archived">
            {renderGroupedSubjects(getFilteredSubjects(archivedSubjects))}
          </TabsContent>
        </Tabs>
      </main>

      <AddSubjectWithDetailsDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchSubjects}
      />

      {editingSubject && (
        <EditSubjectWithDetailsDialog
          open={!!editingSubject}
          onOpenChange={(open) => !open && setEditingSubject(null)}
          subject={editingSubject}
          onSuccess={fetchSubjects}
        />
      )}

      <AlertDialog open={!!deletingSubject} onOpenChange={(open) => !open && setDeletingSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSubject?.name}"? This will also delete all associated study materials. This action cannot be undone.
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
    </div>
  );
};

export default MySubjects;