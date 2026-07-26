-- Let a player ahead of UTC submit the day they are actually playing.
--
-- The client resolves "today" from the device's own calendar (lib/daily.ts
-- deliberately uses local time, so the puzzle does not flip at a stranger's
-- midnight), but current_date here is UTC. A player in UTC+n therefore spends
-- the first n hours of their day holding a puzzle the server calls the future,
-- and their round is refused with 'that daily has not been published yet'.
--
-- One day of slack covers every real offset, UTC+14 included. It publishes
-- nothing early: the schedule already ships inside the JS bundle, so the RLS
-- seal on daily_sets only ever protected the database's copy, and it stays as
-- it is. The set still has to exist, so a date beyond the schedule is refused
-- exactly as before.
--
-- Recreated in full because a plpgsql body cannot be patched in place; the only
-- change is the `current_date + 1` in the publication check.

create or replace function private.submit_daily_round(
  p_date date,
  p_guesses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player   uuid := auth.uid();
  v_round    uuid;
  v_count    integer;
  v_distinct integer;
  v_matched  integer;
  v_total    integer;
begin
  if v_player is null then
    raise exception 'submit_daily_round requires a signed-in player';
  end if;

  if not public.is_email_confirmed() then
    raise exception 'confirm your email address before submitting a round';
  end if;

  if not exists (select 1 from public.profiles where id = v_player) then
    raise exception 'pick a display name before submitting a round';
  end if;

  if p_date is null or p_date > current_date + 1 then
    raise exception 'that daily has not been published yet';
  end if;

  if not exists (
    select 1 from public.daily_sets where puzzle_date = p_date
  ) then
    raise exception 'no daily was published for %', p_date;
  end if;

  if jsonb_typeof(p_guesses) is distinct from 'array' then
    raise exception 'guesses must be a JSON array';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(p_guesses);

  if v_count <> 5 then
    raise exception 'a daily must contain exactly 5 guesses, got %', v_count;
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

  if v_distinct <> 5 then
    raise exception 'a daily must contain 5 unique questions';
  end if;

  -- The whole point of a daily: the answers must be to that day's questions,
  -- not to ten questions of the player's choosing.
  select count(*) into v_matched
  from jsonb_array_elements(p_guesses) as item(guess)
  join public.daily_set_questions d
    on d.question_id = guess ->> 'question_id'
   and d.puzzle_date = p_date;

  if v_matched <> 5 then
    raise exception 'every guess must answer a question from the % daily', p_date;
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
    question_count,
    puzzle_date
  )
  values (v_player, 'daily', 0, 5, p_date)
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

  if v_total not between 0 and 5000 then
    raise exception 'calculated score is outside the allowed range';
  end if;

  update public.game_rounds
  set total_score = v_total
  where id = v_round;

  return jsonb_build_object(
    'round_id', v_round,
    'total_score', v_total,
    'puzzle_date', p_date
  );
end;
$function$;
