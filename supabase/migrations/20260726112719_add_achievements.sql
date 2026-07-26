-- Achievements.
--
-- The server owns the definitions and the client renders whatever it is told.
-- That is deliberate: the population prompt rule and the survival window
-- schedule both live in two places and have both already drifted, and
-- achievements would be the worst case of the three because there are dozens.
-- Here there is exactly one source of truth.
--
-- The shape is a catalogue joined to a pivot of derived stats:
--
--   player_stats        (player_id, stat_key, value)   -- everything measurable
--   achievements        (id, stat_key, threshold, ...) -- the catalogue
--   player_achievements  the join, comparing value >= threshold
--
-- Adding an achievement is therefore an INSERT, not a migration and not a code
-- change, and every one of them back-fills over rounds already recorded.
--
-- Idempotent so it replays cleanly.

drop view if exists public.player_achievements;
drop view if exists public.player_stats;
drop table if exists public.achievements;

-- ── Everything measurable about a player, one row per fact ──────────────────

create view public.player_stats with (security_invoker = true) as
with
-- Category rounds only. 'mixed' is a way to play rather than a subject, and
-- daily and survival have their own stats below.
category_rounds as (
  select r.player_id, r.mode, r.total_score
  from public.game_rounds r
  where r.mode::text = any (
    select e::text from unnest(enum_range(null::public.question_category)) as e
  )
),
-- A streak is a run of consecutive puzzle_dates. Numbering the distinct dates
-- and subtracting that number gives every date in a run the same anchor, so
-- grouping on the anchor counts the runs. Server-side, this finally makes the
-- streak something the database can vouch for rather than a localStorage
-- number the client asserts.
daily_days as (
  select distinct player_id, puzzle_date
  from public.game_rounds
  where mode = 'daily' and puzzle_date is not null
),
daily_runs as (
  select
    player_id,
    puzzle_date - (row_number() over (
      partition by player_id order by puzzle_date
    ))::integer as streak_anchor
  from daily_days
),
streaks as (
  select player_id, count(*)::integer as streak_length
  from daily_runs
  group by player_id, streak_anchor
)
select player_id, stat_key, value from (
  select p.id as player_id, 'rounds_played' as stat_key,
         (select count(*) from public.game_rounds r where r.player_id = p.id)::integer as value
  from public.profiles p

  union all
  select p.id, 'questions_answered',
         (select count(*)
          from public.round_answers a
          join public.game_rounds r on r.id = a.round_id
          where r.player_id = p.id)::integer
  from public.profiles p

  union all
  select p.id, 'perfect_questions',
         (select count(*)
          from public.round_answers a
          join public.game_rounds r on r.id = a.round_id
          where r.player_id = p.id and a.points >= 980)::integer
  from public.profiles p

  union all
  select p.id, 'best_category_score',
         coalesce((select max(total_score) from category_rounds c where c.player_id = p.id), 0)
  from public.profiles p

  union all
  select p.id, 'best_daily_score',
         coalesce((select max(total_score) from public.game_rounds r
                   where r.player_id = p.id and r.mode = 'daily'), 0)
  from public.profiles p

  -- A death-terminated run of N answers survived N - 1 of them.
  union all
  select p.id, 'best_survival_run',
         coalesce((select max(question_count - 1) from public.game_rounds r
                   where r.player_id = p.id and r.mode = 'survival'), 0)
  from public.profiles p

  union all
  select p.id, 'longest_daily_streak',
         coalesce((select max(streak_length) from streaks s where s.player_id = p.id), 0)
  from public.profiles p

  union all
  select p.id, 'dailies_played',
         (select count(*) from daily_days d where d.player_id = p.id)::integer
  from public.profiles p

  -- Distinct subjects with at least one round played.
  union all
  select p.id, 'subjects_played',
         (select count(distinct mode) from category_rounds c where c.player_id = p.id)::integer
  from public.profiles p

  -- Subjects where a round has beaten 8,000. 'Mastered' in the leaderboard
  -- sense, not the rank sense.
  union all
  select p.id, 'subjects_mastered',
         (select count(distinct mode) from category_rounds c
          where c.player_id = p.id and c.total_score >= 8000)::integer
  from public.profiles p

  -- The highest rank reached in any single subject, so achievements can key
  -- off the ladder without duplicating its maths.
  union all
  select p.id, 'best_subject_rank',
         coalesce((select max(pr.rank) from public.player_progress pr
                   where pr.player_id = p.id), 1)
  from public.profiles p
) as facts;

