
CREATE TABLE public.ai_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  source_material_ids JSONB DEFAULT '[]'::jsonb,
  refinement_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai notes"
  ON public.ai_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai notes"
  ON public.ai_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai notes"
  ON public.ai_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai notes"
  ON public.ai_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_ai_notes_updated_at
  BEFORE UPDATE ON public.ai_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
