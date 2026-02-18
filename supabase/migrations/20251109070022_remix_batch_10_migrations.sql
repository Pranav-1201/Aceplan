
-- Migration: 20251031090230
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date DATE,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subjects"
  ON public.subjects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subjects"
  ON public.subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects"
  ON public.subjects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects"
  ON public.subjects FOR DELETE
  USING (auth.uid() = user_id);

-- Create study materials table
CREATE TABLE public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'notes', 'video', 'link', 'other')),
  content TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study materials"
  ON public.study_materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study materials"
  ON public.study_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study materials"
  ON public.study_materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study materials"
  ON public.study_materials FOR DELETE
  USING (auth.uid() = user_id);

-- Create study sessions table for time tracking
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
  ON public.study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_materials_updated_at
  BEFORE UPDATE ON public.study_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20251031104142
-- Create storage bucket for study materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', false);

-- Create storage policies for study materials
CREATE POLICY "Users can upload their own study materials"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own study materials"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own study materials"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own study materials"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'study-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Migration: 20251101192251
-- Add new columns to profiles table for enhanced user customization
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS profession text;

-- Add check constraint for age to ensure reasonable values
ALTER TABLE public.profiles
ADD CONSTRAINT age_check CHECK (age IS NULL OR (age >= 13 AND age <= 120));

-- Migration: 20251102060648
-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own exams"
ON public.exams
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exams"
ON public.exams
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exams"
ON public.exams
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exams"
ON public.exams
FOR DELETE
USING (auth.uid() = user_id);

-- Create exam_subjects table (many-to-many with optional topics)
CREATE TABLE public.exam_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topics TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own exam subjects"
ON public.exam_subjects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_subjects.exam_id
    AND exams.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own exam subjects"
ON public.exam_subjects
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_subjects.exam_id
    AND exams.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own exam subjects"
ON public.exam_subjects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_subjects.exam_id
    AND exams.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own exam subjects"
ON public.exam_subjects
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_subjects.exam_id
    AND exams.user_id = auth.uid()
  )
);

-- Add trigger for automatic timestamp updates on exams
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251103080139
-- Add score column to exams table
ALTER TABLE public.exams ADD COLUMN score numeric(5,2);

-- Add comment to explain the score column
COMMENT ON COLUMN public.exams.score IS 'Score achieved in the exam (optional, can be percentage or points)';

-- Migration: 20251103080558
-- Add academic information fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN tenth_percentage numeric(5,2),
ADD COLUMN twelfth_percentage numeric(5,2),
ADD COLUMN current_cgpa numeric(4,2),
ADD COLUMN school_name text,
ADD COLUMN ug_college text,
ADD COLUMN pg_college text;

-- Add comments for the new columns
COMMENT ON COLUMN public.profiles.tenth_percentage IS '10th class board exam percentage';
COMMENT ON COLUMN public.profiles.twelfth_percentage IS '12th class board exam percentage';
COMMENT ON COLUMN public.profiles.current_cgpa IS 'Current CGPA in college';
COMMENT ON COLUMN public.profiles.school_name IS 'School name';
COMMENT ON COLUMN public.profiles.ug_college IS 'Undergraduate college name';
COMMENT ON COLUMN public.profiles.pg_college IS 'Postgraduate college name';

-- Migration: 20251103081119
-- Create verification codes table
CREATE TABLE public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert verification codes (for signup)
CREATE POLICY "Anyone can create verification codes"
  ON public.verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow users to verify their own codes
CREATE POLICY "Users can verify their own codes"
  ON public.verification_codes
  FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create policy to allow users to select their own codes
CREATE POLICY "Users can view their own codes"
  ON public.verification_codes
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add index for faster lookups
CREATE INDEX idx_verification_codes_email ON public.verification_codes(email);
CREATE INDEX idx_verification_codes_expires_at ON public.verification_codes(expires_at);

-- Create function to clean up expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < now();
END;
$$;

-- Migration: 20251104081222
-- Drop the verification_codes table and cleanup function
DROP TABLE IF EXISTS public.verification_codes;
DROP FUNCTION IF EXISTS public.cleanup_expired_verification_codes();

-- Migration: 20251104081924
-- Add folder field to study_materials table for organization
ALTER TABLE public.study_materials
ADD COLUMN folder text DEFAULT 'Uncategorized';

-- Migration: 20251105085142
-- Add undergraduate and postgraduate course fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN ug_course text,
ADD COLUMN pg_course text;
