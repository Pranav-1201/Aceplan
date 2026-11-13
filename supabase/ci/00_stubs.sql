-- Minimal stand-ins for the parts of a Supabase project that our migrations reference, so the
-- migrations can be replayed on a plain Postgres (CI service container or a throwaway local
-- database). This is NOT Supabase: it only provides what the migrations need to run.
-- Applied first by supabase/ci/replay.sh.

-- Supabase creates these roles itself; plain Postgres does not have them.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;

-- auth.users and auth.uid(): referenced by foreign keys, triggers and every RLS policy.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- storage.buckets / storage.objects / storage.foldername(): used by the bucket setup and the
-- storage policies.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);

alter table storage.objects enable row level security;

-- Like Supabase's helper: the folder parts of an object path, without the file name.
create or replace function storage.foldername(name text) returns text[]
language sql immutable
as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
