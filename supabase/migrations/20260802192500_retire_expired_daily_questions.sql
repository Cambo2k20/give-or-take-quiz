-- Expired dailies rejoin the category pool.
--
-- `is_daily` already keeps a question out of category, mixed, survival and
-- challenge play. Until now that was permanent: a question written for the
-- daily stayed locked away forever. The intended lifecycle is now
--
--   reserved (is_daily, unscheduled)
--     -> scheduled (a daily_set_questions row)
--     -> played on its date
--     -> retired into the ordinary category pool
--
-- Retiring flips the flag rather than deriving availability in every reader.
-- Every consumer -- submit_round, submit_survival_run, create_game_challenge
-- and the offline bank generator -- already filters on `is_daily`, so they all
-- pick this up with no change and no risk of a rewrite introducing a
-- regression. The game deals rounds from the committed offline bank rather
-- than from Postgres, so the flag and that bank have to move together anyway:
-- the scheduled job that calls this also regenerates the bank in the same run.

create function private.retire_expired_daily_questions()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_retired integer;
begin
  update public.questions q
  set is_daily = false
  where q.is_daily
    -- Only a question that actually ran as a daily retires. A reserved but
    -- unscheduled question stays in the pool waiting to be scheduled.
    and exists (
      select 1
      from public.daily_set_questions d
      where d.question_id = q.id
    )
    -- Every date it is scheduled for must be behind us. Today's daily is
    -- still being played, and a question held for a future date must not
    -- surface early.
    and not exists (
      select 1
      from public.daily_set_questions d
      where d.question_id = q.id
        and d.puzzle_date >= current_date
    );

  get diagnostics v_retired = row_count;
  return v_retired;
end;
$function$;

revoke all on function private.retire_expired_daily_questions()
  from public, anon, authenticated;

-- The scheduled refresh authenticates as the service role. It reaches `private`
-- only through the invoker wrapper below, so it needs usage on the schema and
-- execute on this one function -- nothing wider.
grant usage on schema private to service_role;
grant execute on function private.retire_expired_daily_questions()
  to service_role;

-- Exposed so the scheduled refresh can call it over RPC. Writing to the
-- question bank is a maintenance action, never something a player can trigger.
create function public.retire_expired_daily_questions()
returns integer
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.retire_expired_daily_questions();
$function$;

revoke all on function public.retire_expired_daily_questions()
  from public, anon, authenticated;
grant execute on function public.retire_expired_daily_questions()
  to service_role;

comment on function public.retire_expired_daily_questions() is
  'Clears is_daily on daily questions whose every scheduled date has passed, returning them to the category pool. Returns the number retired.';

comment on column public.questions.is_daily is
  'Currently reserved for the daily challenge, so excluded from category and mixed rounds. Cleared by retire_expired_daily_questions once every scheduled date has passed.';
