-- Expand the server-owned achievement catalogue. Existing achievements are
-- retained because none duplicate the exact new milestones. Social facts are
-- exposed only for the signed-in player: the aggregate helper cannot be used
-- to inspect another player's friendships or challenge history.

create or replace function private.player_social_stats(p_player uuid)
returns table (stat_key text, value integer)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if p_player is null or p_player is distinct from auth.uid() then
    return;
  end if;

  return query
  with matches as (
    select
      c.id,
      c.format,
      c.recipient_id as opponent_id,
      c.completed_at,
      case
        when c.challenger_result > c.recipient_result then 'win'
        when c.challenger_result < c.recipient_result then 'loss'
        else 'draw'
      end as outcome
    from public.game_challenges c
    where c.state = 'completed'
      and c.challenger_id = p_player

    union all

    select
      c.id,
      c.format,
      c.challenger_id as opponent_id,
      c.completed_at,
      case
        when c.recipient_result > c.challenger_result then 'win'
        when c.recipient_result < c.challenger_result then 'loss'
        else 'draw'
      end as outcome
    from public.game_challenges c
    where c.state = 'completed'
      and c.recipient_id = p_player
  ), ordered as (
    select
      matches.*,
      sum(case when outcome = 'win' then 0 else 1 end) over (
        order by completed_at, id
        rows between unbounded preceding and current row
      ) as win_run
    from matches
  ), win_runs as (
    select win_run, count(*)::integer as wins
    from ordered
    where outcome = 'win'
    group by win_run
  ), opponents as (
    select
      opponent_id,
      count(*)::integer as played,
      count(*) filter (where outcome = 'win')::integer as wins
    from matches
    group by opponent_id
  ), facts as (
    select
      (select count(*)
       from public.friendships f
       where f.status = 'accepted'
         and p_player in (f.requester_id, f.recipient_id))::integer
        as accepted_friends,
      (select count(*) from matches)::integer as challenges_completed,
      coalesce((select max(played) from opponents), 0)::integer
        as max_challenges_vs_one_opponent,
      (select count(*) from matches where outcome = 'win')::integer
        as challenges_won,
      coalesce((select max(wins) from win_runs), 0)::integer
        as best_challenge_win_streak,
      (select count(distinct format) from matches where outcome = 'win')::integer
        as challenge_formats_won,
      coalesce((select max(wins) from opponents), 0)::integer
        as max_wins_vs_one_opponent
  )
  select social.stat_key, social.value
  from facts
  cross join lateral (
    values
      ('accepted_friends'::text, facts.accepted_friends),
      ('challenges_completed', facts.challenges_completed),
      ('max_challenges_vs_one_opponent', facts.max_challenges_vs_one_opponent),
      ('challenges_won', facts.challenges_won),
      ('best_challenge_win_streak', facts.best_challenge_win_streak),
      ('challenge_formats_won', facts.challenge_formats_won),
      ('max_wins_vs_one_opponent', facts.max_wins_vs_one_opponent)
  ) as social(stat_key, value);
end;
$function$;

revoke all on function private.player_social_stats(uuid)
  from public, anon, authenticated;
grant execute on function private.player_social_stats(uuid)
  to anon, authenticated;

create or replace view public.player_stats
with (security_invoker = true)
as
with
category_rounds as (
  select r.player_id, r.mode, r.total_score, r.question_count
  from public.game_rounds r
  where r.mode::text = any (
    select e::text from unnest(enum_range(null::public.question_category)) as e
  )
),
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
         coalesce((select max(total_score) from category_rounds c
                   where c.player_id = p.id and c.question_count = 5), 0)
  from public.profiles p

  union all
  select p.id, 'best_daily_score',
         coalesce((select max(total_score) from public.game_rounds r
                   where r.player_id = p.id and r.mode = 'daily'), 0)
  from public.profiles p

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

  union all
  select p.id, 'subjects_played',
         (select count(distinct mode) from category_rounds c where c.player_id = p.id)::integer
  from public.profiles p

  union all
  select p.id, 'subjects_mastered',
         (select count(distinct mode) from category_rounds c
          where c.player_id = p.id
            and c.total_score >= c.question_count * 800)::integer
  from public.profiles p

  union all
  select p.id, 'best_subject_rank',
         coalesce((select max(pr.rank) from public.player_progress pr
                   where pr.player_id = p.id), 1)
  from public.profiles p

  union all
  select
    p.id,
    social.stat_key,
    social.value
  from public.profiles p
  cross join lateral private.player_social_stats(p.id) social
  where p.id = (select auth.uid())
) as facts;

