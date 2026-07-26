-- 'mixed' is a way to play, not a question category, so it needs its own type.
create type game_mode as enum (
  'population', 'history', 'size', 'quantity', 'physics', 'mixed'
);

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_display_name_length
    check (length(btrim(display_name)) between 2 and 24),
  -- Control characters and stray whitespace would wreck the leaderboard layout.
  constraint profiles_display_name_charset
    check (display_name ~ '^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$')
);

-- One visible identity per name, so a leaderboard row is unambiguous.
create unique index profiles_display_name_unique on profiles (lower(display_name));

create table game_rounds (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references profiles (id) on delete cascade,
  mode           game_mode not null,
  total_score    integer not null,
  question_count integer not null,
  created_at     timestamptz not null default now(),
  constraint game_rounds_question_count_sane
    check (question_count between 1 and 50),
  -- 1000 is the per-question maximum, so this is the ceiling for a whole round.
  constraint game_rounds_total_score_in_range
    check (total_score between 0 and question_count * 1000)
);

create table round_answers (
  round_id    uuid not null references game_rounds (id) on delete cascade,
  question_id text not null references questions (id),
  asked_order smallint not null,
  guess       numeric not null,
  points      integer not null,
  primary key (round_id, question_id),
  constraint round_answers_points_in_range check (points between 0 and 1000)
);

create index game_rounds_leaderboard_idx on game_rounds (mode, total_score desc);
create index game_rounds_player_idx on game_rounds (player_id, created_at desc);
create index round_answers_question_idx on round_answers (question_id);

-- Where a value sits on its slider, 0 to 1. The SQL twin of valueToPosition()
-- in lib/game.ts, and the reason scoring can happen server-side at all.
create function slider_position(
  p_min numeric, p_max numeric, p_scale question_scale, p_value numeric
) returns numeric
language sql immutable
as $$
  select case
    when p_scale = 'log'
      then (ln(clamped) - ln(p_min)) / (ln(p_max) - ln(p_min))
    else (clamped - p_min) / (p_max - p_min)
  end
  from (select greatest(least(p_value, p_max), p_min) as clamped) as c;
$$;

-- The SQL twin of scoreGuess(): 1000 * (1 - distance) ^ 2, rounded.
create function score_guess(p_question_id text, p_guess numeric)
returns integer
language sql stable
as $$
  select round(
    1000 * power(
      1 - abs(
        slider_position(q.min, q.max, q.scale, q.answer)
        - slider_position(q.min, q.max, q.scale, p_guess)
      ),
      2
    )
  )::integer
  from questions q
  where q.id = p_question_id;
$$;

alter table profiles enable row level security;
alter table game_rounds enable row level security;
alter table round_answers enable row level security;

-- Names and scores are public; that is the point of a leaderboard.
create policy "Profiles are publicly readable"
  on profiles for select to anon, authenticated using (true);
create policy "Players may create their own profile"
  on profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "Players may update their own profile"
  on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Rounds are publicly readable"
  on game_rounds for select to anon, authenticated using (true);
create policy "Answers are publicly readable"
  on round_answers for select to anon, authenticated using (true);

-- No insert policies on game_rounds or round_answers by design: rounds may
-- only be recorded through submit_round(), which scores them itself. A client
-- that could insert directly could simply claim 10000.
;
