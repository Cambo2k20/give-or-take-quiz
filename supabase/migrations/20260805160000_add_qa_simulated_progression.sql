-- QA progression is presentation-only state. It never writes rounds, answers,
-- derived XP, achievements, leaderboards, friendships, or challenges.

create table private.qa_progress_simulations (
  user_id uuid not null
    references private.qa_accounts (user_id) on delete cascade,
  category public.question_category not null,
  simulated_rank smallint not null default 30,
  updated_at timestamptz not null default now(),
  primary key (user_id, category),
  constraint qa_progress_simulations_rank_range
    check (simulated_rank between 1 and 30)
);

create table private.qa_simulation_settings (
  user_id uuid primary key
    references private.qa_accounts (user_id) on delete cascade,
  simulate_all_achievements boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table private.qa_progress_simulations enable row level security;
alter table private.qa_simulation_settings enable row level security;

revoke all on table
  private.qa_progress_simulations,
  private.qa_simulation_settings
from public, anon, authenticated;

grant select, insert, update, delete on table
  private.qa_progress_simulations,
  private.qa_simulation_settings
to service_role;

comment on table private.qa_progress_simulations is
  'Server-owned per-category rank simulation for allowlisted QA accounts.';
comment on table private.qa_simulation_settings is
  'Server-owned non-competitive QA presentation settings.';

create function private.require_qa_account()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_player uuid := auth.uid();
begin
  if v_player is null then
    raise exception 'QA simulation requires a signed-in player';
  end if;

  if not exists (
    select 1 from private.qa_accounts qa where qa.user_id = v_player
  ) then
    raise exception 'QA simulation is unavailable for this account';
  end if;

  return v_player;
end;
$function$;

revoke all on function private.require_qa_account()
  from public, anon, authenticated;

create function private.effective_player_rank(
  p_player_id uuid,
  p_category public.question_category
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_rank integer;
begin
  if p_player_id is null or p_category is null then
    return 1;
  end if;

  if exists (
    select 1 from private.qa_accounts qa where qa.user_id = p_player_id
  ) then
    select simulation.simulated_rank into v_rank
    from private.qa_progress_simulations simulation
    where simulation.user_id = p_player_id
      and simulation.category = p_category;

    return coalesce(v_rank, 30);
  end if;

  select progress.rank into v_rank
  from public.player_progress progress
  where progress.player_id = p_player_id
    and progress.category = p_category;

  return coalesce(v_rank, 1);
end;
$function$;

revoke all on function private.effective_player_rank(
  uuid,
  public.question_category
) from public, anon, authenticated;

create function private.qa_simulates_all_achievements(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from private.qa_accounts qa where qa.user_id = p_player_id
  ) and coalesce((
    select settings.simulate_all_achievements
    from private.qa_simulation_settings settings
    where settings.user_id = p_player_id
  ), true);
$function$;

revoke all on function private.qa_simulates_all_achievements(uuid)
  from public, anon, authenticated;

create function public.get_qa_simulation()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_qa_account();
begin
  return jsonb_build_object(
    'category_ranks', (
      select jsonb_object_agg(
        categories.category::text,
        coalesce(simulation.simulated_rank, 30)
        order by categories.category::text
      )
      from unnest(enum_range(null::public.question_category))
        as categories(category)
      left join private.qa_progress_simulations simulation
        on simulation.user_id = v_player
       and simulation.category = categories.category
    ),
    'simulate_all_achievements',
      private.qa_simulates_all_achievements(v_player)
  );
end;
$function$;

revoke all on function public.get_qa_simulation() from public, anon;
grant execute on function public.get_qa_simulation() to authenticated;

create function public.update_qa_simulation(
  p_category_ranks json,
  p_simulate_all_achievements boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_qa_account();
  v_expected integer := cardinality(enum_range(null::public.question_category));
begin
  if json_typeof(p_category_ranks) is distinct from 'object' then
    raise exception 'category ranks must be a JSON object';
  end if;

  if p_simulate_all_achievements is null then
    raise exception 'simulate_all_achievements is required';
  end if;

  if (select count(*) from json_object_keys(p_category_ranks)) <> v_expected then
    raise exception 'category ranks must contain exactly % categories', v_expected;
  end if;

  if exists (
    select selected.category
    from json_each(p_category_ranks) selected(category, rank_value)
    group by selected.category
    having count(*) > 1
  ) then
    raise exception 'category ranks contain duplicate categories';
  end if;

  if exists (
    select 1
    from json_each(p_category_ranks) selected(category, rank_value)
    where not exists (
      select 1
      from unnest(enum_range(null::public.question_category))
        as known(category)
      where known.category::text = selected.category
    )
  ) then
    raise exception 'category ranks contain an unknown category';
  end if;

  if exists (
    select 1
    from unnest(enum_range(null::public.question_category))
      as expected(category)
    where not exists (
      select 1 from json_each(p_category_ranks) selected(category, rank_value)
      where selected.category = expected.category::text
    )
  ) then
    raise exception 'category ranks are missing a live category';
  end if;

  if exists (
    select 1
    from json_each(p_category_ranks) selected(category, rank_value)
    where json_typeof(selected.rank_value) is distinct from 'number'
       or selected.rank_value::text !~ '^[0-9]+$'
       or (selected.rank_value::text)::integer not between 1 and 30
  ) then
    raise exception 'every simulated rank must be an integer from 1 to 30';
  end if;

  insert into private.qa_progress_simulations (
    user_id,
    category,
    simulated_rank,
    updated_at
  )
  select
    v_player,
    categories.category,
    (p_category_ranks::jsonb ->> categories.category::text)::integer,
    now()
  from unnest(enum_range(null::public.question_category))
    as categories(category)
  on conflict (user_id, category) do update set
    simulated_rank = excluded.simulated_rank,
    updated_at = now();

  insert into private.qa_simulation_settings (
    user_id,
    simulate_all_achievements,
    updated_at
  ) values (
    v_player,
    p_simulate_all_achievements,
    now()
  )
  on conflict (user_id) do update set
    simulate_all_achievements = excluded.simulate_all_achievements,
    updated_at = now();

  return public.get_qa_simulation();
end;
$function$;

revoke all on function public.update_qa_simulation(json, boolean)
  from public, anon;
grant execute on function public.update_qa_simulation(json, boolean)
  to authenticated;

create function public.get_qa_simulated_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_qa_account();
  v_simulate_achievements boolean :=
    private.qa_simulates_all_achievements(v_player);
begin
  return jsonb_build_object(
    'is_simulated', true,
    'categories', (
      select jsonb_agg(jsonb_build_object(
        'category', categories.category,
        'xp', public.xp_for_rank(categories.rank),
        'rank', categories.rank,
        'title', titles.title,
        'questions_answered', 0,
        'perfect_answers', 0,
        'rank_floor_xp', public.xp_for_rank(categories.rank),
        'next_rank_xp', public.xp_for_rank(categories.rank + 1),
        'simulated', true
      ) order by categories.category::text)
      from (
        select
          category,
          private.effective_player_rank(v_player, category) as rank
        from unnest(enum_range(null::public.question_category))
          as live(category)
      ) categories
      left join lateral (
        select rank_titles.title
        from public.rank_titles
        where rank_titles.category = categories.category
          and rank_titles.rank_floor <= categories.rank
        order by rank_titles.rank_floor desc
        limit 1
      ) titles on true
    ),
    'achievements', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'achievement_id', achievements.id,
        'name', achievements.name,
        'description', achievements.description,
        'tier', achievements.tier,
        'progress', case when v_simulate_achievements then achievements.threshold else 0 end,
        'threshold', achievements.threshold,
        'earned', v_simulate_achievements,
        'sort_order', achievements.sort_order,
        'simulated', v_simulate_achievements
      ) order by achievements.sort_order, achievements.id), '[]'::jsonb)
      from public.achievements
    )
  );
