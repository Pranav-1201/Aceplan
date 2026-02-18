-- Enforce a maximum of 24 hours of study time per user per day

CREATE OR REPLACE FUNCTION public.validate_daily_study_time()
RETURNS trigger AS $$
DECLARE
  total_seconds INTEGER;
BEGIN
  -- Calculate total existing duration for this user and date (in seconds)
  SELECT COALESCE(SUM(duration), 0) INTO total_seconds
  FROM public.study_sessions
  WHERE user_id = NEW.user_id
    AND date = NEW.date
    -- Exclude the current row when updating
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  -- Prevent total from exceeding 24 hours (86,400 seconds)
  IF total_seconds + NEW.duration > 86400 THEN
    RAISE EXCEPTION 'Total study time per day cannot exceed 24 hours.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Attach trigger to study_sessions table
DROP TRIGGER IF EXISTS validate_daily_study_time_trigger ON public.study_sessions;

CREATE TRIGGER validate_daily_study_time_trigger
BEFORE INSERT OR UPDATE ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_daily_study_time();