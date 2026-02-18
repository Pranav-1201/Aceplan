-- Add new columns to subjects table for enhanced management
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS semester text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS teacher text,
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create an index for semester filtering
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects(is_active);