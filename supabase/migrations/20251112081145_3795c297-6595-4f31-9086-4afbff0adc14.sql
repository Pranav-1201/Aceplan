-- Create timetable_periods table for class schedules
CREATE TABLE public.timetable_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  teacher TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view own timetable periods"
ON public.timetable_periods
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own timetable periods"
ON public.timetable_periods
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timetable periods"
ON public.timetable_periods
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timetable periods"
ON public.timetable_periods
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_timetable_periods_updated_at
BEFORE UPDATE ON public.timetable_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_timetable_periods_user_day ON public.timetable_periods(user_id, day_of_week);