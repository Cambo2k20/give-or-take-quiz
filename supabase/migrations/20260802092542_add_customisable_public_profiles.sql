-- Public player profiles are a deliberately curated API. The backing tables
-- are not directly exposed to browser roles: callers only receive the fields
-- assembled by get_public_player_profile(), and owners only write through the
-- validation in update_profile_showcase().

create table public.profile_theme_unlocks (
  theme_id      text primary key,
  category      public.question_category not null,
  required_rank integer not null,
  constraint profile_theme_unlocks_id_format
    check (theme_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint profile_theme_unlocks_rank_positive
    check (required_rank > 0)
);

insert into public.profile_theme_unlocks (theme_id, category, required_rank)
values
  ('deep-space', 'space', 5),
  ('city-pulse', 'technology', 5),
  ('front-row', 'movies', 5),
  ('aurora-drift', 'space', 10);

create table public.profile_showcases (
  player_id                  uuid primary key
    references public.profiles (id) on delete cascade,
  featured_badge_key         text
    references public.rank_titles (badge_key),
  pinned_achievement_ids     text[] not null default '{}'::text[],
  profile_theme_id           text
    references public.profile_theme_unlocks (theme_id),
  updated_at                 timestamptz not null default now(),
  constraint profile_showcases_pin_limit
    check (cardinality(pinned_achievement_ids) <= 3),
  constraint profile_showcases_pins_not_null
    check (array_position(pinned_achievement_ids, null) is null)
);

alter table public.profile_theme_unlocks enable row level security;
alter table public.profile_showcases enable row level security;

revoke all on table
  public.profile_theme_unlocks,
  public.profile_showcases
from public, anon, authenticated;

grant all on table
  public.profile_theme_unlocks,
  public.profile_showcases
to service_role;

comment on table public.profile_theme_unlocks is
  'Server-owned catalogue matching profile banner artwork to its subject-rank unlock.';
comment on table public.profile_showcases is
  'Validated public-profile presentation choices. No browser role reads or writes this table directly.';

-- Anonymous visitors need to reach this one private implementation through
-- its public invoker wrapper. The schema remains outside PostgREST's exposed
-- schemas, and every other private function keeps its own explicit grants.
grant usage on schema private to anon;

create function private.get_public_player_profile(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_viewer uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_showcase public.profile_showcases%rowtype;
  v_relationship text := 'signed_out';
  v_featured_badge text;
  v_profile_theme text;
  v_pins text[] := '{}'::text[];
  v_result jsonb;
begin
  if p_player_id is null then
    return null;
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.id = p_player_id;

  if not found then
    return null;
  end if;

  if v_viewer is not null and v_viewer <> p_player_id and exists (
    select 1
    from private.player_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = p_player_id)
       or (b.blocker_id = p_player_id and b.blocked_id = v_viewer)
  ) then
    return null;
  end if;

  if v_viewer = p_player_id then
    v_relationship := 'self';
  elsif v_viewer is not null then
    select case
      when f.status = 'accepted' then 'friend'
      when f.requester_id = v_viewer then 'outgoing'
      else 'incoming'
    end
    into v_relationship
    from public.friendships f
    where least(f.requester_id, f.recipient_id) = least(v_viewer, p_player_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(v_viewer, p_player_id);

    if not found then
      v_relationship := 'none';
    end if;
  end if;

  select s.* into v_showcase
  from public.profile_showcases s
  where s.player_id = p_player_id;

  -- A saved badge is effective only while its required rank is still held.
  if v_showcase.featured_badge_key is not null and exists (
    select 1
    from public.rank_titles rt
    join public.player_progress pr
      on pr.player_id = p_player_id
     and pr.category = rt.category
    where rt.badge_key = v_showcase.featured_badge_key
      and pr.rank >= rt.rank_floor
  ) then
    v_featured_badge := v_showcase.featured_badge_key;
  else
    select rt.badge_key into v_featured_badge
    from public.player_progress pr
    join public.rank_titles rt
      on rt.category = pr.category
     and rt.rank_floor <= pr.rank
     and rt.badge_key is not null
    where pr.player_id = p_player_id
    order by pr.rank desc, pr.xp desc, rt.rank_floor desc, pr.category::text
    limit 1;
  end if;

  if v_showcase.profile_theme_id is not null and exists (
    select 1
    from public.profile_theme_unlocks t
    join public.player_progress pr
      on pr.player_id = p_player_id
     and pr.category = t.category
    where t.theme_id = v_showcase.profile_theme_id
      and pr.rank >= t.required_rank
  ) then
    v_profile_theme := v_showcase.profile_theme_id;
  end if;

  select coalesce(array_agg(pin.id order by pin.ordinality), '{}'::text[])
  into v_pins
  from unnest(coalesce(v_showcase.pinned_achievement_ids, '{}'::text[]))
    with ordinality as pin(id, ordinality)
  join public.achievements a on a.id = pin.id;

  with
  public_achievements as (
    select
      pa.achievement_id as id,
      pa.name,
      pa.description,
      pa.tier,
      pa.sort_order
    from public.player_achievements pa
    join public.achievements a on a.id = pa.achievement_id
    where pa.player_id = p_player_id
      and pa.earned
      and a.stat_key not in (
        'accepted_friends',
        'challenges_completed',
        'max_challenges_vs_one_opponent',
        'challenges_won',
        'best_challenge_win_streak',
        'challenge_formats_won',
        'max_wins_vs_one_opponent'
      )
  ),
  pinned_achievements as (
    -- Pinning a social achievement is an explicit choice to display that
    -- achievement. The underlying counts and opponent identities stay private.
    select a.id, a.name, a.description, a.tier, a.sort_order
    from public.achievements a
    where a.id = any(v_pins)
  ),
  visible_achievements as (
    select distinct on (combined.id) combined.*
    from (
      select * from public_achievements
      union all
      select * from pinned_achievements
    ) combined
    order by combined.id
  ),
  daily_days as (
    select distinct r.puzzle_date
    from public.game_rounds r
    where r.player_id = p_player_id
      and r.mode = 'daily'
      and r.is_official
      and r.puzzle_date is not null
  ),
  daily_runs as (
    select
      d.puzzle_date,
      d.puzzle_date - (row_number() over (order by d.puzzle_date))::integer
        as streak_anchor
    from daily_days d
  ),
  daily_streaks as (
    select count(*)::integer as streak_length
    from daily_runs
    group by streak_anchor
  )
  select jsonb_build_object(
    'player', jsonb_build_object(
      'id', v_profile.id,
      'display_name', v_profile.display_name,
      'avatar_key', v_profile.avatar_key
    ),
    'relationship', v_relationship,
    'showcase', jsonb_build_object(
      'featured_badge_key', v_featured_badge,
      'custom_featured_badge_key', v_showcase.featured_badge_key,
      'pinned_achievement_ids', to_jsonb(v_pins),
      'profile_theme_id', v_profile_theme,
      'custom_profile_theme_id', v_showcase.profile_theme_id
    ),
    'total_xp', coalesce((
      select sum(pr.xp)::integer
      from public.player_progress pr
      where pr.player_id = p_player_id
    ), 0),
    'category_ranks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', pr.category,
        'xp', pr.xp,
        'rank', pr.rank,
        'title', pr.title
      ) order by pr.category::text)
      from public.player_progress pr
      where pr.player_id = p_player_id
    ), '[]'::jsonb),
    'earned_badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'badge_key', rt.badge_key,
        'category', rt.category,
        'rank_floor', rt.rank_floor,
        'title', rt.title
      ) order by rt.category::text, rt.rank_floor)
      from public.player_progress pr
      join public.rank_titles rt
        on rt.category = pr.category
       and rt.rank_floor <= pr.rank
       and rt.badge_key is not null
      where pr.player_id = p_player_id
    ), '[]'::jsonb),
    'earned_achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', va.id,
        'name', va.name,
        'description', va.description,
        'tier', va.tier
      ) order by
        case va.tier when 'gold' then 1 when 'silver' then 2 else 3 end,
        va.sort_order,
        va.id)
      from visible_achievements va
    ), '[]'::jsonb),
    'classic_bests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', l.mode,
        'best_score', l.best_score,
        'correct_answers', l.correct_answers,
        'accuracy', l.accuracy,
        'best_date', l.best_date
      ) order by l.mode::text)
      from public.leaderboard l
      where l.player_id = p_player_id
    ), '[]'::jsonb),
    'survival', coalesce((
      select jsonb_build_object(
        'best_run', s.best_run,
        'attempts', s.attempts
      )
      from public.survival_leaderboard s
      where s.player_id = p_player_id
    ), jsonb_build_object('best_run', 0, 'attempts', 0)),
    'daily', jsonb_build_object(
      'played', (select count(*)::integer from daily_days),
      'longest_streak', coalesce((select max(streak_length) from daily_streaks), 0),
      'best_score', coalesce((
        select max(r.total_score)::integer
        from public.game_rounds r
        where r.player_id = p_player_id
          and r.mode = 'daily'
          and r.is_official
      ), 0)
    )
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function private.get_public_player_profile(uuid)
  from public, anon, authenticated;