end;
$function$;

revoke all on function public.get_qa_simulated_progress() from public, anon;
grant execute on function public.get_qa_simulated_progress() to authenticated;

-- Every client-visible theme must have the same server-side profile gate.
insert into public.profile_theme_unlocks (theme_id, category, required_rank)
values
  ('moonlit-library', 'history', 5),
  ('first-light', 'dinosaurs', 5)
on conflict (theme_id) do update set
  category = excluded.category,
  required_rank = excluded.required_rank;

create function private.require_profile_owner()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_player uuid := auth.uid();
begin
  if v_player is null then
    raise exception 'sign in to update your profile';
  end if;

  if not public.is_email_confirmed() then
    raise exception 'confirm your email address before updating your profile';
  end if;

  if not exists (select 1 from public.profiles where id = v_player) then
    raise exception 'pick a display name before updating your profile';
  end if;

  return v_player;
end;
$function$;

revoke all on function private.require_profile_owner()
  from public, anon, authenticated;

create function private.update_profile_avatar(p_avatar_key text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_profile_owner();
  v_known_badge boolean;
  v_badge_allowed boolean;
begin
  if p_avatar_key is null or btrim(p_avatar_key) = '' then
    raise exception 'choose a known profile avatar';
  end if;

  if p_avatar_key in (
    'event-horizon',
    'volcano',
    'hermes',
    'aphrodite',
    'storm-rocket',
    'aurora-longship',
    'mayan-temple',
    'valkyrie-helm',
    'mjolnir'
  ) then
    v_badge_allowed := true;
  else
    select
      count(*) > 0,
      coalesce(bool_or(
        private.effective_player_rank(v_player, rank_titles.category)
          >= rank_titles.rank_floor
      ), false)
    into v_known_badge, v_badge_allowed
    from public.rank_titles
    where rank_titles.badge_key = p_avatar_key;

    if not v_known_badge then
      raise exception 'choose a known profile avatar';
    end if;

    if not v_badge_allowed then
      raise exception 'that rank badge has not been unlocked';
    end if;
  end if;

  update public.profiles
  set avatar_key = p_avatar_key,
      updated_at = now()
  where id = v_player;
end;
$function$;

revoke all on function private.update_profile_avatar(text)
  from public, anon, authenticated;
grant execute on function private.update_profile_avatar(text)
  to authenticated;

create function public.update_profile_avatar(p_avatar_key text)
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.update_profile_avatar(p_avatar_key);
$function$;

revoke all on function public.update_profile_avatar(text) from public, anon;
grant execute on function public.update_profile_avatar(text) to authenticated;

-- Profile identity remains browser-writable, but avatar eligibility is now
-- enforced exclusively by update_profile_avatar().
revoke insert, update on public.profiles from authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (id, display_name) on public.profiles to authenticated;

create function private.get_effective_public_player_profile(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_result jsonb := private.get_public_player_profile(p_player_id);
  v_showcase public.profile_showcases%rowtype;
  v_featured_badge text;
  v_profile_theme text;
  v_pins text[] := '{}'::text[];
  v_simulate_achievements boolean;
begin
  if v_result is null or not exists (
    select 1 from private.qa_accounts qa where qa.user_id = p_player_id
  ) then
    return v_result;
  end if;

  v_simulate_achievements :=
    private.qa_simulates_all_achievements(p_player_id);

  select showcase.* into v_showcase
  from public.profile_showcases showcase
  where showcase.player_id = p_player_id;

  if v_showcase.featured_badge_key is not null and exists (
    select 1
    from public.rank_titles titles
    where titles.badge_key = v_showcase.featured_badge_key
      and private.effective_player_rank(p_player_id, titles.category)
        >= titles.rank_floor
  ) then
    v_featured_badge := v_showcase.featured_badge_key;
  else
    select titles.badge_key into v_featured_badge
    from public.rank_titles titles
    where titles.badge_key is not null
      and private.effective_player_rank(p_player_id, titles.category)
        >= titles.rank_floor
    order by
      private.effective_player_rank(p_player_id, titles.category) desc,
      titles.rank_floor desc,
      titles.category::text
    limit 1;
  end if;

  if v_showcase.profile_theme_id is not null and exists (
    select 1
    from public.profile_theme_unlocks themes
    where themes.theme_id = v_showcase.profile_theme_id
      and private.effective_player_rank(p_player_id, themes.category)
        >= themes.required_rank
  ) then
    v_profile_theme := v_showcase.profile_theme_id;
  end if;

  if v_simulate_achievements then
    select coalesce(array_agg(pin.id order by pin.ordinality), '{}'::text[])
    into v_pins
    from unnest(coalesce(v_showcase.pinned_achievement_ids, '{}'::text[]))
      with ordinality as pin(id, ordinality)
    join public.achievements achievements on achievements.id = pin.id;
  end if;

  v_result := jsonb_set(v_result, '{showcase}', jsonb_build_object(
    'featured_badge_key', v_featured_badge,
    'custom_featured_badge_key', v_showcase.featured_badge_key,
    'pinned_achievement_ids', to_jsonb(v_pins),
    'profile_theme_id', v_profile_theme,
    'custom_profile_theme_id', v_showcase.profile_theme_id
  ), true);

  v_result := jsonb_set(v_result, '{total_xp}', to_jsonb((
    select sum(public.xp_for_rank(
      private.effective_player_rank(p_player_id, live.category)
    ))::integer
    from unnest(enum_range(null::public.question_category)) as live(category)
  )), true);

  v_result := jsonb_set(v_result, '{category_ranks}', (
    select jsonb_agg(jsonb_build_object(
      'category', live.category,
      'xp', public.xp_for_rank(
        private.effective_player_rank(p_player_id, live.category)
      ),
      'rank', private.effective_player_rank(p_player_id, live.category),
      'title', titles.title,
      'simulated', true
    ) order by live.category::text)
    from unnest(enum_range(null::public.question_category)) as live(category)
    left join lateral (
      select rank_titles.title
      from public.rank_titles
      where rank_titles.category = live.category
        and rank_titles.rank_floor <=
          private.effective_player_rank(p_player_id, live.category)
      order by rank_titles.rank_floor desc
      limit 1
    ) titles on true
  ), true);

  v_result := jsonb_set(v_result, '{earned_badges}', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'badge_key', titles.badge_key,
      'category', titles.category,
      'rank_floor', titles.rank_floor,
      'title', titles.title,
      'simulated', true
    ) order by titles.category::text, titles.rank_floor), '[]'::jsonb)
    from public.rank_titles titles
    where titles.badge_key is not null
      and private.effective_player_rank(p_player_id, titles.category)
        >= titles.rank_floor
  ), true);

  v_result := jsonb_set(v_result, '{earned_achievements}', (
    select case when v_simulate_achievements then coalesce(jsonb_agg(
      jsonb_build_object(
        'id', achievements.id,
        'name', achievements.name,
        'description', achievements.description,
        'tier', achievements.tier,
        'simulated', true
      ) order by achievements.sort_order, achievements.id
    ), '[]'::jsonb) else '[]'::jsonb end
    from public.achievements
  ), true);

  -- Historical rows may predate allowlisting. They remain excluded from every
  -- QA-facing competitive statistic just as they are from the leaderboards.
  v_result := jsonb_set(v_result, '{classic_bests}', '[]'::jsonb, true);
  v_result := jsonb_set(v_result, '{survival}', jsonb_build_object(
    'best_run', 0,
    'attempts', 0
  ), true);
  v_result := jsonb_set(v_result, '{daily}', jsonb_build_object(
    'played', 0,
    'longest_streak', 0,
    'best_score', 0
  ), true);

  return v_result || jsonb_build_object(
    'is_qa', true,
    'is_simulated', true
  );
