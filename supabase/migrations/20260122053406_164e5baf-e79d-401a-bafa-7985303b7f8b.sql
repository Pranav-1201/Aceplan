-- Create table for semester GPAs
CREATE TABLE public.semester_gpas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  semester TEXT NOT NULL,
  gpa NUMERIC(3, 2) NOT NULL CHECK (gpa >= 0 AND gpa <= 10),
  credits INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, semester)
);

-- Enable Row Level Security
ALTER TABLE public.semester_gpas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own semester GPAs"
ON public.semester_gpas
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own semester GPAs"
ON public.semester_gpas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own semester GPAs"
ON public.semester_gpas
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own semester GPAs"
ON public.semester_gpas
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_semester_gpas_updated_at
BEFORE UPDATE ON public.semester_gpas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();