-- Which daily attempt counts.
--
-- A daily is a fixed set of five questions, so replaying it is replaying
-- questions you already know the answers to. That has to be worth nothing:
-- no rank on the board, and no XP. Classic and Survival are unaffected —
-- they draw fresh questions each time, so there is nothing to farm.
--
-- The first attempt inside the puzzle's own window becomes official. Everything
-- after it, and every archive run, is practice.

alter table public.game_rounds
  add column is_official boolean not null default false;

comment on column public.game_rounds.is_official is
  'The one daily attempt that counts for this player and date. Always false for Classic and Survival.';

-- The earliest attempt wins, matching the tie-break the boards already use.
update public.game_rounds r
set is_official = true
from (
  select distinct on (player_id, puzzle_date) id
  from public.game_rounds
  where mode = 'daily'
  order by player_id, puzzle_date, created_at asc, id asc
) earliest
where r.id = earliest.id;

-- Officiality is a daily concept; nothing else may claim it.
alter table public.game_rounds
  add constraint game_rounds_official_is_daily
  check (not is_official or mode = 'daily');

-- The actual guarantee. A second official round cannot exist, whatever the
-- application layer believes.
create unique index game_rounds_one_official_daily
  on public.game_rounds (player_id, puzzle_date)
  where is_official;

-- ── XP ──────────────────────────────────────────────────────────────────────
--
-- player_category_xp summed every answer ever recorded, with no filter at all,
-- which let a fixed five-question puzzle be replayed for XP indefinitely.
-- Practice daily rounds are now excluded. Column list is unchanged, so the
-- dependent player_progress view carries on untouched.

create or replace view public.player_category_xp with (security_invoker = true) as
select
  r.player_id,
  q.category,
  floor(sum(a.points) / 10.0)::integer as xp,
  count(*)::integer                    as questions_answered,
  count(*) filter (where a.points >= 980)::integer as perfect_answers
from public.round_answers a
join public.game_rounds r on r.id = a.round_id
join public.questions q on q.id = a.question_id
where r.mode <> 'daily' or r.is_official
group by r.player_id, q.category;

comment on view public.player_category_xp is
  'Earned XP per subject. Practice and archive daily rounds are excluded; a fixed puzzle must not be farmable.';

-- ── The board ───────────────────────────────────────────────────────────────
--
-- Official rounds only, so a player appears once per date with the score that
-- counts rather than their best of several tries. Ranked by score, then by who
-- finished first, then by player id so the order is total and stable.
--
-- `best_score` and `attempts` are kept, in their original positions, purely so
-- the deployed client keeps working; this replaces the view in place rather
-- than dropping it. Retire both once the client reads `score` instead.

create or replace view public.daily_leaderboard with (security_invoker = true) as
select
  r.puzzle_date,
  p.id           as player_id,
  p.display_name,
  r.total_score  as best_score,
  (
    select count(*)
    from public.game_rounds a
    where a.player_id = r.player_id
      and a.puzzle_date = r.puzzle_date
      and a.mode = 'daily'
  )              as attempts,
  rank() over (
    partition by r.puzzle_date
    order by r.total_score desc, r.created_at asc, p.id asc
  )              as rank,
  r.total_score  as score,
  r.created_at   as completed_at
from public.game_rounds r
join public.profiles p on p.id = r.player_id
where r.mode = 'daily'
  and r.is_official;

comment on view public.daily_leaderboard is
  'Official daily results, one row per player per date, ranked by score then completion time.';

-- ── Submitting ──────────────────────────────────────────────────────────────
--
-- Recreated in full because a plpgsql body cannot be patched in place. The only
-- changes are the officiality decision, the unique-violation fallback, and the
-- two extra fields in the returned object.
--
-- The official window is current_date +/- 1. The client resolves "today" from
-- the device calendar, so a player at UTC+14 can be a day ahead of the server
-- and one at UTC-11 a day behind; both must be able to file today's puzzle as
-- official. The cost is that yesterday stays officially playable for everyone,
-- which is the looser of the two failure modes and the one that does not
-- refuse a legitimate round.

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
  v_player         uuid := auth.uid();
  v_round          uuid;
  v_count          integer;
  v_distinct       integer;
  v_matched        integer;
  v_total          integer;
  v_official       boolean;
  v_official_score integer;
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
  -- not to five questions of the player's choosing.
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

  -- The first attempt inside the window counts. Everything else is practice.
  v_official :=
    p_date between current_date - 1 and current_date + 1
    and not exists (
      select 1
      from public.game_rounds
      where player_id = v_player
        and puzzle_date = p_date
        and is_official
    );

  begin
    insert into public.game_rounds (
      player_id, mode, total_score, question_count, puzzle_date, is_official
    )
    values (v_player, 'daily', 0, 5, p_date, v_official)
    returning id into v_round;
  exception when unique_violation then
    -- Two submissions raced for the official slot; this one lost it.
    v_official := false;
    insert into public.game_rounds (
      player_id, mode, total_score, question_count, puzzle_date, is_official
    )
    values (v_player, 'daily', 0, 5, p_date, false)
    returning id into v_round;
  end;

  insert into public.round_answers (
    round_id, question_id, asked_order, guess, points
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

  -- The score that counts, which may belong to an earlier attempt than this one.
  select total_score into v_official_score
  from public.game_rounds
  where player_id = v_player
    and puzzle_date = p_date
    and is_official;

  return jsonb_build_object(
    'round_id', v_round,
    'total_score', v_total,
    'puzzle_date', p_date,
    'is_official', v_official,
    'official_score', v_official_score
  );
end;
$function$;

comment on function public.submit_daily_round(date, jsonb) is
  'Records one daily attempt. The first inside the puzzle window counts; later attempts and archive runs are practice and earn no XP or rank.';
