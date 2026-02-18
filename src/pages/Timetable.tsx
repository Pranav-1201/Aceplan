import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Trash2, Settings, Printer } from "lucide-react";
import { toast } from "sonner";
import { AddPeriodDialog } from "@/components/AddPeriodDialog";
import { EditPeriodDialog } from "@/components/EditPeriodDialog";
import { UploadTimetableDialog } from "@/components/UploadTimetableDialog";
import { ClearTimetableDialog } from "@/components/ClearTimetableDialog";
import { ManageSubjectsDialog } from "@/components/ManageSubjectsDialog";
import { formatTo12Hour } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

interface Period {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  teacher?: string;
  notes?: string;
  subjects?: Subject;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper function to generate time slots based on periods
const generateTimeSlots = (periods: Period[]) => {
  if (periods.length === 0) {
    // Default time slots if no periods exist
    return Array.from({ length: 14 }, (_, i) => {
      const hour = i + 7;
      return `${hour.toString().padStart(2, '0')}:00`;
    });
  }

  // Collect all unique start times from periods - these are the row headers
  const uniqueTimes = new Set<string>();
  periods.forEach(p => {
    const startTime = p.start_time.substring(0, 5); // HH:MM
    uniqueTimes.add(startTime);
  });

  // Sort times chronologically
  return Array.from(uniqueTimes).sort();
};

const Timetable = () => {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri by default
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (periods.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print the timetable");
      return;
    }

    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
        h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 8px; text-align: center; }
        th { background-color: #f0f0f0; font-weight: 600; }
        .period-cell { padding: 6px; border-radius: 4px; text-align: left; }
        .period-name { font-weight: 600; font-size: 12px; }
        .period-time { font-size: 10px; color: #666; margin-top: 2px; }
        .period-location { font-size: 10px; color: #666; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    `;

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Time</th>
            ${activeDays.map(day => `<th>${DAYS[day]}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${timeSlots.map(timeSlot => {
            const cells = activeDays.map(day => {
              if (isPeriodSpanning(day, timeSlot)) {
                return '';
              }
              const period = getPeriodForSlot(day, timeSlot);
              const rowSpan = period ? getRowSpan(period) : 1;
              
              if (period) {
                return `<td rowspan="${rowSpan}">
                  <div class="period-cell" style="background-color: ${period.subjects?.color}20; border-left: 3px solid ${period.subjects?.color};">
                    <div class="period-name">${period.subjects?.name || ''}</div>
                    <div class="period-time">${formatTo12Hour(period.start_time.substring(0, 5))} - ${formatTo12Hour(period.end_time.substring(0, 5))}</div>
                    ${period.location ? `<div class="period-location">${period.location}</div>` : ''}
                  </div>
                </td>`;
              }
              return `<td rowspan="${rowSpan}"></td>`;
            }).join('');
            
            return `<tr><td>${formatTo12Hour(timeSlot)}</td>${cells}</tr>`;
          }).join('')}
        </tbody>
      </table>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Class Timetable</title>
          ${styles}
        </head>
        <body>
          <h1>Class Timetable</h1>
          ${tableHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const [periodsData, subjectsData] = await Promise.all([
        supabase
          .from("timetable_periods")
          .select("*, subjects(*)")
          .order("day_of_week")
          .order("start_time"),
        supabase.from("subjects").select("*")
      ]);

      if (periodsData.error) throw periodsData.error;
      if (subjectsData.error) throw subjectsData.error;

      const periodsArray = periodsData.data || [];
      setPeriods(periodsArray);
      setSubjects(subjectsData.data || []);

      // Generate time slots based on periods
      const slots = generateTimeSlots(periodsArray);
      setTimeSlots(slots);

      // Determine active days from existing periods
      const uniqueDays = [...new Set(periodsArray.map(p => p.day_of_week))];
      if (uniqueDays.length > 0) {
        setActiveDays(uniqueDays.sort());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodForSlot = (day: number, timeSlot: string) => {
    return periods.find(p => {
      if (p.day_of_week !== day) return false;
      
      const periodStart = p.start_time.substring(0, 5);
      
      // Period should display only at its start time slot
      return periodStart === timeSlot;
    });
  };

  const getRowSpan = (period: Period) => {
    const periodStart = period.start_time.substring(0, 5);
    const periodEnd = period.end_time.substring(0, 5);
    
    const startIndex = timeSlots.indexOf(periodStart);
    if (startIndex === -1) return 1;
    
    // Find how many time slots this period should span
    // Count slots that are >= start and < end
    let span = 0;
    for (let i = startIndex; i < timeSlots.length; i++) {
      if (timeSlots[i] < periodEnd) {
        span++;
      } else {
        break;
      }
    }
    
    // If the period extends beyond all time slots, span to the end
    if (span === 0) span = 1;
    
    return span;
  };

  const isPeriodSpanning = (day: number, timeSlot: string) => {
    // Check if this time slot is within any period that started at an earlier slot
    return periods.some(p => {
      if (p.day_of_week !== day) return false;
      
      const periodStart = p.start_time.substring(0, 5);
      const periodEnd = p.end_time.substring(0, 5);
      
      // This slot is spanned if:
      // 1. The period started before this slot (periodStart < timeSlot)
      // 2. The period hasn't ended yet (timeSlot < periodEnd)
      return periodStart < timeSlot && timeSlot < periodEnd;
    });
  };

  const handlePeriodClick = (period: Period) => {
    setSelectedPeriod(period);
  };

  const handleClearTimetable = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("timetable_periods")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Timetable cleared successfully");
      setIsClearDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error clearing timetable:", error);
      toast.error("Failed to clear timetable");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="timetable" />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Class Timetable</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your weekly class schedule</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsUploadDialogOpen(true)} variant="outline" className="flex-1 sm:flex-none">
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Period</span>
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none" disabled={periods.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsManageSubjectsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Subjects
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsClearDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Timetable
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {subjects.length === 0 ? (
          <Card>
            <CardContent className="p-4 md:p-6">
              <p className="text-sm md:text-base text-muted-foreground text-center">
                Please add subjects first before creating your timetable.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl">Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 md:p-6">
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="border border-border bg-muted p-1.5 sm:p-2 text-left font-semibold text-xs sm:text-sm min-w-[60px] sm:min-w-[80px]">
                        Time
                      </th>
                      {activeDays.map(day => (
                        <th key={day} className="border border-border bg-muted p-1.5 sm:p-2 text-center font-semibold text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                          <span className="hidden sm:inline">{DAYS[day]}</span>
                          <span className="sm:hidden">{DAYS[day].slice(0, 3)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(timeSlot => (
                      <tr key={timeSlot}>
                        <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm font-medium bg-muted/50">
                          {formatTo12Hour(timeSlot)}
                        </td>
                        {activeDays.map(day => {
                          // Skip this cell if it's part of a period spanning from above
                          if (isPeriodSpanning(day, timeSlot)) {
                            return null;
                          }

                          const period = getPeriodForSlot(day, timeSlot);
                          const rowSpan = period ? getRowSpan(period) : 1;
                          
                          return (
                            <td
                              key={`${day}-${timeSlot}`}
                              rowSpan={rowSpan}
                              className="border border-border p-1 sm:p-2 hover:bg-accent/50 transition-colors cursor-pointer"
                              onClick={() => period && handlePeriodClick(period)}
                            >
                              {period ? (
                                <div
                                  className="p-1.5 sm:p-2 rounded text-xs sm:text-sm h-full flex flex-col"
                                  style={{
                                    backgroundColor: period.subjects?.color + "20",
                                    borderLeft: `3px solid ${period.subjects?.color}`
                                  }}
                                >
                                  <div className="font-semibold truncate">{period.subjects?.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formatTo12Hour(period.start_time.substring(0, 5))} - {formatTo12Hour(period.end_time.substring(0, 5))}
                                  </div>
                                  {period.location && (
                                    <div className="text-xs text-muted-foreground truncate hidden sm:block">{period.location}</div>
                                  )}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <AddPeriodDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        subjects={subjects.filter(s => s.is_active)}
        onSuccess={fetchData}
      />

      {selectedPeriod && (
        <EditPeriodDialog
          open={!!selectedPeriod}
          onOpenChange={(open) => !open && setSelectedPeriod(null)}
          period={selectedPeriod}
          subjects={subjects.filter(s => s.is_active)}
          onSuccess={fetchData}
        />
      )}

      <UploadTimetableDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        subjects={subjects.filter(s => s.is_active)}
        onSuccess={fetchData}
      />

      <ClearTimetableDialog
        open={isClearDialogOpen}
        onOpenChange={setIsClearDialogOpen}
        onConfirm={handleClearTimetable}
      />

      <ManageSubjectsDialog
        open={isManageSubjectsOpen}
        onOpenChange={setIsManageSubjectsOpen}
        subjects={subjects}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default Timetable;