grant execute on function private.get_public_player_profile(uuid)
  to anon, authenticated;

create function public.get_public_player_profile(p_player_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.get_public_player_profile(p_player_id);
$function$;

revoke all on function public.get_public_player_profile(uuid)
  from public;
grant execute on function public.get_public_player_profile(uuid)
  to anon, authenticated;

create function private.update_profile_showcase(
  p_featured_badge_key text,
  p_pinned_achievement_ids text[],
  p_profile_theme_id text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_pins text[] := coalesce(p_pinned_achievement_ids, '{}'::text[]);
  v_count integer;
begin
  if cardinality(v_pins) > 3 then
    raise exception 'choose no more than three achievements';
  end if;

  if exists (select 1 from unnest(v_pins) pin where pin is null) then
    raise exception 'achievement selections cannot be empty';
  end if;

  select count(distinct selected.id) into v_count
  from unnest(v_pins) as selected(id);
  if v_count <> cardinality(v_pins) then
    raise exception 'achievement selections must be unique';
  end if;

  if p_featured_badge_key is not null and not exists (
    select 1
    from public.rank_titles rt
    join public.player_progress pr
      on pr.player_id = v_player
     and pr.category = rt.category
    where rt.badge_key = p_featured_badge_key
      and pr.rank >= rt.rank_floor
  ) then
    raise exception 'that badge has not been earned';
  end if;

  if p_profile_theme_id is not null and not exists (
    select 1
    from public.profile_theme_unlocks t
    join public.player_progress pr
      on pr.player_id = v_player
     and pr.category = t.category
    where t.theme_id = p_profile_theme_id
      and pr.rank >= t.required_rank
  ) then
    raise exception 'that profile theme has not been unlocked';
  end if;

  if cardinality(v_pins) > 0 then
    select count(*) into v_count
    from public.player_achievements pa
    where pa.player_id = v_player
      and pa.earned
      and pa.achievement_id = any(v_pins);

    if v_count <> cardinality(v_pins) then
      raise exception 'every pinned achievement must be earned';
    end if;
  end if;

  insert into public.profile_showcases (
    player_id,
    featured_badge_key,
    pinned_achievement_ids,
    profile_theme_id,
    updated_at
  )
  values (
    v_player,
    p_featured_badge_key,
    v_pins,
    p_profile_theme_id,
    now()
  )
  on conflict (player_id) do update set
    featured_badge_key = excluded.featured_badge_key,
    pinned_achievement_ids = excluded.pinned_achievement_ids,
    profile_theme_id = excluded.profile_theme_id,
    updated_at = now();

  return private.get_public_player_profile(v_player);
end;
$function$;

revoke all on function private.update_profile_showcase(text, text[], text)
  from public, anon, authenticated;
grant execute on function private.update_profile_showcase(text, text[], text)
  to authenticated;

create function public.update_profile_showcase(
  p_featured_badge_key text default null,
  p_pinned_achievement_ids text[] default '{}'::text[],
  p_profile_theme_id text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.update_profile_showcase(
    p_featured_badge_key,
    p_pinned_achievement_ids,
    p_profile_theme_id
  );
$function$;

revoke all on function public.update_profile_showcase(text, text[], text)
  from public, anon;
grant execute on function public.update_profile_showcase(text, text[], text)
  to authenticated;

create function private.send_friend_request_by_id(p_player_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_request public.friendships%rowtype;
  v_pending integer;
begin
  if p_player_id is null or not exists (
    select 1 from public.profiles p where p.id = p_player_id
  ) then
    raise exception 'that player is unavailable';
  end if;

  if p_player_id = v_player then
    raise exception 'you cannot add yourself';
  end if;

  perform p.id
  from public.profiles p
  where p.id in (v_player, p_player_id)
  order by p.id
  for update;

  if exists (
    select 1 from private.player_blocks b
    where (b.blocker_id = v_player and b.blocked_id = p_player_id)
       or (b.blocker_id = p_player_id and b.blocked_id = v_player)
  ) then
    raise exception 'that player is unavailable';
  end if;

  if exists (
    select 1 from public.friendships f
    where least(f.requester_id, f.recipient_id) = least(v_player, p_player_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(v_player, p_player_id)
  ) then
    raise exception 'a friend relationship already exists for these players';
  end if;

  select count(*) into v_pending
  from public.friendships f
  where f.requester_id = v_player and f.status = 'pending';

  if v_pending >= 20 then
    raise exception 'you can have at most 20 outgoing friend requests';
  end if;

  begin
    insert into public.friendships (requester_id, recipient_id)
    values (v_player, p_player_id)
    returning * into v_request;
  exception when unique_violation then
    raise exception 'a friend relationship already exists for these players';
  end;

  return jsonb_build_object(
    'id', v_request.id,
    'status', v_request.status,
    'created_at', v_request.created_at
  );
end;
$function$;

revoke all on function private.send_friend_request_by_id(uuid)
  from public, anon, authenticated;
grant execute on function private.send_friend_request_by_id(uuid)
  to authenticated;

create function public.send_friend_request_by_id(p_player_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.send_friend_request_by_id(p_player_id);
$function$;

revoke all on function public.send_friend_request_by_id(uuid)
  from public, anon;
grant execute on function public.send_friend_request_by_id(uuid)
  to authenticated;

comment on function public.get_public_player_profile(uuid) is
  'Curated public game profile. Blocked pairs receive null and private account fields never leave the function.';
comment on function public.update_profile_showcase(text, text[], text) is
  'Owner-only validated public-profile presentation update.';
comment on function public.send_friend_request_by_id(uuid) is
  'Confirmed-player friend request by stable profile id for public profile actions.';
