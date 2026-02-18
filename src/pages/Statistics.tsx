import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppHeader from "@/components/AppHeader";

interface StudySession {
  id: string;
  subject_id: string;
  date: string;
  duration: number;
  notes?: string | null;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  exam_date: string | null;
  semester: string | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const SEMESTERS = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];

const Statistics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedView, setSelectedView] = useState<'daily' | 'weekly' | 'monthly' | 'subject'>('daily');
  const [semesterFilter, setSemesterFilter] = useState<string>("all");

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
      const [sessionsRes, subjectsRes] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", user?.id)
          .order("date", { ascending: false }),
        supabase
          .from("subjects")
          .select("id, name, color, exam_date, semester")
          .eq("user_id", user?.id)
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      const rawSessions = (sessionsRes.data || []) as StudySession[];
      const filteredSessions = rawSessions.filter((session) => !session.notes || !session.notes.startsWith("Auto-saved session"));

      setSessions(filteredSessions);
      setSubjects((subjectsRes.data || []) as Subject[]);
    } catch (error: any) {
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };


  // Get filtered subjects based on semester
  const getFilteredSubjects = () => {
    if (semesterFilter === "all") return subjects;
    return subjects.filter(s => s.semester === semesterFilter);
  };

  // Get filtered sessions based on semester filter
  const getFilteredSessions = () => {
    const filteredSubjectIds = getFilteredSubjects().map(s => s.id);
    return sessions.filter(s => filteredSubjectIds.includes(s.subject_id));
  };

  const getDailyData = () => {
    const today = new Date().toISOString().split('T')[0];
    const filteredSessions = getFilteredSessions();
    const todaySessions = filteredSessions.filter(s => s.date === today);
    const filteredSubjects = getFilteredSubjects();
    
    const subjectMap = new Map();
    todaySessions.forEach(session => {
      const subject = filteredSubjects.find(s => s.id === session.subject_id);
      if (subject) {
        const current = subjectMap.get(subject.name) || 0;
        subjectMap.set(subject.name, current + Math.floor(session.duration / 60));
      }
    });

    return Array.from(subjectMap.entries()).map(([name, minutes]) => ({
      name,
      minutes
    }));
  };

  const getWeeklyData = () => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const filteredSessions = getFilteredSessions();

    const weekSessions = filteredSessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });

    const dayMap = new Map();
    weekSessions.forEach(session => {
      const day = format(new Date(session.date), 'EEE');
      const current = dayMap.get(day) || 0;
      dayMap.set(day, current + Math.floor(session.duration / 60));
    });

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return daysOfWeek.map(day => ({
      name: day,
      minutes: dayMap.get(day) || 0
    }));
  };

  const getMonthlyData = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const filteredSessions = getFilteredSessions();

    const monthSessions = filteredSessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= monthStart && sessionDate <= monthEnd;
    });

    const weekMap = new Map();
    monthSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const weekNum = Math.ceil(sessionDate.getDate() / 7);
      const weekLabel = `Week ${weekNum}`;
      const current = weekMap.get(weekLabel) || 0;
      weekMap.set(weekLabel, current + Math.floor(session.duration / 60));
    });

    return Array.from(weekMap.entries()).map(([name, minutes]) => ({
      name,
      minutes
    }));
  };

  const getSubjectWiseData = () => {
    const subjectMap = new Map();
    const filteredSessions = getFilteredSessions();
    const filteredSubjects = getFilteredSubjects();
    
    filteredSessions.forEach(session => {
      const subject = filteredSubjects.find(s => s.id === session.subject_id);
      if (subject) {
        const current = subjectMap.get(subject.name) || 0;
        subjectMap.set(subject.name, current + Math.floor(session.duration / 60));
      }
    });

    return Array.from(subjectMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getTotalTime = () => {
    let data: any[] = [];
    if (selectedView === 'daily') data = getDailyData();
    else if (selectedView === 'weekly') data = getWeeklyData();
    else if (selectedView === 'monthly') data = getMonthlyData();
    else data = getSubjectWiseData();

    const total = data.reduce((sum, item) => sum + (item.minutes || item.value || 0), 0);
    return formatTime(total);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const dailyData = getDailyData();
  const weeklyData = getWeeklyData();
  const monthlyData = getMonthlyData();
  const subjectData = getSubjectWiseData();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="statistics" />

      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8 max-w-7xl">
        <div className="mb-4 md:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Study Progress</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Track your study time with detailed visualizations</p>
        </div>

        <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)} className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4 h-auto">
              <TabsTrigger value="daily" className="text-xs sm:text-sm py-2">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs sm:text-sm py-2">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs sm:text-sm py-2">Monthly</TabsTrigger>
              <TabsTrigger value="subject" className="text-xs sm:text-sm py-2">Subject</TabsTrigger>
            </TabsList>

            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
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

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Total Study Time</CardTitle>
              <CardDescription>
                {selectedView === 'daily' && 'Today'}
                {selectedView === 'weekly' && 'This Week'}
                {selectedView === 'monthly' && 'This Month'}
                {selectedView === 'subject' && 'All Time'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{getTotalTime()}</div>
            </CardContent>
          </Card>

          {/* Daily View */}
          <TabsContent value="daily" className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Study Time</CardTitle>
                  <CardDescription>Minutes spent per subject</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[300px] sm:h-[350px]">
                      <BarChart data={dailyData} margin={{ bottom: 80, left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No study sessions recorded today
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution</CardTitle>
                  <CardDescription>Subject breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[250px] sm:h-[300px]">
                      <PieChart>
                        <Pie
                          data={dailyData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${formatTime(entry.minutes)}`}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="minutes"
                        >
                          {dailyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Weekly View */}
          <TabsContent value="weekly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Overview</CardTitle>
                <CardDescription>Study time for each day this week</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyData.some(d => d.minutes > 0) ? (
                  <ChartContainer config={{}} className="h-[300px] sm:h-[400px]">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No study sessions recorded this week
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly View */}
          <TabsContent value="monthly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Overview</CardTitle>
                <CardDescription>Study time per week this month</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ChartContainer config={{}} className="h-[300px] sm:h-[400px]">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No study sessions recorded this month
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subject-Wise View */}
          <TabsContent value="subject" className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Comparison</CardTitle>
                  <CardDescription>Total time per subject</CardDescription>
                </CardHeader>
                <CardContent>
                  {subjectData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[300px] sm:h-[400px] w-full">
                      <BarChart data={subjectData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          className="text-xs" 
                          width={120}
                          tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      No study sessions recorded
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subject Distribution</CardTitle>
                  <CardDescription>Overall time allocation</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {subjectData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[300px] sm:h-[400px] w-full max-w-full">
                      <PieChart>
                        <Pie
                          data={subjectData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${formatTime(entry.value)}`}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {subjectData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Statistics;