grant select on public.player_stats to anon, authenticated;

comment on view public.player_stats is
  'Every measurable player fact. Social aggregates are emitted only for the signed-in player.';

insert into public.achievements
  (id, name, description, stat_key, threshold, tier, sort_order)
values
  ('settling-in', 'Settling In', 'Finish 5 rounds.',
   'rounds_played', 5, 'bronze', 20),
  ('getting-the-hang', 'Getting the Hang of It', 'Finish 10 rounds.',
   'rounds_played', 10, 'bronze', 30),
  ('half-century', 'Half-Century', 'Finish 50 rounds.',
   'rounds_played', 50, 'silver', 50),
  ('long-haul', 'Long Haul', 'Finish 250 rounds.',
   'rounds_played', 250, 'gold', 70),
  ('mainstay', 'Mainstay', 'Finish 500 rounds.',
   'rounds_played', 500, 'gold', 80),

  ('curious-mind', 'Curious Mind', 'Answer 50 questions.',
   'questions_answered', 50, 'bronze', 90),
  ('question-collector', 'Question Collector', 'Answer 250 questions.',
   'questions_answered', 250, 'silver', 100),
  ('encyclopaedic', 'Encyclopaedic', 'Answer 500 questions.',
   'questions_answered', 500, 'gold', 110),
  ('thousand-guesses', 'Thousand Guesses', 'Answer 1,000 questions.',
   'questions_answered', 1000, 'gold', 120),

  ('sharp-eye', 'Sharp Eye', 'Record 5 near-perfect answers.',
   'perfect_questions', 5, 'bronze', 140),
  ('pinpoint', 'Pinpoint', 'Record 10 near-perfect answers.',
   'perfect_questions', 10, 'bronze', 150),
  ('eagle-eye', 'Eagle Eye', 'Record 50 near-perfect answers.',
   'perfect_questions', 50, 'silver', 170),
  ('unerring', 'Unerring', 'Record 250 near-perfect answers.',
   'perfect_questions', 250, 'gold', 190),

  ('solid-instinct', 'Solid Instinct', 'Score at least 2,500 in Classic.',
   'best_category_score', 2500, 'bronze', 200),
  ('on-the-money', 'On the Money', 'Score at least 4,000 in Classic.',
   'best_category_score', 4000, 'silver', 210),
  ('almost-flawless', 'Almost Flawless', 'Score at least 4,750 in Classic.',
   'best_category_score', 4750, 'gold', 220),
  ('perfect-five', 'Perfect Five', 'Score exactly 5,000 in Classic.',
   'best_category_score', 5000, 'gold', 230),

  ('first-light', 'First Light', 'Complete your first Daily.',
   'dailies_played', 1, 'bronze', 240),
  ('daily-regular', 'Daily Regular', 'Complete 10 Dailies.',
   'dailies_played', 10, 'bronze', 250),
  ('calendar-keeper', 'Calendar Keeper', 'Complete 50 Dailies.',
   'dailies_played', 50, 'silver', 260),
  ('hundred-days', 'Hundred Days', 'Complete 100 Dailies.',
   'dailies_played', 100, 'gold', 270),
  ('year-in-review', 'Year in Review', 'Complete 365 Dailies.',
   'dailies_played', 365, 'gold', 280),
  ('three-day-spark', 'Three-Day Spark', 'Maintain a three-day Daily streak.',
   'longest_daily_streak', 3, 'bronze', 290),
  ('fortnight-focus', 'Fortnight Focus', 'Maintain a fourteen-day Daily streak.',
   'longest_daily_streak', 14, 'silver', 310),
  ('two-month-march', 'Two-Month March', 'Maintain a sixty-day Daily streak.',
   'longest_daily_streak', 60, 'gold', 330),
  ('century-streak', 'Century Streak', 'Maintain a 100-day Daily streak.',
   'longest_daily_streak', 100, 'gold', 340),
  ('strong-start', 'Strong Start', 'Score at least 2,500 on a Daily.',
   'best_daily_score', 2500, 'bronze', 350),
  ('daily-ace', 'Daily Ace', 'Score at least 4,000 on a Daily.',
   'best_daily_score', 4000, 'silver', 360),
  ('perfect-daily', 'Perfect Daily', 'Score exactly 5,000 on a Daily.',
   'best_daily_score', 5000, 'gold', 370),

  ('still-standing', 'Still Standing', 'Survive 5 questions.',
   'best_survival_run', 5, 'bronze', 380),
  ('double-digits', 'Double Digits', 'Survive 10 questions.',
   'best_survival_run', 10, 'bronze', 390),
  ('deep-run', 'Deep Run', 'Survive 20 questions.',
   'best_survival_run', 20, 'silver', 410),
  ('marathon-mind', 'Marathon Mind', 'Survive 50 questions.',
   'best_survival_run', 50, 'gold', 430),
  ('unbreakable', 'Unbreakable', 'Survive 100 questions.',
   'best_survival_run', 100, 'gold', 440),

  ('explorer', 'Explorer', 'Play your first subject round.',
   'subjects_played', 1, 'bronze', 450),
  ('broad-interests', 'Broad Interests', 'Play four different subjects.',
   'subjects_played', 4, 'bronze', 460),
  ('specialist', 'Specialist', 'Score at least 80% in one subject.',
   'subjects_mastered', 1, 'bronze', 480),
  ('renaissance-player', 'Renaissance Player', 'Score at least 80% in four subjects.',
   'subjects_mastered', 4, 'silver', 490),
  ('rising-star', 'Rising Star', 'Reach rank 10 in any subject.',
   'best_subject_rank', 10, 'silver', 520),
  ('expert', 'Expert', 'Reach rank 20 in any subject.',
   'best_subject_rank', 20, 'gold', 540),
  ('elite', 'Elite', 'Reach rank 25 in any subject.',
   'best_subject_rank', 25, 'gold', 550),

  ('connected', 'Connected', 'Make your first friend.',
   'accepted_friends', 1, 'bronze', 570),
  ('challenge-accepted', 'Challenge Accepted', 'Complete your first challenge.',
   'challenges_completed', 1, 'bronze', 580),
  ('rivalry-begins', 'Rivalry Begins', 'Complete a rematch against the same player.',
   'max_challenges_vs_one_opponent', 2, 'bronze', 590),
  ('first-victory', 'First Victory', 'Win your first challenge.',
   'challenges_won', 1, 'bronze', 600),
  ('friendly-competition', 'Friendly Competition', 'Complete 10 challenges.',
   'challenges_completed', 10, 'silver', 610),
  ('winning-ways', 'Winning Ways', 'Win 10 challenges.',
   'challenges_won', 10, 'silver', 620),
  ('hot-streak', 'Hot Streak', 'Win three challenges consecutively.',
   'best_challenge_win_streak', 3, 'silver', 630),
  ('versatile-victor', 'Versatile Victor', 'Win both Classic and Survival challenges.',
   'challenge_formats_won', 2, 'gold', 640),
  ('nemesis', 'Nemesis', 'Defeat the same opponent five times.',
   'max_wins_vs_one_opponent', 5, 'gold', 650)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  stat_key = excluded.stat_key,
  threshold = excluded.threshold,
  tier = excluded.tier,
  sort_order = excluded.sort_order;

-- Place the existing milestones inside the expanded progression ladders.
update public.achievements
set sort_order = ordering.sort_order
from (
  values
    ('first-steps'::text, 10),
    ('regular', 40),
    ('devotee', 60),
    ('bullseye', 130),
    ('sharpshooter', 160),
    ('deadeye', 180),
    ('night-owl', 300),
    ('devoted', 320),
    ('surveyor', 400),
    ('cartographer', 420),
    ('well-read', 470),
    ('polymath', 500),
    ('titled', 510),
    ('distinguished', 530),
    ('legendary', 560)
) as ordering(id, sort_order)
where public.achievements.id = ordering.id;
