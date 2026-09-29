-- Per-user daily quota for the AI edge functions.
--
-- public.consume_ai_quota(limit) counts one AI call for the signed-in user (auth.uid()) and
-- returns true while the user is still within `limit` calls for today, false once they are not
-- (and false when nobody is signed in). The count is one atomic upsert, so concurrent calls
-- cannot slip past the limit. Days roll over at midnight in the database's time zone.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  used integer not null default 0,
  primary key (user_id, day)
);

-- Row level security on with no policies: nobody reads or writes this table directly. Only the
-- security definer function below touches it.
alter table public.ai_usage enable row level security;

create or replace function public.consume_ai_quota(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_used integer;
begin
  if v_user is null or p_limit is null or p_limit < 1 then
    return false;
  end if;

  -- First call of the day inserts used = 1. Later calls increment only while below the limit;
  -- at the limit the update is skipped, no row comes back and the call is refused.
  insert into public.ai_usage as u (user_id, day, used)
  values (v_user, current_date, 1)
  on conflict (user_id, day) do update
    set used = u.used + 1
    where u.used < p_limit
  returning u.used into v_used;

  return v_used is not null;
end;
$$;

-- Only signed-in users may call it; the anonymous role may not.
revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
