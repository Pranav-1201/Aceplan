import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin } from "lucide-react";
import { formatTo12Hour } from "@/lib/utils";

interface Period {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string | null;
  teacher?: string | null;
  subjects?: {
    name: string;
    color: string | null;
  } | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TodayTimetable = () => {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().getDay();

  useEffect(() => {
    fetchTodayPeriods();
  }, []);

  const fetchTodayPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("timetable_periods")
        .select("*, subjects(name, color)")
        .eq("day_of_week", today)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setPeriods(data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
      onClick={() => navigate("/timetable")}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Today's Timetable — {DAYS[today]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes scheduled for today 🎉</p>
        ) : (
          <div className="space-y-2">
            {periods.map((period) => (
              <div
                key={period.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border"
              >
                <div
                  className="w-1 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: period.subjects?.color || "hsl(var(--primary))" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {period.subjects?.name || "Unknown Subject"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTo12Hour(period.start_time)} – {formatTo12Hour(period.end_time)}
                    </span>
                    {period.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {period.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3 text-right">
          Tap to view full timetable →
        </p>
      </CardContent>
    </Card>
  );
};

export default TodayTimetable;
