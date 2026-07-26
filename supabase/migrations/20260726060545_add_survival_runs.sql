-- Survival: answer until a guess lands outside a tightening window.
--
-- A run is variable-length, ranked by questions survived rather than points,
-- and lives in game_rounds with mode = 'survival' so rounds stay in one table
-- and round_answers keeps feeding question_stats. The window is measured in
-- rail space via slider_position(), the same space scoring uses, so it means
-- the same thing on log and linear questions.
--
-- The schedule here — start ±0.12, tighten 0.01 every 3 questions, floor
-- ±0.04 — is the SQL twin of SURVIVAL_* in lib/formats.ts. If one changes,
-- change the other in the same commit.

-- Idempotent on purpose: this DDL was first executed directly, before the
-- migration version was recorded, so every object is dropped or replaced
-- before being created. Replays cleanly on a fresh database as well.

drop view if exists public.survival_leaderboard;
drop function if exists public.submit_survival_run(jsonb);
drop function if exists private.submit_survival_run(jsonb);

-- ── A round's length now depends on its mode ────────────────────────────────

alter table public.game_rounds
  drop constraint if exists game_rounds_question_count_matches_mode;

alter table public.game_rounds
  add constraint game_rounds_question_count_matches_mode
  check (
    case mode
      when 'daily'    then question_count = 5
      when 'survival' then question_count between 1 and 500
      else question_count = 10
    end
  );

-- ── Submitting a run ────────────────────────────────────────────────────────

create function private.submit_survival_run(
  p_guesses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player     uuid := auth.uid();
  v_round      uuid;
  v_count      integer;
  v_distinct   integer;
  v_known      integer;
  v_bank       integer;
  v_first_miss bigint;
  v_survived   integer;
  v_total      integer;
begin
  if v_player is null then
    raise exception 'submit_survival_run requires a signed-in player';
  end if;

  if not public.is_email_confirmed() then
    raise exception 'confirm your email address before submitting a run';
  end if;

  if not exists (select 1 from public.profiles where id = v_player) then
    raise exception 'pick a display name before submitting a run';
  end if;

  if jsonb_typeof(p_guesses) is distinct from 'array' then
    raise exception 'guesses must be a JSON array';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(p_guesses);

  if v_count < 1 then
    raise exception 'a survival run must contain at least one guess';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    where jsonb_typeof(guess) is distinct from 'object'
       or jsonb_typeof(guess -> 'question_id') is distinct from 'string'
       or jsonb_typeof(guess -> 'guess') is distinct from 'number'
  ) then
    raise exception 'every guess must contain a question_id and numeric guess';
  end if;

  select count(distinct guess ->> 'question_id') into v_distinct
  from jsonb_array_elements(p_guesses) as item(guess);

  if v_distinct <> v_count then
    raise exception 'a survival run may not repeat a question';
  end if;

  select count(*) into v_known
  from jsonb_array_elements(p_guesses) as item(guess)
  join public.questions q on q.id = guess ->> 'question_id';

  if v_known <> v_count then
    raise exception 'every guess must reference a known question';
  end if;

  -- Daily questions are answerable only through the daily, in survival for the
  -- same reason as in category rounds: a probe here would leak their answers.
  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where q.is_daily
  ) then
    raise exception 'daily questions can only be answered through the daily';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where (guess ->> 'guess')::numeric < q.min
       or (guess ->> 'guess')::numeric > q.max
  ) then
    raise exception 'every guess must stay within its question bounds';
  end if;

  -- The rule of the game, applied by the server: every guess is judged against
  -- the window for its position in the run, and the run must end at its first
  -- miss. Integer division is the floor here, since ordinality is positive.
  with parsed as (
    select
      item.ordinality as ord,
      item.guess ->> 'question_id' as question_id,
      (item.guess ->> 'guess')::numeric as guess
    from jsonb_array_elements(p_guesses)
      with ordinality as item(guess, ordinality)
  )
  select min(judged.ord) into v_first_miss
  from (
    select
      parsed.ord,
      abs(
        public.slider_position(q.min, q.max, q.scale, q.answer)
        - public.slider_position(q.min, q.max, q.scale, parsed.guess)
      ) as distance,
      greatest(0.04, 0.12 - 0.01 * ((parsed.ord - 1) / 3)) as window
    from parsed
    join public.questions q on q.id = parsed.question_id
  ) as judged
  where judged.distance > judged.window;

  select count(*) into v_bank
  from public.questions
  where not is_daily;

  if v_first_miss is null then
    -- Every guess survived, which is only a finished run when the entire bank
    -- has been cleared. Nobody has ever been that good; the check keeps a
    -- player from banking an unfinished run while still alive.
    if v_count < v_bank then
      raise exception 'a survival run ends at its first miss';
    end if;
    v_survived := v_count;
  elsif v_first_miss <> v_count then
    raise exception 'a survival run ends at its first miss';
  else
    v_survived := v_count - 1;
  end if;

  insert into public.game_rounds (
    player_id,
    mode,
    total_score,
    question_count
  )
  values (v_player, 'survival', 0, v_count)
  returning id into v_round;

  insert into public.round_answers (
    round_id,
    question_id,
    asked_order,
    guess,
    points
  )
  select
    v_round,
    parsed.question_id,
    parsed.asked_order,
    parsed.guess,
    public.score_guess(parsed.question_id, parsed.guess)
  from (
    select
      item.ordinality::smallint as asked_order,
      item.guess ->> 'question_id' as question_id,
      (item.guess ->> 'guess')::numeric as guess
    from jsonb_array_elements(p_guesses)
      with ordinality as item(guess, ordinality)
  ) as parsed;

  select coalesce(sum(points), 0) into v_total
  from public.round_answers
  where round_id = v_round;

  if v_total not between 0 and v_count * 1000 then
    raise exception 'calculated score is outside the allowed range';
  end if;

  update public.game_rounds
  set total_score = v_total
  where id = v_round;

  return jsonb_build_object(
    'run_id', v_round,
    'survived', v_survived,
    'total_score', v_total
  );
