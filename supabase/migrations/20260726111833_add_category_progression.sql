-- Per-subject ranks.
--
-- XP is credited per *question*, to that question's own category, rather than
-- per round to the round's mode. That is what lets every mode feed the ranks
-- with no special cases: a mixed round spreads across the eight subjects, a
-- daily question about Saturn earns Space XP, and a survival run credits
-- whatever it happened to deal. No mode is a dead end.
--
-- Everything here derives from rows that already exist. There is no new write
-- path, nothing to keep in sync with the client, and it back-fills for every
-- round already recorded the moment it ships.
--
-- Idempotent so it replays cleanly.

drop view if exists public.player_progress;
drop view if exists public.player_category_xp;
drop table if exists public.rank_titles;
drop function if exists public.rank_for_xp(integer);
drop function if exists public.xp_for_rank(integer);

-- ── The curve ───────────────────────────────────────────────────────────────
--
-- 450 * (rank - 1) ^ 1.5. Chosen so the first title lands at about five rounds
-- of a subject and rank 30 at about a hundred; the exponent rather than the
-- coefficient carries the shape, so slowing the early game does not drag the
-- whole ladder out with it. This pair of functions is the only place the
-- economy lives — retune here and every view follows.

create function public.xp_for_rank(p_rank integer)
returns integer
language sql
immutable
set search_path = ''
as $function$
  -- ceil, not round: rounding down lands a hair under the true threshold, and
  -- rank_for_xp then reports one rank short of the number this returned.
  select case
    when p_rank <= 1 then 0
    else ceil(450 * power(p_rank - 1, 1.5))::integer
  end;
$function$;

comment on function public.xp_for_rank(integer) is
  'Cumulative category XP required to reach a rank. Inverse of rank_for_xp.';

create function public.rank_for_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_xp is null or p_xp < 450 then 1
    else (1 + floor(power(p_xp / 450.0, 2.0 / 3.0)))::integer
  end;
$function$;

comment on function public.rank_for_xp(integer) is
  'The rank a given amount of category XP has reached. Inverse of xp_for_rank.';

-- ── Titles ──────────────────────────────────────────────────────────────────
--
-- A row per (category, rank floor). A player's title is the one with the
-- greatest floor at or below their rank, so ranks 1-4 fall through to the
-- shared 'Newcomer' row seeded at floor 1 for every subject.

create table public.rank_titles (
  category   public.question_category not null,
  rank_floor integer not null,
  title      text not null,

  primary key (category, rank_floor),
  constraint rank_titles_floor_positive check (rank_floor >= 1),
  constraint rank_titles_title_not_blank check (length(btrim(title)) > 0)
);

alter table public.rank_titles enable row level security;

create policy rank_titles_are_public
  on public.rank_titles for select
  to anon, authenticated
  using (true);

grant select on public.rank_titles to anon, authenticated;

insert into public.rank_titles (category, rank_floor, title) values
  ('population', 1, 'Newcomer'),
  ('population', 5, 'People Watcher'),
  ('population', 10, 'Crowd Counter'),
  ('population', 15, 'Census Scout'),
  ('population', 20, 'Demography Detective'),
  ('population', 25, 'Population Oracle'),
  ('population', 30, 'Keeper of Billions'),

  ('history', 1, 'Newcomer'),
  ('history', 5, 'Time Tourist'),
  ('history', 10, 'Past Pupil'),
  ('history', 15, 'Chronicle Keeper'),
  ('history', 20, 'Era Expert'),
  ('history', 25, 'Timeline Sage'),
  ('history', 30, 'Master of Ages'),

  ('geography', 1, 'Newcomer'),
  ('geography', 5, 'Map Wanderer'),
  ('geography', 10, 'Compass Keeper'),
  ('geography', 15, 'Terrain Tracker'),
  ('geography', 20, 'Atlas Authority'),
  ('geography', 25, 'World Cartographer'),
  ('geography', 30, 'Master of the Earth'),

  ('science', 1, 'Newcomer'),
  ('science', 5, 'Curious Mind'),
  ('science', 10, 'Lab Assistant'),
  ('science', 15, 'Theory Tester'),
  ('science', 20, 'Formula Finder'),
  ('science', 25, 'Scientific Savant'),
  ('science', 30, 'Master of Matter'),

  ('animals', 1, 'Newcomer'),
  ('animals', 5, 'Nature Spotter'),
  ('animals', 10, 'Creature Keeper'),
  ('animals', 15, 'Wildlife Tracker'),
  ('animals', 20, 'Animal Expert'),
  ('animals', 25, 'Beast Whisperer'),
  ('animals', 30, 'Artemis'),

  ('space', 1, 'Newcomer'),
  ('space', 5, 'Stargazer'),
  ('space', 10, 'Orbit Scout'),
  ('space', 15, 'Planet Pathfinder'),
  ('space', 20, 'Cosmic Navigator'),
  ('space', 25, 'Galactic Sage'),
  ('space', 30, 'Oracle of the Cosmos'),

  ('technology', 1, 'Newcomer'),
  ('technology', 5, 'Tinkerer'),
  ('technology', 10, 'Gadget Scout'),
  ('technology', 15, 'Machine Maker'),
  ('technology', 20, 'Engineering Expert'),
  ('technology', 25, 'Innovation Architect'),
  ('technology', 30, 'Titan of Technology'),

  ('movies', 1, 'Newcomer'),
  ('movies', 5, 'Casual Viewer'),
  ('movies', 10, 'Film Fan'),
  ('movies', 15, 'Screen Scholar'),
  ('movies', 20, 'Box Office Buff'),
  ('movies', 25, 'Cinema Savant'),
  ('movies', 30, 'Legend of the Silver Screen');

-- ── Earned XP, per subject ──────────────────────────────────────────────────
--
-- points / 10, so a perfect question is 100 XP and a typical one about 70.
-- Every answered question counts once, whichever mode asked it.

create view public.player_category_xp with (security_invoker = true) as
select
  r.player_id,
  q.category,
  floor(sum(a.points) / 10.0)::integer as xp,
  count(*)::integer                    as questions_answered,
  count(*) filter (where a.points >= 980)::integer as perfect_answers
from public.round_answers a
join public.game_rounds r on r.id = a.round_id
join public.questions q on q.id = a.question_id
group by r.player_id, q.category;

grant select on public.player_category_xp to anon, authenticated;

-- One row per player per subject, including subjects never played, so the
-- account screen can render all eight without the client inventing the gaps.

create view public.player_progress with (security_invoker = true) as
select
  p.id                                as player_id,
  c.category,
  coalesce(x.xp, 0)                   as xp,
  coalesce(x.questions_answered, 0)   as questions_answered,
  coalesce(x.perfect_answers, 0)      as perfect_answers,
  public.rank_for_xp(coalesce(x.xp, 0)) as rank,
  t.title,
  public.xp_for_rank(public.rank_for_xp(coalesce(x.xp, 0)))     as rank_floor_xp,
  public.xp_for_rank(public.rank_for_xp(coalesce(x.xp, 0)) + 1) as next_rank_xp
from public.profiles p
cross join unnest(enum_range(null::public.question_category)) as c(category)
left join public.player_category_xp x
  on x.player_id = p.id and x.category = c.category
left join lateral (
  select rt.title
  from public.rank_titles rt
  where rt.category = c.category
    and rt.rank_floor <= public.rank_for_xp(coalesce(x.xp, 0))
  order by rt.rank_floor desc
  limit 1
) t on true;

grant select on public.player_progress to anon, authenticated;

comment on view public.player_progress is
  'One row per player per subject: XP, rank, earned title, and the XP bounds of the current rank.';
