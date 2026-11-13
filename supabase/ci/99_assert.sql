-- Checks run after every migration has been applied. Any failure aborts replay.sh.

-- Every table in the public schema must have row level security switched on.
do $$
declare
  unprotected text;
begin
  select string_agg(tablename, ', ' order by tablename)
    into unprotected
  from pg_tables
  where schemaname = 'public' and not rowsecurity;

  if unprotected is not null then
    raise exception 'row level security is off for: %', unprotected;
  end if;
end
$$;

-- No policy on a public table may allow everything (a bare `true` condition applies to every
-- role, including the anonymous one that ships in the browser bundle).
do $$
declare
  permissive text;
begin
  select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
    into permissive
  from pg_policies
  where schemaname = 'public'
    and (qual = 'true' or with_check = 'true');

  if permissive is not null then
    raise exception 'policies that allow everything: %', permissive;
  end if;
end
$$;

-- Print what was built so the CI log shows the table list and count, not just "ok".
select count(*) as public_tables from pg_tables where schemaname = 'public';
select tablename from pg_tables where schemaname = 'public' order by tablename;