end;
$function$;

revoke all on function private.get_effective_public_player_profile(uuid)
  from public, anon, authenticated;
grant execute on function private.get_effective_public_player_profile(uuid)
  to anon, authenticated;

create or replace function public.get_public_player_profile(p_player_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.get_effective_public_player_profile(p_player_id);
$function$;

create or replace function private.update_profile_showcase(
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
  v_player uuid := private.require_profile_owner();
  v_pins text[] := coalesce(p_pinned_achievement_ids, '{}'::text[]);
  v_count integer;
  v_is_qa boolean := exists (
    select 1 from private.qa_accounts qa where qa.user_id = v_player
  );
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
    from public.rank_titles titles
    where titles.badge_key = p_featured_badge_key
      and private.effective_player_rank(v_player, titles.category)
        >= titles.rank_floor
  ) then
    raise exception 'that badge has not been earned';
  end if;

  if p_profile_theme_id is not null and not exists (
    select 1
    from public.profile_theme_unlocks themes
    where themes.theme_id = p_profile_theme_id
      and private.effective_player_rank(v_player, themes.category)
        >= themes.required_rank
  ) then
    raise exception 'that profile theme has not been unlocked';
  end if;

  if cardinality(v_pins) > 0 then
    if v_is_qa and private.qa_simulates_all_achievements(v_player) then
      select count(*) into v_count
      from public.achievements achievements
      where achievements.id = any(v_pins);
    else
      select count(*) into v_count
      from public.player_achievements achievements
      where achievements.player_id = v_player
        and achievements.earned
        and achievements.achievement_id = any(v_pins);
    end if;

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
  ) values (
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

  return private.get_effective_public_player_profile(v_player);
end;
$function$;

comment on function public.get_qa_simulation() is
  'Returns only the signed-in allowlisted QA caller simulation settings.';
comment on function public.update_qa_simulation(json, boolean) is
  'Atomically updates only the signed-in allowlisted QA caller simulation.';
comment on function public.get_qa_simulated_progress() is
  'Returns presentation-only progress for the signed-in QA caller.';
comment on function public.update_profile_avatar(text) is
  'Owner-only avatar update with real or QA-effective rank validation.';