end;
$function$;

revoke all on function private.submit_survival_run(jsonb)
  from public, anon;
grant execute on function private.submit_survival_run(jsonb)
  to authenticated;

create function public.submit_survival_run(
  p_guesses jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.submit_survival_run(p_guesses);
$function$;

revoke all on function public.submit_survival_run(jsonb)
  from public, anon;
grant execute on function public.submit_survival_run(jsonb)
  to authenticated;

comment on function public.submit_survival_run(jsonb) is
  'Records one authenticated survival run, verifying on the server that every guess beat its window and that the run ended at its first miss.';

-- ── The board ───────────────────────────────────────────────────────────────
--
-- Ranked by questions survived, not points: a different number, so it gets a
-- different board. A death-terminated run of N answers survived N - 1. The one
-- theoretical exception — a run that cleared the entire bank — would show one
-- short here; the day that happens, add a survived column and celebrate.

create view public.survival_leaderboard with (security_invoker = true) as
select
  p.id               as player_id,
  p.display_name,
  max(r.question_count - 1) as best_run,
  count(*)           as attempts,
  rank() over (
    order by max(r.question_count - 1) desc
  ) as rank
from public.game_rounds r
join public.profiles p on p.id = r.player_id
where r.mode = 'survival'
group by p.id, p.display_name;

grant select on public.survival_leaderboard to anon, authenticated;

-- ── Category rounds may not smuggle either dedicated mode ───────────────────
--
-- Recreated in full because a plpgsql body cannot be patched in place; the
-- only change is the guard, which now names survival alongside daily.

create or replace function private.submit_round(
  p_mode public.game_mode,
  p_guesses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player             uuid := auth.uid();
  v_round              uuid;
  v_count              integer;
  v_distinct           integer;
  v_known              integer;
  v_total              integer;
  v_category_count     integer;
  v_expected_categories integer :=
    cardinality(enum_range(null::public.question_category));
begin
  if v_player is null then
    raise exception 'submit_round requires a signed-in player';
  end if;

  if not public.is_email_confirmed() then
    raise exception 'confirm your email address before submitting a round';
  end if;

  if not exists (select 1 from public.profiles where id = v_player) then
    raise exception 'pick a display name before submitting a round';
  end if;

  if p_mode in ('daily', 'survival') then
    raise exception '% rounds must be submitted through their dedicated function', p_mode;
  end if;

  if jsonb_typeof(p_guesses) is distinct from 'array' then
    raise exception 'guesses must be a JSON array';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(p_guesses);

  if v_count <> 10 then
    raise exception 'a round must contain exactly 10 guesses, got %', v_count;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    where jsonb_typeof(guess) is distinct from 'object'
       or jsonb_typeof(guess -> 'question_id') is distinct from 'string'
       or jsonb_typeof(guess -> 'guess') is distinct from 'number'
  ) then
    raise exception 'every guess must contain a question_id and numeric guess';
  end if;

  select count(distinct guess ->> 'question_id') into v_distinct
  from jsonb_array_elements(p_guesses) as item(guess);

  if v_distinct <> 10 then
    raise exception 'a round must contain 10 unique questions';
  end if;

  select count(*) into v_known
  from jsonb_array_elements(p_guesses) as item(guess)
  join public.questions q on q.id = guess ->> 'question_id';

  if v_known <> 10 then
    raise exception 'every guess must reference a known question';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where q.is_daily
  ) then
    raise exception 'daily questions can only be answered through the daily';
  end if;

  if p_mode <> 'mixed' and exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where q.category::text <> p_mode::text
  ) then
    raise exception 'every question in a % round must be a % question',
      p_mode, p_mode;
  end if;

  if p_mode = 'mixed' then
    select count(distinct q.category) into v_category_count
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id';

    if v_category_count <> v_expected_categories then
      raise exception 'a mixed round must include every question category';
    end if;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where (guess ->> 'guess')::numeric < q.min
       or (guess ->> 'guess')::numeric > q.max
  ) then
    raise exception 'every guess must stay within its question bounds';
  end if;

  insert into public.game_rounds (
    player_id,
    mode,
    total_score,
    question_count
  )
  values (v_player, p_mode, 0, 10)
  returning id into v_round;

  insert into public.round_answers (
    round_id,
    question_id,
    asked_order,
    guess,
    points
  )
  select
    v_round,
    parsed.question_id,
    parsed.asked_order,
    parsed.guess,
    public.score_guess(parsed.question_id, parsed.guess)
  from (
    select
      item.ordinality::smallint as asked_order,
      item.guess ->> 'question_id' as question_id,
      (item.guess ->> 'guess')::numeric as guess
    from jsonb_array_elements(p_guesses)
      with ordinality as item(guess, ordinality)
  ) as parsed;

  select coalesce(sum(points), 0) into v_total
  from public.round_answers
  where round_id = v_round;

  if v_total not between 0 and 10000 then
    raise exception 'calculated score is outside the allowed range';
  end if;

  update public.game_rounds
  set total_score = v_total
  where id = v_round;

  return jsonb_build_object(
    'round_id', v_round,
    'total_score', v_total
  );
end;
$function$;
