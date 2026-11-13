-- Restrict access to public.email_otps to the service role.
--
-- The four policies below applied to every role, including the anonymous one used by the browser.
-- Row level security stays enabled on the table and no policy replaces them, so only roles that
-- bypass RLS (the service role used by edge functions) can read or write it.
-- Forward-only: do not edit earlier migrations; this file supersedes their policies.

drop policy if exists "Allow anonymous OTP creation" on public.email_otps;
drop policy if exists "Allow anonymous OTP verification" on public.email_otps;
drop policy if exists "Allow anonymous OTP updates" on public.email_otps;
drop policy if exists "Allow anonymous OTP deletion" on public.email_otps;
