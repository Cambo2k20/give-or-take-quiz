-- One useful Classic leaderboard: the best round for every player in every
-- category, with the details needed by the table. Earlier rounds win score
-- ties, matching the public leaderboard's established tie-break rule.

create or replace view public.leaderboard
with (security_invoker = true)
as
with ranked_rounds as (
  select
    r.*,
    count(*) over (
      partition by r.player_id, r.mode
    ) as rounds_played,
    max(r.created_at) over (
      partition by r.player_id, r.mode
    ) as last_played,
    row_number() over (
      partition by r.player_id, r.mode
      order by r.total_score desc, r.created_at asc, r.id asc
    ) as best_order
  from public.game_rounds r
  where r.mode not in ('daily', 'survival')
),
best_rounds as (
  select *
  from ranked_rounds
  where best_order = 1
),
answer_stats as (
  select
    a.round_id,
    count(*) filter (where a.points >= 980)::integer as correct_answers
  from public.round_answers a
  group by a.round_id
)
select
  b.mode,
  p.id as player_id,
  p.display_name,
  b.total_score as best_score,
  b.rounds_played,
  b.last_played,
  rank() over (
    partition by b.mode
    order by b.total_score desc, b.created_at asc, b.id asc
  ) as rank,
  coalesce(a.correct_answers, 0) as correct_answers,
  round(
    b.total_score::numeric
      / nullif(b.question_count * 1000, 0)
      * 100,
    1
  )::double precision as accuracy,
  b.created_at as best_date
from best_rounds b
join public.profiles p on p.id = b.player_id
left join answer_stats a on a.round_id = b.id;

grant select on public.leaderboard to anon, authenticated;

comment on view public.leaderboard is
  'Best classic round per player and category. Correct means an answer worth at least 980 points.';
