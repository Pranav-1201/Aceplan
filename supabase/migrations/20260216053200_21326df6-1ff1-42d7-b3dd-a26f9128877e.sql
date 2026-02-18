
-- Create quiz level enum
CREATE TYPE public.quiz_level AS ENUM ('quick', 'detailed', 'comprehensive');

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_level public.quiz_level NOT NULL,
  source_material_reference TEXT,
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  grading_result_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_marks INTEGER NOT NULL DEFAULT 0,
  obtained_marks NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own quiz attempts"
ON public.quiz_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quiz attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz attempts"
ON public.quiz_attempts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quiz attempts"
ON public.quiz_attempts FOR DELETE
USING (auth.uid() = user_id);
