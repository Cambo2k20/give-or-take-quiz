-- 20260805000000 made the three leaderboard views SECURITY DEFINER so their
-- QA anti-join could read private.qa_accounts, which browser roles cannot
-- select from. That reversed 20260725231130 for the whole view: every column
-- and every underlying table was then read as the view owner.
--
-- Shrink the definer boundary to the one fact that actually needs it. anon and
-- authenticated already hold select on game_rounds, round_answers and profiles,
-- so the views only ever needed elevation for the allowlist lookup. Keep the
-- helper in private: config.toml exposes only public and graphql_public, so it
-- is callable from these view bodies but never reachable as a REST RPC.
create function private.is_qa_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from private.qa_accounts qa
    where qa.user_id = p_player_id
  );
$function$;

revoke all on function private.is_qa_player(uuid) from public;
grant execute on function private.is_qa_player(uuid) to anon, authenticated;

comment on function private.is_qa_player(uuid) is
  'Allowlist membership for one player id, so leaderboard views stay security_invoker.';

create or replace view public.leaderboard with (security_invoker = true) as
with ranked_rounds as (
  select r.*, count(*) over (partition by r.player_id, r.mode) as rounds_played,
    max(r.created_at) over (partition by r.player_id, r.mode) as last_played,
    row_number() over (partition by r.player_id, r.mode order by r.total_score desc, r.created_at asc, r.id asc) as best_order
  from public.game_rounds r
  where r.mode not in ('daily', 'survival') and r.question_count = 5
    and not private.is_qa_player(r.player_id)
), best_rounds as (select * from ranked_rounds where best_order = 1), answer_stats as (
  select a.round_id, count(*) filter (where a.points >= 980)::integer as correct_answers from public.round_answers a group by a.round_id
)
select b.mode, p.id as player_id, p.display_name, b.total_score as best_score, b.rounds_played, b.last_played,
  rank() over (partition by b.mode order by b.total_score desc, b.created_at asc, b.id asc) as rank,
  coalesce(a.correct_answers, 0) as correct_answers,
  round(b.total_score::numeric / nullif(b.question_count * 1000, 0) * 100, 1)::double precision as accuracy, b.created_at as best_date
from best_rounds b join public.profiles p on p.id = b.player_id left join answer_stats a on a.round_id = b.id;

create or replace view public.daily_leaderboard with (security_invoker = true) as
select r.puzzle_date, p.id as player_id, p.display_name, r.total_score as best_score,
  (select count(*) from public.game_rounds a where a.player_id = r.player_id and a.puzzle_date = r.puzzle_date and a.mode = 'daily') as attempts,
  rank() over (partition by r.puzzle_date order by r.total_score desc, r.created_at asc, p.id asc) as rank,
  r.total_score as score, r.created_at as completed_at
from public.game_rounds r join public.profiles p on p.id = r.player_id
where r.mode = 'daily' and r.is_official
  and not private.is_qa_player(r.player_id);

create or replace view public.survival_leaderboard with (security_invoker = true) as
select p.id as player_id, p.display_name, max(r.question_count - 1) as best_run, count(*) as attempts,
  rank() over (order by max(r.question_count - 1) desc) as rank
from public.game_rounds r join public.profiles p on p.id = r.player_id
where r.mode = 'survival'
  and not private.is_qa_player(r.player_id)
group by p.id, p.display_name;

grant select on public.leaderboard, public.daily_leaderboard, public.survival_leaderboard to anon, authenticated;
