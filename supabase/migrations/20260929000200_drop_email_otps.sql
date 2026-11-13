-- The custom email one-time-code login has been removed in favour of Supabase's built-in auth
-- (Google sign-in plus email and password), so its table is no longer used by anything.
-- Forward-only: earlier migrations that created and restricted this table are left as history.

drop table if exists public.email_otps;
