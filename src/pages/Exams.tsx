import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ClipboardList, Edit, TrendingUp, TrendingDown, Award, Target, Plus, Calendar, GraduationCap, Save
} from "lucide-react";
import { format } from "date-fns";
import AddExamDialog from "@/components/AddExamDialog";
import EditExamDialog from "@/components/EditExamDialog";
import AppHeader from "@/components/AppHeader";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface Exam {
  id: string;
  title: string;
  exam_date: string;
  score: number | null;
  exam_subjects: {
    id: string;
    topics: string | null;
    subjects: {
      id: string;
      name: string;
      color: string;
      semester: string | null;
    };
  }[];
}

interface Subject {
  id: string;
  name: string;
  color: string;
  semester: string | null;
}

interface SemesterGPA {
  id?: string;
  semester: string;
  gpa: number | null;
  credits: number | null;
  manual_cgpa?: number | null;
}

const Exams = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [semesters, setSemesters] = useState<string[]>([]);
  const [semesterGPAs, setSemesterGPAs] = useState<SemesterGPA[]>([]);
  const [editingGPA, setEditingGPA] = useState<string | null>(null);
  const [gpaInputs, setGpaInputs] = useState<Record<string, { gpa: string; credits: string }>>({});
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [newSemesterNum, setNewSemesterNum] = useState("");
  const [newSemesterGPA, setNewSemesterGPA] = useState("");
  const [newSemesterCredits, setNewSemesterCredits] = useState("");
  const [manualCGPA, setManualCGPA] = useState<string>("");
  const [useManualCGPA, setUseManualCGPA] = useState(false);
  const [targetCGPA, setTargetCGPA] = useState<string>("");
  const [nextSemesterCredits, setNextSemesterCredits] = useState<string>("");

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
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [examsRes, subjectsRes, gpaRes] = await Promise.all([
        supabase
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
                color,
                semester
              )
            )
          `)
          .order("exam_date", { ascending: false }),
        supabase
          .from("subjects")
          .select("id, name, color, semester"),
        supabase
          .from("semester_gpas")
          .select("id, semester, gpa, credits")
      ]);

      if (examsRes.error) throw examsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (gpaRes.error) throw gpaRes.error;

      setExams(examsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setSemesterGPAs(gpaRes.data || []);

      // Extract unique semesters from BOTH subjects AND semester_gpas table
      const allSubjectSemesters = (subjectsRes.data || [])
        .map(s => s.semester)
        .filter(Boolean) as string[];
      
      const allGpaSemesters = (gpaRes.data || [])
        .map(g => g.semester)
        .filter(Boolean) as string[];
      
      const uniqueSemesters = [...new Set([...allSubjectSemesters, ...allGpaSemesters])];
      
      // Sort semesters numerically
      uniqueSemesters.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });
      
      setSemesters(uniqueSemesters);
      
      // Initialize GPA inputs for all semesters
      const inputs: Record<string, { gpa: string; credits: string }> = {};
      uniqueSemesters.forEach(sem => {
        const existing = (gpaRes.data || []).find(g => g.semester === sem);
        inputs[sem] = {
          gpa: existing?.gpa?.toString() || "",
          credits: existing?.credits?.toString() || ""
        };
      });
      setGpaInputs(inputs);
    } catch (error: any) {
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const saveGPA = async (semester: string) => {
    if (!user) return;
    
    const input = gpaInputs[semester];
    const gpaValue = parseFloat(input.gpa);
    const creditsValue = input.credits ? parseInt(input.credits) : null;
    
    if (isNaN(gpaValue) || gpaValue < 0 || gpaValue > 10) {
      toast.error("GPA must be between 0 and 10");
      return;
    }
    
    try {
      const existing = semesterGPAs.find(g => g.semester === semester);
      
      if (existing?.id) {
        const { error } = await supabase
          .from("semester_gpas")
          .update({ gpa: gpaValue, credits: creditsValue })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("semester_gpas")
          .insert({ user_id: user.id, semester, gpa: gpaValue, credits: creditsValue });
        if (error) throw error;
      }
      
      toast.success(`GPA saved for ${semester}`);
      setEditingGPA(null);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to save GPA");
    }
  };

  const addNewSemester = async () => {
    if (!user) return;
    
    const semNum = parseInt(newSemesterNum);
    if (isNaN(semNum) || semNum < 1 || semNum > 12) {
      toast.error("Semester number must be between 1 and 12");
      return;
    }
    
    const semesterName = `Semester ${semNum}`;
    
    if (semesters.includes(semesterName)) {
      toast.error("This semester already exists");
      return;
    }
    
    const gpaValue = newSemesterGPA ? parseFloat(newSemesterGPA) : null;
    if (gpaValue !== null && (isNaN(gpaValue) || gpaValue < 0 || gpaValue > 10)) {
      toast.error("GPA must be between 0 and 10");
      return;
    }
    
    const creditsValue = newSemesterCredits ? parseInt(newSemesterCredits) : null;
    
    try {
      if (gpaValue !== null) {
        const { error } = await supabase
          .from("semester_gpas")
          .insert({ 
            user_id: user.id, 
            semester: semesterName, 
            gpa: gpaValue, 
            credits: creditsValue 
          });
        if (error) throw error;
      }
      
      // Add to local semesters list
      setSemesters(prev => {
        const updated = [...prev, semesterName];
        updated.sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.match(/\d+/)?.[0] || "0");
          return numA - numB;
        });
        return updated;
      });
      
      // Reset form
      setNewSemesterNum("");
      setNewSemesterGPA("");
      setNewSemesterCredits("");
      setShowAddSemester(false);
      
      toast.success(`${semesterName} added successfully`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to add semester");
    }
  };

  const calculateCGPA = (upToSemester?: string): number => {
    // If manual CGPA is enabled and we're calculating overall (not up to a specific semester)
    if (useManualCGPA && manualCGPA && !upToSemester) {
      return parseFloat(manualCGPA) || 0;
    }
    
    const sortedSemesters = [...semesters].sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });
    
    let totalWeightedGPA = 0;
    let totalCredits = 0;
    let simpleSum = 0;
    let count = 0;
    
    for (const sem of sortedSemesters) {
      const gpaData = semesterGPAs.find(g => g.semester === sem);
      if (gpaData?.gpa != null) {
        const gpaValue = typeof gpaData.gpa === 'string' ? parseFloat(gpaData.gpa) : gpaData.gpa;
        const creditsValue = gpaData.credits ? (typeof gpaData.credits === 'string' ? parseInt(gpaData.credits) : gpaData.credits) : null;
        
        if (creditsValue && creditsValue > 0) {
          totalWeightedGPA += gpaValue * creditsValue;
          totalCredits += creditsValue;
        } else {
          simpleSum += gpaValue;
          count++;
        }
      }
      if (upToSemester && sem === upToSemester) break;
    }
    
    // Use weighted average if credits available, otherwise simple average
    if (totalCredits > 0) {
      return totalWeightedGPA / totalCredits;
    }
    return count > 0 ? simpleSum / count : 0;
  };

  const saveManualCGPA = async () => {
    if (!user) return;
    
    const cgpaValue = parseFloat(manualCGPA);
    if (isNaN(cgpaValue) || cgpaValue < 0 || cgpaValue > 10) {
      toast.error("CGPA must be between 0 and 10");
      return;
    }
    
    try {
      // Sync CGPA to profile
      const { error } = await supabase
        .from("profiles")
        .update({ current_cgpa: cgpaValue })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setUseManualCGPA(true);
      toast.success("CGPA saved and synced to profile");
    } catch (error: any) {
      toast.error("Failed to sync CGPA to profile");
    }
  };

  // Sync calculated CGPA to profile when semester GPAs change
  const syncCGPAToProfile = async () => {
    if (!user || useManualCGPA) return;
    
    const cgpa = calculateCGPA();
    if (cgpa > 0) {
      try {
        await supabase
          .from("profiles")
          .update({ current_cgpa: cgpa })
          .eq("id", user.id);
      } catch (error) {
        console.error("Failed to sync CGPA:", error);
      }
    }
  };

  // Trigger CGPA sync when semester GPAs change
  useEffect(() => {
    if (semesterGPAs.length > 0) {
      syncCGPAToProfile();
    }
  }, [semesterGPAs]);

  // Calculate required GPA for target CGPA
  const calculateRequiredGPA = (): { required: number | null; possible: boolean; message: string } => {
    const target = parseFloat(targetCGPA);
    const nextCredits = parseFloat(nextSemesterCredits) || 0;
    
    if (isNaN(target) || target <= 0 || target > 10) {
      return { required: null, possible: false, message: "Enter a valid target CGPA (0-10)" };
    }
    
    // Get current totals
    let totalWeightedGPA = 0;
    let totalCredits = 0;
    let simpleSum = 0;
    let count = 0;
    
    semesterGPAs.forEach((g) => {
      if (g.gpa != null) {
        const gpaValue = typeof g.gpa === 'string' ? parseFloat(g.gpa as unknown as string) : g.gpa;
        const creditsValue = g.credits ? (typeof g.credits === 'string' ? parseInt(g.credits as unknown as string) : g.credits) : null;
        
        if (creditsValue && creditsValue > 0) {
          totalWeightedGPA += gpaValue * creditsValue;
          totalCredits += creditsValue;
        } else {
          simpleSum += gpaValue;
          count++;
        }
      }
    });
    
    // If using credits-weighted calculation
    if (totalCredits > 0 && nextCredits > 0) {
      // Formula: (currentTotal + requiredGPA * nextCredits) / (totalCredits + nextCredits) = targetCGPA
      // requiredGPA = (targetCGPA * (totalCredits + nextCredits) - currentTotal) / nextCredits
      const requiredGPA = (target * (totalCredits + nextCredits) - totalWeightedGPA) / nextCredits;
      
      if (requiredGPA < 0) {
        return { 
          required: null, 
          possible: true, 
          message: `You've already achieved your target! Your current CGPA (${calculateCGPA().toFixed(2)}) exceeds ${target.toFixed(2)}`
        };
      }
      
      if (requiredGPA > 10) {
        return { 
          required: requiredGPA, 
          possible: false, 
          message: `Target not achievable in one semester. You'd need a GPA of ${requiredGPA.toFixed(2)}, which exceeds the maximum of 10`
        };
      }
      
      return { 
        required: requiredGPA, 
        possible: true, 
        message: `You need a GPA of ${requiredGPA.toFixed(2)} in the next semester (${nextCredits} credits) to achieve a CGPA of ${target.toFixed(2)}`
      };
    }
    
    // Simple average calculation (no credits)
    if (count > 0) {
      // Formula: (currentSum + requiredGPA) / (count + 1) = targetCGPA
      // requiredGPA = targetCGPA * (count + 1) - currentSum
      const requiredGPA = target * (count + 1) - simpleSum;
      
      if (requiredGPA < 0) {
        return { 
          required: null, 
          possible: true, 
          message: `You've already achieved your target! Your current CGPA (${calculateCGPA().toFixed(2)}) exceeds ${target.toFixed(2)}`
        };
      }
      
      if (requiredGPA > 10) {
        return { 
          required: requiredGPA, 
          possible: false, 
          message: `Target not achievable in one semester. You'd need a GPA of ${requiredGPA.toFixed(2)}, which exceeds the maximum of 10`
        };
      }
      
      return { 
        required: requiredGPA, 
        possible: true, 
        message: `You need a GPA of ${requiredGPA.toFixed(2)} in the next semester to achieve a CGPA of ${target.toFixed(2)}`
      };
    }
    
    // No existing data
    return { 
      required: target, 
      possible: true, 
      message: `With no previous semesters, you need a GPA of ${target.toFixed(2)} to achieve your target CGPA`
    };
  };

  // Get semester from exam's subjects (returns first subject's semester)
  const getExamSemester = (exam: Exam): string | null => {
    const firstSubjectWithSemester = exam.exam_subjects.find(es => es.subjects?.semester);
    return firstSubjectWithSemester?.subjects?.semester || null;
  };


  const today = new Date().toISOString().split('T')[0];
  const upcomingExams = exams.filter(e => e.exam_date >= today);
  const pastExams = exams.filter(e => e.exam_date < today);

  // Filter by semester if selected (using subject semester)
  const filterBySemester = (examList: Exam[]) => {
    if (semesterFilter === "all") return examList;
    return examList.filter(e => 
      e.exam_subjects.some(es => es.subjects?.semester === semesterFilter)
    );
  };

  // Statistics calculations - use filtered exams based on semester filter
  const getFilteredExamsForStats = () => {
    return filterBySemester(exams);
  };

  const calculateStats = () => {
    const filteredExams = getFilteredExamsForStats();
    const examsWithScores = filteredExams.filter(e => e.score !== null);
    
    if (examsWithScores.length === 0) {
      return { average: 0, highest: 0, lowest: 0, total: 0 };
    }

    const scores = examsWithScores.map(e => e.score as number);
    return {
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      total: examsWithScores.length
    };
  };

  const getSubjectWiseStats = () => {
    const filteredExams = getFilteredExamsForStats();
    const subjectScores: Record<string, { name: string; color: string; scores: number[]; total: number }> = {};

    filteredExams.forEach(exam => {
      if (exam.score !== null) {
        exam.exam_subjects.forEach(es => {
          if (!es.subjects) return; // Skip if subject is null
          const subjectId = es.subjects.id;
          if (!subjectScores[subjectId]) {
            subjectScores[subjectId] = {
              name: es.subjects.name,
              color: es.subjects.color,
              scores: [],
              total: 0
            };
          }
          subjectScores[subjectId].scores.push(exam.score as number);
          subjectScores[subjectId].total++;
        });
      }
    });

    return Object.values(subjectScores).map(s => ({
      name: s.name,
      color: s.color,
      average: s.scores.length > 0 ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0,
      exams: s.total
    }));
  };

  const getSemesterWiseStats = () => {
    // Always use unfiltered exams for semester-wise stats
    const semesterScores: Record<string, { scores: number[]; exams: Set<string> }> = {};

    exams.forEach(exam => {
      if (exam.score !== null) {
        exam.exam_subjects.forEach(es => {
          if (!es.subjects) return; // Skip if subject is null
          const semester = es.subjects.semester;
          if (semester) {
            if (!semesterScores[semester]) {
              semesterScores[semester] = { scores: [], exams: new Set() };
            }
            // Only count each exam once per semester
            if (!semesterScores[semester].exams.has(exam.id)) {
              semesterScores[semester].scores.push(exam.score as number);
              semesterScores[semester].exams.add(exam.id);
            }
          }
        });
      }
    });

    return Object.entries(semesterScores)
      .sort((a, b) => {
        const numA = parseInt(a[0].match(/\d+/)?.[0] || "0");
        const numB = parseInt(b[0].match(/\d+/)?.[0] || "0");
        return numA - numB;
      })
      .map(([semester, data]) => ({
        semester,
        average: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
        exams: data.exams.size
      }));
  };

  const getScoreTrend = () => {
    const filteredExams = getFilteredExamsForStats();
    return filteredExams
      .filter(e => e.score !== null)
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
      .map(e => ({
        date: format(new Date(e.exam_date), "MMM dd"),
        score: e.score,
        title: e.title
      }));
  };

  const getGPATrend = () => {
    const sortedSemesters = [...semesters].sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    return sortedSemesters.map(sem => {
      const gpaData = semesterGPAs.find(g => g.semester === sem);
      const cgpa = calculateCGPA(sem);
      return {
        semester: sem.replace("Semester ", "Sem "),
        gpa: gpaData?.gpa ?? null,
        cgpa: cgpa > 0 ? parseFloat(cgpa.toFixed(2)) : null
      };
    }).filter(item => item.gpa !== null);
  };

  const stats = calculateStats();
  const subjectStats = getSubjectWiseStats();
  const semesterStats = getSemesterWiseStats();
  const scoreTrend = getScoreTrend();
  const gpaTrend = getGPATrend();

  const chartConfig = {
    score: { label: "Score", color: "hsl(var(--primary))" },
    average: { label: "Average", color: "hsl(var(--primary))" },
    gpa: { label: "GPA", color: "hsl(var(--primary))" },
    cgpa: { label: "CGPA", color: "hsl(var(--chart-2))" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ClipboardList className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your exams...</p>
        </div>
      </div>
    );
  }

  const renderExamCard = (exam: Exam, isPast: boolean) => {
    const daysUntil = Math.ceil(
      (new Date(exam.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div
        key={exam.id}
        className="p-4 rounded-lg border hover:bg-accent/50 transition-colors space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-lg">{exam.title}</p>
              {exam.score !== null && (
                <span className="text-sm font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                  Score: {exam.score}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(exam.exam_date), "MMMM dd, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            {!isPast && (
              <div
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  daysUntil <= 7
                    ? "bg-destructive/10 text-destructive"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {daysUntil === 0 ? "Today" : `${daysUntil}d`}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {exam.exam_subjects.filter(es => es.subjects).map((es) => (
            <div
              key={es.id}
              className="flex items-center gap-1.5 text-sm bg-secondary/50 px-2 py-1 rounded"
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: es.subjects.color }}
              />
              <span>{es.subjects.name}</span>
            </div>
          ))}
        </div>
        {exam.exam_subjects.filter(es => es.subjects).some(es => es.topics) && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Topics: </span>
            {exam.exam_subjects
              .filter(es => es.subjects && es.topics)
              .map(es => `${es.subjects.name}: ${es.topics}`)
              .join(" | ")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="exams" />

      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-7 w-7" />
              Exams
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track all your exams, scores, and performance
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Exam
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Exams</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          {/* Semester Filter for all tabs */}
          {semesters.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Filter by:</Label>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {semesters.map(sem => (
                    <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <TabsContent value="all" className="space-y-4">
            {exams.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No exams yet</h3>
                  <p className="text-muted-foreground mb-4">Add your first exam to start tracking</p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Exam
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filterBySemester(exams).map(exam => renderExamCard(exam, exam.exam_date < today))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {filterBySemester(upcomingExams).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming exams</h3>
                  <p className="text-muted-foreground">You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filterBySemester(upcomingExams).map(exam => renderExamCard(exam, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {filterBySemester(pastExams).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No past exams</h3>
                  <p className="text-muted-foreground">Your exam history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filterBySemester(pastExams).map(exam => renderExamCard(exam, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Average Score</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {stats.average.toFixed(1)}
                    <Target className="h-5 w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Highest Score</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {stats.highest}
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Lowest Score</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {stats.lowest || "N/A"}
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Exams with Scores</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {stats.total}
                    <Award className="h-5 w-5 text-amber-500" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Charts in 2x2 grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* GPA Trend - always shown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">GPA Trend</CardTitle>
                  <CardDescription>Semester GPA & cumulative CGPA</CardDescription>
                </CardHeader>
                <CardContent>
                  {gpaTrend.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gpaTrend}>
                          <XAxis dataKey="semester" fontSize={12} />
                          <YAxis domain={[0, 10]} fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="gpa" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))", r: 3 }}
                            name="GPA"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cgpa" 
                            stroke="hsl(var(--chart-2))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: "hsl(var(--chart-2))", r: 3 }}
                            name="CGPA"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No GPA data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subject-wise Performance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Subject-wise Performance</CardTitle>
                  <CardDescription>Average score per subject</CardDescription>
                </CardHeader>
                <CardContent>
                  {subjectStats.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No scored exams to analyze
                    </div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectStats} layout="vertical">
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis type="category" dataKey="name" width={100} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="average" radius={[0, 4, 4, 0]}>
                            {subjectStats.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Semester-wise Performance - always shown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Semester-wise Performance</CardTitle>
                  <CardDescription>Average score per semester</CardDescription>
                </CardHeader>
                <CardContent>
                  {semesterStats.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-center">
                      <div>
                        <p className="mb-2">No semester data available</p>
                        <p className="text-sm">
                          Tip: Add subjects with semesters
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={semesterStats}>
                          <XAxis dataKey="semester" fontSize={12} />
                          <YAxis domain={[0, 100]} fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Score Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Score Trend</CardTitle>
                  <CardDescription>Your exam performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {scoreTrend.length > 1 ? (
                    <ChartContainer config={chartConfig} className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scoreTrend}>
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis domain={[0, 100]} fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))", r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Need at least 2 scored exams
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Subject breakdown table */}
            {subjectStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Subject Breakdown</CardTitle>
                  <CardDescription>Detailed performance by subject</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Subject</th>
                          <th className="text-center py-2 px-4">Exams</th>
                          <th className="text-center py-2 px-4">Average</th>
                          <th className="text-center py-2 px-4">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectStats.map((subject, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: subject.color }}
                                />
                                {subject.name}
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">{subject.exams}</td>
                            <td className="text-center py-3 px-4 font-medium">
                              {subject.average.toFixed(1)}
                            </td>
                            <td className="text-center py-3 px-4">
                              <span className={`px-2 py-1 rounded text-sm ${
                                subject.average >= 80 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : subject.average >= 60 
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}>
                                {subject.average >= 80 ? "Excellent" : subject.average >= 60 ? "Good" : "Needs Improvement"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GPA & CGPA Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Semester GPA & CGPA
                    </CardTitle>
                    <CardDescription>
                      Track your GPA for each semester and cumulative CGPA
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setShowAddSemester(true)}
                    disabled={showAddSemester}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Semester
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Add New Semester Form */}
                  {showAddSemester && (
                    <div className="border rounded-lg p-4 bg-accent/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Add New Semester</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setShowAddSemester(false);
                            setNewSemesterNum("");
                            setNewSemesterGPA("");
                            setNewSemesterCredits("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sem-num">Semester Number</Label>
                          <Input
                            id="sem-num"
                            type="number"
                            min="1"
                            max="12"
                            placeholder="e.g., 5"
                            value={newSemesterNum}
                            onChange={(e) => setNewSemesterNum(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sem-gpa">GPA (0-10)</Label>
                          <Input
                            id="sem-gpa"
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            placeholder="e.g., 8.5"
                            value={newSemesterGPA}
                            onChange={(e) => setNewSemesterGPA(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sem-credits">Credits (optional)</Label>
                          <Input
                            id="sem-credits"
                            type="number"
                            min="0"
                            placeholder="e.g., 24"
                            value={newSemesterCredits}
                            onChange={(e) => setNewSemesterCredits(e.target.value)}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button onClick={addNewSemester} className="w-full">
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {semesters.length === 0 && !showAddSemester ? (
                    <div className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No semesters added yet</p>
                      <Button onClick={() => setShowAddSemester(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Semester
                      </Button>
                    </div>
                  ) : semesters.length > 0 && (
                    <>
                      {/* Current CGPA Card with Manual Option */}
                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Current CGPA {useManualCGPA && "(Manual)"}
                              </p>
                              <p className="text-3xl font-bold text-primary">
                                {calculateCGPA() > 0 ? calculateCGPA().toFixed(2) : "N/A"}
                              </p>
                            </div>
                            <GraduationCap className="h-10 w-10 text-primary/50" />
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              placeholder="Enter CGPA manually"
                              value={manualCGPA}
                              onChange={(e) => {
                                setManualCGPA(e.target.value);
                                setUseManualCGPA(false);
                              }}
                              className="w-32"
                            />
                            <Button 
                              size="sm" 
                              onClick={saveManualCGPA}
                              disabled={!manualCGPA}
                            >
                              Set
                            </Button>
                            {useManualCGPA && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setUseManualCGPA(false);
                                  setManualCGPA("");
                                }}
                              >
                                Auto
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Semester GPA Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Semester</th>
                              <th className="text-center py-2 px-4">GPA (0-10)</th>
                              <th className="text-center py-2 px-4">Credits</th>
                              <th className="text-center py-2 px-4">CGPA (upto)</th>
                              <th className="text-center py-2 px-4">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {semesters.map((semester) => {
                              const gpaData = semesterGPAs.find(g => g.semester === semester);
                              const isEditing = editingGPA === semester;
                              const cgpaUpTo = calculateCGPA(semester);
                              
                              return (
                                <tr key={semester} className="border-b last:border-0">
                                  <td className="py-3 px-4 font-medium">{semester}</td>
                                  <td className="text-center py-3 px-4">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="10"
                                        value={gpaInputs[semester]?.gpa || ""}
                                        onChange={(e) => setGpaInputs(prev => ({
                                          ...prev,
                                          [semester]: { ...prev[semester], gpa: e.target.value }
                                        }))}
                                        className="w-20 mx-auto text-center"
                                        placeholder="0.00"
                                      />
                                    ) : (
                                      <span className={gpaData?.gpa != null ? "font-semibold" : "text-muted-foreground"}>
                                        {gpaData?.gpa != null ? Number(gpaData.gpa).toFixed(2) : "—"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-center py-3 px-4">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        min="0"
                                        value={gpaInputs[semester]?.credits || ""}
                                        onChange={(e) => setGpaInputs(prev => ({
                                          ...prev,
                                          [semester]: { ...prev[semester], credits: e.target.value }
                                        }))}
                                        className="w-20 mx-auto text-center"
                                        placeholder="Optional"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground">
                                        {gpaData?.credits || "—"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-center py-3 px-4">
                                    <span className={cgpaUpTo > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                                      {cgpaUpTo > 0 ? cgpaUpTo.toFixed(2) : "—"}
                                    </span>
                                  </td>
                                  <td className="text-center py-3 px-4">
                                    {isEditing ? (
                                      <Button
                                        size="sm"
                                        onClick={() => saveGPA(semester)}
                                      >
                                        <Save className="h-4 w-4 mr-1" />
                                        Save
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingGPA(semester)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        💡 Credits are optional. If provided, CGPA will be calculated as a weighted average.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Target CGPA Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Target CGPA Calculator
                </CardTitle>
                <CardDescription>Calculate the GPA you need to achieve your target CGPA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="target-cgpa">Target CGPA</Label>
                    <Input
                      id="target-cgpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="e.g., 8.5"
                      value={targetCGPA}
                      onChange={(e) => setTargetCGPA(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next-credits">Next Semester Credits (optional)</Label>
                    <Input
                      id="next-credits"
                      type="number"
                      min="1"
                      placeholder="e.g., 24"
                      value={nextSemesterCredits}
                      onChange={(e) => setNextSemesterCredits(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Required if you use credit-weighted CGPA</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Current CGPA</Label>
                    <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50">
                      <span className="font-semibold text-primary">
                        {calculateCGPA() > 0 ? calculateCGPA().toFixed(2) : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {targetCGPA && (
                  <div className={`rounded-lg p-4 border ${
                    calculateRequiredGPA().possible 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-destructive/10 border-destructive/30"
                  }`}>
                    <div className="flex items-start gap-3">
                      {calculateRequiredGPA().possible ? (
                        <TrendingUp className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      )}
                      <div className="space-y-1">
                        <p className={`font-medium ${
                          calculateRequiredGPA().possible ? "text-green-700 dark:text-green-400" : "text-destructive"
                        }`}>
                          {calculateRequiredGPA().required !== null && calculateRequiredGPA().possible && (
                            <>Required GPA: <span className="text-xl font-bold">{calculateRequiredGPA().required?.toFixed(2)}</span></>
                          )}
                          {calculateRequiredGPA().required === null && calculateRequiredGPA().possible && (
                            <>Target Already Achieved! 🎉</>
                          )}
                          {!calculateRequiredGPA().possible && (
                            <>Target Not Achievable</>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {calculateRequiredGPA().message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AddExamDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        subjects={subjects}
        onSuccess={fetchData}
      />

      {selectedExam && (
        <EditExamDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          subjects={subjects}
          exam={selectedExam}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Exams;