grant select on public.player_stats to anon, authenticated;

comment on view public.player_stats is
  'Every measurable fact about a player, pivoted to (stat_key, value) so the achievements catalogue can join to it generically.';

-- ── The catalogue ───────────────────────────────────────────────────────────

create table public.achievements (
  id          text primary key,
  name        text not null,
  description text not null,
  stat_key    text not null,
  threshold   integer not null,
  tier        text not null default 'bronze',
  sort_order  integer not null default 0,

  constraint achievements_threshold_positive check (threshold > 0),
  constraint achievements_tier_known
    check (tier in ('bronze', 'silver', 'gold')),
  constraint achievements_name_not_blank
    check (length(btrim(name)) > 0)
);

alter table public.achievements enable row level security;

create policy achievements_are_public
  on public.achievements for select
  to anon, authenticated
  using (true);

grant select on public.achievements to anon, authenticated;

insert into public.achievements
  (id, name, description, stat_key, threshold, tier, sort_order) values
  ('first-steps',   'First Steps',   'Finish your first round.',
     'rounds_played', 1, 'bronze', 10),
  ('regular',       'Regular',       'Finish 25 rounds.',
     'rounds_played', 25, 'silver', 20),
  ('devotee',       'Devotee',       'Finish 100 rounds.',
     'rounds_played', 100, 'gold', 30),

  ('bullseye',      'Bullseye',      'Land a single guess within a whisker of the answer.',
     'perfect_questions', 1, 'bronze', 40),
  ('sharpshooter',  'Sharpshooter',  'Land 25 near-perfect guesses.',
     'perfect_questions', 25, 'silver', 50),
  ('deadeye',       'Deadeye',       'Land 100 near-perfect guesses.',
     'perfect_questions', 100, 'gold', 60),

  ('night-owl',     'Night Owl',     'Play the daily seven days running.',
     'longest_daily_streak', 7, 'silver', 70),
  ('devoted',       'Devoted',       'Play the daily thirty days running.',
     'longest_daily_streak', 30, 'gold', 80),

  ('surveyor',      'Surveyor',      'Survive 15 questions in a single run.',
     'best_survival_run', 15, 'silver', 90),
  ('cartographer',  'Cartographer',  'Survive 25 questions in a single run.',
     'best_survival_run', 25, 'gold', 100),

  ('well-read',     'Well Read',     'Play a round in every subject.',
     'subjects_played', 8, 'silver', 110),
  ('polymath',      'Polymath',      'Score 8,000 or more in every subject.',
     'subjects_mastered', 8, 'gold', 120),

  ('titled',        'Titled',        'Earn your first subject title.',
     'best_subject_rank', 5, 'bronze', 130),
  ('distinguished', 'Distinguished', 'Reach rank 15 in any subject.',
     'best_subject_rank', 15, 'silver', 140),
  ('legendary',     'Legendary',     'Reach rank 30 in any subject.',
     'best_subject_rank', 30, 'gold', 150);

-- ── Earned, or how far off ──────────────────────────────────────────────────

create view public.player_achievements with (security_invoker = true) as
select
  s.player_id,
  a.id            as achievement_id,
  a.name,
  a.description,
  a.tier,
  a.sort_order,
  a.threshold,
  least(s.value, a.threshold) as progress,
  s.value >= a.threshold      as earned
from public.achievements a
join public.player_stats s on s.stat_key = a.stat_key;

grant select on public.player_achievements to anon, authenticated;

comment on view public.player_achievements is
  'Every achievement for every player, earned or not, with capped progress toward the threshold.';
