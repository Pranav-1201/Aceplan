-- Behavioural check for public.consume_ai_quota, run by replay.sh after the migrations.
-- Leaves the database as it found it (test users are deleted at the end).

do $$
declare
  u1 uuid := '00000000-0000-0000-0000-000000000001';
  u2 uuid := '00000000-0000-0000-0000-000000000002';
begin
  insert into auth.users (id, email) values (u1, 'u1@example.test'), (u2, 'u2@example.test');

  -- Signed in as user 1 with a limit of 3: three calls pass, the rest are refused.
  perform set_config('request.jwt.claim.sub', u1::text, false);
  for i in 1..3 loop
    if not public.consume_ai_quota(3) then
      raise exception 'call % should be allowed', i;
    end if;
  end loop;
  if public.consume_ai_quota(3) then
    raise exception 'call 4 should be refused';
  end if;
  if public.consume_ai_quota(3) then
    raise exception 'call 5 should still be refused';
  end if;

  -- Another user has their own counter.
  perform set_config('request.jwt.claim.sub', u2::text, false);
  if not public.consume_ai_quota(3) then
    raise exception 'a second user must not share the first user''s limit';
  end if;

  -- Nobody signed in: refused, and no row is created.
  perform set_config('request.jwt.claim.sub', '', false);
  if public.consume_ai_quota(3) then
    raise exception 'a call with no signed-in user should be refused';
  end if;

  -- A limit below 1 refuses everything.
  perform set_config('request.jwt.claim.sub', u2::text, false);
  if public.consume_ai_quota(0) then
    raise exception 'a limit of 0 should refuse';
  end if;

  -- The counter stops at the limit instead of running past it.
  if (select used from public.ai_usage where user_id = u1) <> 3 then
    raise exception 'user 1 counter should stop at 3';
  end if;

  perform set_config('request.jwt.claim.sub', '', false);
  delete from auth.users where id in (u1, u2);
end
$$;

select 'quota checks passed' as result;
