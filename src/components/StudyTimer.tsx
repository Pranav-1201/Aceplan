import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkStudySessionBadges } from "@/lib/badgeUtils";

interface StudyTimerProps {
  subjects: any[];
}


const StudyTimer = ({ subjects }: StudyTimerProps) => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [lastAutoSave, setLastAutoSave] = useState(0);

  // Load persisted timer state on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem("activeTimer");
    if (savedTimer) {
      try {
        const { startTime, subjectId, lastSave } = JSON.parse(savedTimer);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSeconds(elapsed);
        setSelectedSubjectId(subjectId);
        setIsActive(true);
        setLastAutoSave(lastSave || 0);
      } catch (error) {
        console.error("Failed to restore timer:", error);
        localStorage.removeItem("activeTimer");
      }
    }
  }, []);

  // Auto-save progress every 5 minutes (localStorage + DB backup)
  const autoSaveProgress = async (currentSeconds: number, subjectId: string) => {
    if (currentSeconds < 60) return; // Don't save sessions less than 1 minute
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedSubject = subjects.find(s => s.id === subjectId);
      const savedTimer = localStorage.getItem("activeTimer");
      
      if (savedTimer) {
        const timerData = JSON.parse(savedTimer);
        const sessionId = timerData.sessionId;

        if (sessionId) {
          // Update existing backup session
          await supabase.from("study_sessions").update({
            duration: currentSeconds,
            notes: `[IN PROGRESS] ${selectedSubject?.name || 'subject'} - Auto-backup`,
          }).eq("id", sessionId);
        } else {
          // Create initial backup session
          const { data, error } = await supabase.from("study_sessions").insert({
            user_id: user.id,
            subject_id: subjectId,
            duration: currentSeconds,
            date: new Date().toISOString().split('T')[0],
            notes: `[IN PROGRESS] ${selectedSubject?.name || 'subject'} - Auto-backup`,
          }).select().single();

          if (!error && data) {
            timerData.sessionId = data.id;
            localStorage.setItem("activeTimer", JSON.stringify(timerData));
          }
        }

        timerData.lastSave = Date.now();
        localStorage.setItem("activeTimer", JSON.stringify(timerData));
        setLastAutoSave(Date.now());
      }
      
      toast.success("Progress backed up to database", { duration: 2000 });
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  // Timer tick - recalculate from startTime instead of incrementing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let autoSaveInterval: NodeJS.Timeout | null = null;

    if (isActive) {
      // Main timer interval - update every second
      interval = setInterval(() => {
        const savedTimer = localStorage.getItem("activeTimer");
        if (savedTimer) {
          try {
            const { startTime } = JSON.parse(savedTimer);
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setSeconds(elapsed);
          } catch (error) {
            console.error("Timer calculation error:", error);
            setIsActive(false);
            localStorage.removeItem("activeTimer");
          }
        }
      }, 1000);

      // Auto-save interval - save every 5 minutes (300000ms)
      autoSaveInterval = setInterval(() => {
        const savedTimer = localStorage.getItem("activeTimer");
        if (savedTimer) {
          const { startTime, subjectId, lastSave } = JSON.parse(savedTimer);
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const timeSinceLastSave = Date.now() - (lastSave || 0);
          
          // Auto-save if more than 5 minutes since last save
          if (timeSinceLastSave > 300000 || !lastSave) {
            autoSaveProgress(elapsed, subjectId);
          }
        }
      }, 60000); // Check every minute if we need to auto-save
    } else {
      if (interval) clearInterval(interval);
      if (autoSaveInterval) clearInterval(autoSaveInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (autoSaveInterval) clearInterval(autoSaveInterval);
    };
  }, [isActive, subjects]);

  const handleStop = async () => {
    if (!selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
      const savedTimer = localStorage.getItem("activeTimer");
      const sessionId = savedTimer ? JSON.parse(savedTimer).sessionId : null;

      // Save final session (even if less than 1 minute)
      if (seconds > 0) {
        if (sessionId) {
          // Update existing backup session with final duration
          const { error } = await supabase.from("study_sessions").update({
            duration: seconds,
            notes: `Study session for ${selectedSubject?.name || 'subject'}`,
          }).eq("id", sessionId);

          if (error) throw error;
        } else {
          // Create new session if no backup exists
          const { error } = await supabase.from("study_sessions").insert({
            user_id: user.id,
            subject_id: selectedSubjectId,
            duration: seconds,
            date: new Date().toISOString().split('T')[0],
            notes: `Study session for ${selectedSubject?.name || 'subject'}`,
          });

          if (error) throw error;
        }

        // Check and award badges
        await checkStudySessionBadges(user.id, seconds);

        toast.success(`${selectedSubject?.name || 'Subject'} session saved: ${formatTime(seconds)}`);
      } else {
        // Delete any backup session if duration is 0
        if (sessionId) {
          await supabase.from("study_sessions").delete().eq("id", sessionId);
        }
        toast.info("No time recorded to save");
      }
      
      localStorage.removeItem("activeTimer");
      setSeconds(0);
      setIsActive(false);
      setLastAutoSave(0);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save study session");
    }
  };

  const handleStart = () => {
    if (!selectedSubjectId) return;
    
    const startTime = Date.now() - (seconds * 1000);
    localStorage.setItem("activeTimer", JSON.stringify({
      startTime,
      subjectId: selectedSubjectId,
      lastSave: 0,
      sessionId: null // Will be set on first auto-save
    }));
    setIsActive(true);
  };

  const handlePause = () => {
    localStorage.removeItem("activeTimer");
    setIsActive(false);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Study Timer
        </CardTitle>
        <CardDescription>
          Track your daily study time • Auto-backed up every 5 minutes to prevent data loss
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Subject</label>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={isActive}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a subject to study" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold mb-3 md:mb-4">{formatTime(seconds)}</div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {!isActive ? (
              <Button 
                onClick={handleStart} 
                className="flex-1"
                disabled={!selectedSubjectId}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <>
                <Button onClick={handlePause} variant="secondary" className="flex-1">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={handleStop} variant="outline" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Save & Reset
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyTimer;