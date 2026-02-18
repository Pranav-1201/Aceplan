import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";

const QuizStats = () => {
  const { data: attempts, isLoading } = useQuery({
    queryKey: ["quiz-attempts-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any).from("quiz_attempts").select("*").order("created_at", { ascending: true });
      return data || [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading statistics...</p>;
  if (!attempts?.length) return (
    <div className="text-center py-12 border-2 border-dashed rounded-lg">
      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">No quiz data yet</h3>
      <p className="text-sm text-muted-foreground">Complete some quizzes to see statistics</p>
    </div>
  );

  // Score progression
  const progressionData = attempts.map((a: any) => ({
    date: format(new Date(a.created_at), "MMM d"),
    percentage: a.total_marks > 0 ? Math.round((a.obtained_marks / a.total_marks) * 100) : 0,
  }));

  // Performance by level
  const levelMap: Record<string, { total: number; count: number }> = {};
  attempts.forEach((a: any) => {
    if (!levelMap[a.quiz_level]) levelMap[a.quiz_level] = { total: 0, count: 0 };
    const pct = a.total_marks > 0 ? Math.round((a.obtained_marks / a.total_marks) * 100) : 0;
    levelMap[a.quiz_level].total += pct;
    levelMap[a.quiz_level].count += 1;
  });
  const levelData = Object.entries(levelMap).map(([level, d]) => ({
    level: level.charAt(0).toUpperCase() + level.slice(1),
    avgScore: Math.round(d.total / d.count),
  }));

  // Accuracy pie
  let totalCorrect = 0;
  let totalWrong = 0;
  attempts.forEach((a: any) => {
    totalCorrect += a.obtained_marks;
    totalWrong += (a.total_marks - a.obtained_marks);
  });
  const pieData = [
    { name: "Correct", value: totalCorrect },
    { name: "Incorrect", value: totalWrong },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{attempts.length}</p>
            <p className="text-sm text-muted-foreground">Quizzes Taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">
              {Math.round(progressionData.reduce((s: number, d: any) => s + d.percentage, 0) / progressionData.length)}%
            </p>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">
              {Math.max(...progressionData.map((d: any) => d.percentage))}%
            </p>
            <p className="text-sm text-muted-foreground">Best Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Line chart - progression */}
      <Card>
        <CardHeader><CardTitle className="text-base">Score Progression</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progressionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Bar chart - by level */}
        <Card>
          <CardHeader><CardTitle className="text-base">Avg Score by Level</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="level" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="avgScore" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart - accuracy */}
        <Card>
          <CardHeader><CardTitle className="text-base">Overall Accuracy</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizStats;
