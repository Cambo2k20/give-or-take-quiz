-- The daily challenge.
--
-- Daily questions are written for the daily and never appear in category play.
-- They still live in `questions` so that scoring, bounds and sources stay in one
-- place; `is_daily` is what keeps them out of every other round, and out of the
-- generated offline bank.

alter table public.questions
  add column is_daily boolean not null default false;

create index questions_is_daily_idx
  on public.questions (is_daily)
  where is_daily;

comment on column public.questions.is_daily is
  'Written for the daily challenge; excluded from category and mixed rounds.';

-- ── The published schedule ──────────────────────────────────────────────────

create table public.daily_sets (
  puzzle_date date primary key,
  created_at  timestamptz not null default now()
);

create table public.daily_set_questions (
  puzzle_date date not null
    references public.daily_sets (puzzle_date) on delete cascade,
  question_id text not null references public.questions (id),
  asked_order smallint not null,

  primary key (puzzle_date, question_id),
  unique (puzzle_date, asked_order),
  constraint daily_set_questions_order_in_range
    check (asked_order between 1 and 5)
);

create index daily_set_questions_question_idx
  on public.daily_set_questions (question_id);

alter table public.daily_sets enable row level security;
alter table public.daily_set_questions enable row level security;

-- A future set must stay sealed, or the daily is not the same for everyone.
create policy daily_sets_are_public_once_published
  on public.daily_sets for select
  using (puzzle_date <= current_date);

create policy daily_set_questions_are_public_once_published
  on public.daily_set_questions for select
  using (puzzle_date <= current_date);

-- ── Rounds carry the day they belong to ─────────────────────────────────────

alter table public.game_rounds
  add column puzzle_date date references public.daily_sets (puzzle_date);

alter table public.game_rounds
  add constraint game_rounds_puzzle_date_matches_mode
  check ((mode = 'daily') = (puzzle_date is not null));

-- A daily is five questions, not ten, so the round length is no longer a
-- constant and the score ceiling has to be read off it.
alter table public.game_rounds
  drop constraint if exists game_rounds_question_count_exact;

alter table public.game_rounds
  add constraint game_rounds_question_count_matches_mode
  check (question_count = case when mode = 'daily' then 5 else 10 end);

alter table public.game_rounds
  drop constraint if exists game_rounds_total_score_in_range;

alter table public.game_rounds
  add constraint game_rounds_total_score_in_range
  check (total_score between 0 and question_count * 1000);

create index game_rounds_puzzle_date_idx
  on public.game_rounds (puzzle_date)
  where puzzle_date is not null;

-- ── Category rounds may not touch daily questions ───────────────────────────
--
-- Recreated in full because the only change is the new is_daily guard: without
-- it a caller could binary-search a daily answer through a category round.

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

  if p_mode = 'daily' then
    raise exception 'daily rounds must be submitted through submit_daily_round';
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

-- ── Submitting a daily ──────────────────────────────────────────────────────

create function private.submit_daily_round(
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

  if p_date is null or p_date > current_date then
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

revoke all on function private.submit_daily_round(date, jsonb)
  from public, anon;
grant execute on function private.submit_daily_round(date, jsonb)
  to authenticated;

create function public.submit_daily_round(
  p_date date,
  p_guesses jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.submit_daily_round(p_date, p_guesses);
$function$;

revoke all on function public.submit_daily_round(date, jsonb)
  from public, anon;
grant execute on function public.submit_daily_round(date, jsonb)
  to authenticated;

comment on function public.submit_daily_round(date, jsonb) is
  'Records one authenticated daily round for a published date and rescores every guess on the server.';

-- ── The per-day board ───────────────────────────────────────────────────────
--
-- Ranked within a date, never across them: two dailies are different puzzles,
-- so a single all-time daily ranking would reward whoever caught an easy day.

create view public.daily_leaderboard with (security_invoker = true) as
select
  r.puzzle_date,
  p.id            as player_id,
  p.display_name,
  max(r.total_score) as best_score,
  count(*)           as attempts,
  rank() over (
    partition by r.puzzle_date
    order by max(r.total_score) desc
  ) as rank
from public.game_rounds r
join public.profiles p on p.id = r.player_id
where r.mode = 'daily'
group by r.puzzle_date, p.id, p.display_name;

grant select on public.daily_sets to anon, authenticated;
grant select on public.daily_set_questions to anon, authenticated;
grant select on public.daily_leaderboard to anon, authenticated;
