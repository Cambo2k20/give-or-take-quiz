-- Mutual friends and private, asynchronous challenges.
--
-- All client reads and writes go through RPCs. The exposed tables still have
-- participant-only RLS as defence in depth, but authenticated users receive no
-- direct table privileges: in particular, this prevents a pending recipient
-- from selecting the challenger's hidden score.

create type public.friendship_status as enum ('pending', 'accepted');
create type public.challenge_format as enum ('classic', 'survival');
create type public.challenge_state as enum (
  'draft', 'pending', 'completed', 'declined', 'cancelled', 'expired'
);

revoke all on type
  public.friendship_status,
  public.challenge_format,
  public.challenge_state
from public, anon;
grant usage on type
  public.friendship_status,
  public.challenge_format,
  public.challenge_state
to authenticated, service_role;

create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status       public.friendship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  updated_at   timestamptz not null default now(),

  constraint friendships_players_differ check (requester_id <> recipient_id),
  constraint friendships_response_matches_status check (
    (status = 'pending' and responded_at is null)
    or (status = 'accepted' and responded_at is not null)
  )
);

create unique index friendships_one_row_per_pair
  on public.friendships (
    least(requester_id, recipient_id),
    greatest(requester_id, recipient_id)
  );

create index friendships_requester_status_idx
  on public.friendships (requester_id, status, updated_at desc);

create index friendships_recipient_status_idx
  on public.friendships (recipient_id, status, updated_at desc);

create table public.game_challenges (
  id                    uuid primary key default gen_random_uuid(),
  challenger_id         uuid not null references public.profiles (id) on delete cascade,
  recipient_id          uuid not null references public.profiles (id) on delete cascade,
  format                public.challenge_format not null,
  classic_mode          public.game_mode,
  state                 public.challenge_state not null default 'draft',
  challenger_round_id   uuid references public.game_rounds (id),
  recipient_round_id    uuid references public.game_rounds (id),
  challenger_result     integer,
  recipient_result      integer,
  activated_at          timestamptz,
  expires_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint game_challenges_players_differ
    check (challenger_id <> recipient_id),
  constraint game_challenges_mode_matches_format check (
    (format = 'classic'
      and classic_mode is not null
      and classic_mode not in ('daily', 'survival'))
    or (format = 'survival' and classic_mode is null)
  ),
  constraint game_challenges_rounds_differ check (
    challenger_round_id is null
    or recipient_round_id is null
    or challenger_round_id <> recipient_round_id
  ),
  constraint game_challenges_results_nonnegative check (
    (challenger_result is null or challenger_result >= 0)
    and (recipient_result is null or recipient_result >= 0)
  ),
  constraint game_challenges_results_fit_format check (
    case format
      when 'classic' then
        (challenger_result is null or challenger_result <= 10000)
        and (recipient_result is null or recipient_result <= 10000)
      when 'survival' then
        (challenger_result is null or challenger_result <= 500)
        and (recipient_result is null or recipient_result <= 500)
    end
  ),
  constraint game_challenges_state_shape check (
    case state
      when 'draft' then
        challenger_round_id is null
        and recipient_round_id is null
        and challenger_result is null
        and recipient_result is null
        and activated_at is null
        and expires_at is null
        and completed_at is null
      when 'pending' then
        challenger_round_id is not null
        and challenger_result is not null
        and recipient_round_id is null
        and recipient_result is null
        and activated_at is not null
        and expires_at is not null
        and completed_at is null
      when 'completed' then
        challenger_round_id is not null
        and recipient_round_id is not null
        and challenger_result is not null
        and recipient_result is not null
        and activated_at is not null
        and expires_at is not null
        and completed_at is not null
      else true
    end
  ),
  constraint game_challenges_deadline_after_activation check (
    expires_at is null
    or (activated_at is not null and expires_at > activated_at)
  )
);

create unique index game_challenges_one_active_per_pair
  on public.game_challenges (
    least(challenger_id, recipient_id),
    greatest(challenger_id, recipient_id)
  )
  where state in ('draft', 'pending');

create index game_challenges_challenger_state_idx
  on public.game_challenges (challenger_id, state, updated_at desc);

create index game_challenges_recipient_state_idx
  on public.game_challenges (recipient_id, state, updated_at desc);

create index game_challenges_challenger_round_idx
  on public.game_challenges (challenger_round_id)
  where challenger_round_id is not null;

create index game_challenges_recipient_round_idx
  on public.game_challenges (recipient_round_id)
  where recipient_round_id is not null;

create index game_challenges_completed_pair_idx
  on public.game_challenges (
    least(challenger_id, recipient_id),
    greatest(challenger_id, recipient_id),
    completed_at desc
  )
  where state = 'completed';

create index game_challenges_expiry_idx
  on public.game_challenges (expires_at)
  where state = 'pending';

create table public.game_challenge_questions (
  challenge_id uuid not null
    references public.game_challenges (id) on delete cascade,
  question_id  text not null references public.questions (id),
  asked_order  smallint not null,

  primary key (challenge_id, question_id),
  unique (challenge_id, asked_order),
  constraint game_challenge_questions_order_positive check (asked_order > 0)
);

create index game_challenge_questions_question_idx
  on public.game_challenge_questions (question_id);

-- Blocking and inbox cursors are implementation details. Keeping them outside
-- the exposed schema avoids leaking either a block relationship or read state.
create table private.player_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint player_blocks_players_differ check (blocker_id <> blocked_id)
);

create index player_blocks_blocked_idx
  on private.player_blocks (blocked_id, blocker_id);

create table private.social_inbox_state (
  player_id    uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default 'epoch'::timestamptz
);

revoke all on table private.player_blocks, private.social_inbox_state
  from public, anon, authenticated;

-- Defence-in-depth RLS. RPCs below are the only granted client interface.
alter table public.friendships enable row level security;
alter table public.game_challenges enable row level security;
alter table public.game_challenge_questions enable row level security;

create policy friendships_participants_can_read
  on public.friendships for select to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) in (requester_id, recipient_id)
  );

create policy game_challenges_participants_can_read
  on public.game_challenges for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      (select auth.uid()) = challenger_id
      or ((select auth.uid()) = recipient_id and state <> 'draft')
    )
  );

create policy game_challenge_questions_active_player_can_read
  on public.game_challenge_questions for select to authenticated
  using (
    exists (
      select 1
      from public.game_challenges c
      where c.id = challenge_id
        and (
          ((select auth.uid()) = c.challenger_id and c.state = 'draft')
          or (
            (select auth.uid()) = c.recipient_id
            and c.state = 'pending'
            and c.expires_at > now()
          )
        )
    )
  );

revoke all on table
  public.friendships,
  public.game_challenges,
  public.game_challenge_questions
from public, anon, authenticated;

grant all on table
  public.friendships,
  public.game_challenges,
  public.game_challenge_questions
to service_role;

-- Every social RPC starts here. A confirmed email and claimed display name are
-- requirements for both discoverability and play.
create function private.require_social_player()
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
    raise exception 'sign in to use friends and challenges';
  end if;

  if not private.is_email_confirmed() then
    raise exception 'confirm your email address before using friends';
  end if;

  if not exists (select 1 from public.profiles where id = v_player) then
    raise exception 'pick a display name before using friends';
  end if;

  return v_player;
end;
$function$;

revoke all on function private.require_social_player()
  from public, anon, authenticated;

create function private.expire_game_challenges()
returns void
language sql
volatile
security definer
set search_path = ''
as $function$
  update public.game_challenges
  set state = 'expired', updated_at = now()
  where state = 'pending'
    and expires_at <= now();
$function$;

revoke all on function private.expire_game_challenges()
  from public, anon, authenticated;

-- Head-to-head statistics are derived from immutable completed matches. There
-- are no mutable counters to race or repair. A draw or loss breaks a win streak.
create function private.friend_record_json(
  p_player uuid,
  p_opponent uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with matches as (
    select
      c.id,
      c.completed_at,
      case
        when c.challenger_id = p_player then
          case
            when c.challenger_result > c.recipient_result then 'win'
            when c.challenger_result < c.recipient_result then 'loss'
            else 'draw'
          end
        else
          case
            when c.recipient_result > c.challenger_result then 'win'
            when c.recipient_result < c.challenger_result then 'loss'
            else 'draw'
          end
      end as outcome
    from public.game_challenges c
    where c.state = 'completed'
      and (
        (c.challenger_id = p_player and c.recipient_id = p_opponent)
        or (c.challenger_id = p_opponent and c.recipient_id = p_player)
      )
  ), ordered as (
    select
      matches.*,
      sum(case when outcome = 'win' then 0 else 1 end) over (
        order by completed_at desc, id desc
        rows between unbounded preceding and current row
      ) as newer_non_wins,
      sum(case when outcome = 'win' then 0 else 1 end) over (
        order by completed_at, id
        rows between unbounded preceding and current row
      ) as run_group
    from matches
  ), win_runs as (
    select run_group, count(*) as wins
    from ordered
    where outcome = 'win'
    group by run_group
  )
  select jsonb_build_object(
    'played', count(*),
    'wins', count(*) filter (where outcome = 'win'),
    'losses', count(*) filter (where outcome = 'loss'),
    'draws', count(*) filter (where outcome = 'draw'),
    'current_win_streak', count(*) filter (
      where outcome = 'win' and newer_non_wins = 0
    ),
    'best_win_streak', coalesce((select max(wins) from win_runs), 0),
    'last_played_at', max(completed_at)
  )
  from ordered;
$function$;

revoke all on function private.friend_record_json(uuid, uuid)
  from public, anon, authenticated;

create function private.search_players_exact(p_display_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_target public.profiles%rowtype;
  v_friendship public.friendships%rowtype;
  v_relationship text := 'none';
begin
  if p_display_name is null or btrim(p_display_name) = '' then
    return null;
  end if;

  select p.* into v_target
  from public.profiles p
  where lower(p.display_name) = lower(btrim(p_display_name))
    and p.id <> v_player;

  if not found then
    return null;
  end if;

  -- A block is intentionally indistinguishable from a name that does not exist.
  if exists (
    select 1 from private.player_blocks b
    where (b.blocker_id = v_player and b.blocked_id = v_target.id)
       or (b.blocker_id = v_target.id and b.blocked_id = v_player)
  ) then
    return null;
  end if;

  select f.* into v_friendship
  from public.friendships f
  where least(f.requester_id, f.recipient_id) = least(v_player, v_target.id)
    and greatest(f.requester_id, f.recipient_id) = greatest(v_player, v_target.id);

  if found then
    v_relationship := case
      when v_friendship.status = 'accepted' then 'friend'
      when v_friendship.requester_id = v_player then 'outgoing'
      else 'incoming'
    end;
  end if;

  return jsonb_build_object(
    'id', v_target.id,
    'display_name', v_target.display_name,
    'avatar_key', v_target.avatar_key,
    'relationship', v_relationship
  );
end;
$function$;

revoke all on function private.search_players_exact(text) from public, anon;
grant execute on function private.search_players_exact(text) to authenticated;

create function public.search_players_exact(p_display_name text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.search_players_exact(p_display_name);
$function$;

revoke all on function public.search_players_exact(text) from public, anon;
grant execute on function public.search_players_exact(text) to authenticated;

create function private.send_friend_request(p_display_name text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_target public.profiles%rowtype;
  v_request public.friendships%rowtype;
  v_pending integer;
begin
  select p.* into v_target
  from public.profiles p
  where lower(p.display_name) = lower(btrim(p_display_name));

  if not found then
    raise exception 'no player has that exact display name';
  end if;

  if v_target.id = v_player then
    raise exception 'you cannot add yourself';
  end if;

  -- Serialize every operation involving this pair in UUID order. Locking the
  -- caller also makes the 20-outgoing-request limit safe under concurrency.
  perform p.id
  from public.profiles p
  where p.id in (v_player, v_target.id)
  order by p.id
  for update;

  if exists (
    select 1 from private.player_blocks b
    where (b.blocker_id = v_player and b.blocked_id = v_target.id)
       or (b.blocker_id = v_target.id and b.blocked_id = v_player)
  ) then
    raise exception 'that player is unavailable';
  end if;

  if exists (
    select 1 from public.friendships f
    where least(f.requester_id, f.recipient_id) = least(v_player, v_target.id)
      and greatest(f.requester_id, f.recipient_id) = greatest(v_player, v_target.id)
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
    values (v_player, v_target.id)
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

revoke all on function private.send_friend_request(text) from public, anon;
grant execute on function private.send_friend_request(text) to authenticated;

create function public.send_friend_request(p_display_name text)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.send_friend_request(p_display_name);
$function$;

revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;

create function private.respond_friend_request(
  p_friendship_id uuid,
  p_accept boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_request public.friendships%rowtype;
  v_recipient_friends integer;
  v_requester_friends integer;
begin
  select * into v_request
  from public.friendships
  where id = p_friendship_id;

  if not found
     or v_request.recipient_id <> v_player
     or v_request.status <> 'pending' then
    raise exception 'friend request unavailable';
  end if;

  -- A player may be accepting different requests in concurrent transactions.
  -- Lock both profiles consistently before checking either 100-friend limit.
  perform p.id
  from public.profiles p
  where p.id in (v_player, v_request.requester_id)
  order by p.id
  for update;

  -- Re-read and lock the request only after the pair lock. Remove/block/create
  -- paths use the same profile-first order, avoiding a friendship/profile
  -- deadlock while still protecting this state transition.
  select * into v_request
  from public.friendships
  where id = p_friendship_id
  for update;

  if not found
     or v_request.recipient_id <> v_player
     or v_request.status <> 'pending' then
    raise exception 'friend request unavailable';
  end if;

  if not coalesce(p_accept, false) then
    delete from public.friendships where id = v_request.id;
    return;
  end if;

  select count(*) into v_recipient_friends
  from public.friendships f
  where f.status = 'accepted'
    and v_player in (f.requester_id, f.recipient_id);

  select count(*) into v_requester_friends
  from public.friendships f
  where f.status = 'accepted'
    and v_request.requester_id in (f.requester_id, f.recipient_id);

  if v_recipient_friends >= 100 or v_requester_friends >= 100 then
    raise exception 'one of these players already has 100 friends';
  end if;

  if exists (
    select 1 from private.player_blocks b
    where (b.blocker_id = v_player and b.blocked_id = v_request.requester_id)
       or (b.blocker_id = v_request.requester_id and b.blocked_id = v_player)
  ) then
    raise exception 'friend request unavailable';
  end if;

  update public.friendships
  set status = 'accepted', responded_at = now(), updated_at = now()
  where id = v_request.id;
end;
$function$;

revoke all on function private.respond_friend_request(uuid, boolean)
  from public, anon;
grant execute on function private.respond_friend_request(uuid, boolean)
  to authenticated;

create function public.respond_friend_request(
  p_friendship_id uuid,
  p_accept boolean
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.respond_friend_request(p_friendship_id, p_accept);
$function$;

revoke all on function public.respond_friend_request(uuid, boolean)
  from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean)
  to authenticated;

create function private.remove_friend(p_friend_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
begin
  if p_friend_id is null or p_friend_id = v_player then
    raise exception 'friend unavailable';
  end if;

  perform p.id
  from public.profiles p
  where p.id in (v_player, p_friend_id)
  order by p.id
  for update;

  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.recipient_id) = least(v_player, p_friend_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(v_player, p_friend_id)
  ) then
    raise exception 'friend unavailable';
  end if;

  update public.game_challenges
  set state = 'cancelled', updated_at = now()
  where state in ('draft', 'pending')
    and least(challenger_id, recipient_id) = least(v_player, p_friend_id)
    and greatest(challenger_id, recipient_id) = greatest(v_player, p_friend_id);

  delete from public.friendships f
  where f.status = 'accepted'
    and least(f.requester_id, f.recipient_id) = least(v_player, p_friend_id)
    and greatest(f.requester_id, f.recipient_id) = greatest(v_player, p_friend_id);
end;
$function$;

revoke all on function private.remove_friend(uuid) from public, anon;
grant execute on function private.remove_friend(uuid) to authenticated;

create function public.remove_friend(p_friend_id uuid)
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.remove_friend(p_friend_id);
$function$;

revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;

create function private.block_player(p_player_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
begin
  if p_player_id is null or p_player_id = v_player then
    raise exception 'player unavailable';
  end if;

  if not exists (select 1 from public.profiles where id = p_player_id) then
    raise exception 'player unavailable';
  end if;

  perform p.id
  from public.profiles p
  where p.id in (v_player, p_player_id)
  order by p.id
  for update;

  insert into private.player_blocks (blocker_id, blocked_id)
  values (v_player, p_player_id)
  on conflict do nothing;

  update public.game_challenges
  set state = 'cancelled', updated_at = now()
  where state in ('draft', 'pending')
    and least(challenger_id, recipient_id) = least(v_player, p_player_id)
    and greatest(challenger_id, recipient_id) = greatest(v_player, p_player_id);

  delete from public.friendships f
  where least(f.requester_id, f.recipient_id) = least(v_player, p_player_id)
    and greatest(f.requester_id, f.recipient_id) = greatest(v_player, p_player_id);
end;
$function$;

revoke all on function private.block_player(uuid) from public, anon;
grant execute on function private.block_player(uuid) to authenticated;

create function public.block_player(p_player_id uuid)
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.block_player(p_player_id);
$function$;

revoke all on function public.block_player(uuid) from public, anon;
grant execute on function public.block_player(uuid) to authenticated;

create function private.unblock_player(p_player_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
begin
  if p_player_id is null or p_player_id = v_player then
    raise exception 'player unavailable';
  end if;

  perform p.id
  from public.profiles p
  where p.id in (v_player, p_player_id)
  order by p.id
  for update;

  delete from private.player_blocks
  where blocker_id = v_player and blocked_id = p_player_id;
end;
$function$;

revoke all on function private.unblock_player(uuid) from public, anon;
grant execute on function private.unblock_player(uuid) to authenticated;

create function public.unblock_player(p_player_id uuid)
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.unblock_player(p_player_id);
$function$;

revoke all on function public.unblock_player(uuid) from public, anon;
grant execute on function public.unblock_player(uuid) to authenticated;

create function private.create_game_challenge(
  p_friend_id uuid,
  p_format public.challenge_format,
  p_classic_mode public.game_mode default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_challenge uuid;
  v_count integer;
begin
  perform private.expire_game_challenges();

  if p_friend_id is null or p_friend_id = v_player then
    raise exception 'friend unavailable';
  end if;

  perform p.id
  from public.profiles p
  where p.id in (v_player, p_friend_id)
  order by p.id
  for update;

  if p_format = 'classic' and (
    p_classic_mode is null or p_classic_mode in ('daily', 'survival')
  ) then
    raise exception 'Classic challenges need a subject or Mixed';
  end if;

  if p_format = 'survival' and p_classic_mode is not null then
    raise exception 'Survival challenges do not take a subject';
  end if;

  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.recipient_id) = least(v_player, p_friend_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(v_player, p_friend_id)
  ) then
    raise exception 'only friends can challenge each other';
  end if;

  if exists (
    select 1 from private.player_blocks b
    where (b.blocker_id = v_player and b.blocked_id = p_friend_id)
       or (b.blocker_id = p_friend_id and b.blocked_id = v_player)
  ) then
    raise exception 'friend unavailable';
  end if;

  begin
    insert into public.game_challenges (
      challenger_id, recipient_id, format, classic_mode
    )
    values (v_player, p_friend_id, p_format, p_classic_mode)
    returning id into v_challenge;
  exception when unique_violation then
    raise exception 'you already have an active challenge with this friend';
  end;

  if p_format = 'classic' and p_classic_mode <> 'mixed' then
    insert into public.game_challenge_questions (
      challenge_id, question_id, asked_order
    )
    select
      v_challenge,
      picked.id,
      row_number() over (
        order by md5(v_challenge::text || ':order:' || picked.id)
      )::smallint
    from (
      select q.id
      from public.questions q
      where not q.is_daily
        and q.category::text = p_classic_mode::text
      order by md5(v_challenge::text || ':pick:' || q.id)
      limit 10
    ) picked;
  elsif p_format = 'classic' then
    with ranked as (
      select
        q.id,
        row_number() over (
          partition by q.category
          order by md5(v_challenge::text || ':category:' || q.id)
        ) as category_order
      from public.questions q
      where not q.is_daily
    ), base as (
      select id from ranked where category_order = 1
    ), extras as (
      select id
      from ranked
      where category_order > 1
      order by md5(v_challenge::text || ':extra:' || id)
      limit 2
    ), picked as (
      select id from base
      union all
      select id from extras
    )
    insert into public.game_challenge_questions (
      challenge_id, question_id, asked_order
    )
    select
      v_challenge,
      picked.id,
      row_number() over (
        order by md5(v_challenge::text || ':order:' || picked.id)
      )::smallint
    from picked;
  else
    insert into public.game_challenge_questions (
      challenge_id, question_id, asked_order
    )
    select
      v_challenge,
      q.id,
      row_number() over (
        order by md5(v_challenge::text || ':survival:' || q.id)
      )::smallint
    from public.questions q
    where not q.is_daily;
  end if;

  select count(*) into v_count
  from public.game_challenge_questions
  where challenge_id = v_challenge;

  if (p_format = 'classic' and v_count <> 10)
     or (p_format = 'survival' and v_count < 1) then
    raise exception 'the question bank cannot build that challenge deck';
  end if;

  return v_challenge;
end;
$function$;

revoke all on function private.create_game_challenge(
  uuid, public.challenge_format, public.game_mode
) from public, anon;
grant execute on function private.create_game_challenge(
  uuid, public.challenge_format, public.game_mode
) to authenticated;

create function public.create_game_challenge(
  p_friend_id uuid,
  p_format public.challenge_format,
  p_classic_mode public.game_mode default null
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.create_game_challenge(p_friend_id, p_format, p_classic_mode);
$function$;

revoke all on function public.create_game_challenge(
  uuid, public.challenge_format, public.game_mode
) from public, anon;
grant execute on function public.create_game_challenge(
  uuid, public.challenge_format, public.game_mode
) to authenticated;

create function private.get_game_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_result jsonb;
begin
  perform private.expire_game_challenges();

  select jsonb_build_object(
    'id', c.id,
    'format', c.format,
    'classic_mode', c.classic_mode,
    'state', c.state,
    'role', case when c.challenger_id = v_player then 'challenger' else 'recipient' end,
    'opponent', jsonb_build_object(
      'id', opponent.id,
      'display_name', opponent.display_name,
      'avatar_key', opponent.avatar_key
    ),
    'my_result', case
      when c.challenger_id = v_player then c.challenger_result
      else c.recipient_result
    end,
    'opponent_result', case
      when c.state = 'completed' and c.challenger_id = v_player then c.recipient_result
      when c.state = 'completed' then c.challenger_result
      else null
    end,
    'activated_at', c.activated_at,
    'expires_at', c.expires_at,
    'completed_at', c.completed_at,
    'created_at', c.created_at
  ) into v_result
  from public.game_challenges c
  join public.profiles opponent on opponent.id = case
    when c.challenger_id = v_player then c.recipient_id
    else c.challenger_id
  end
  where c.id = p_challenge_id
    and (
      c.challenger_id = v_player
      or (c.recipient_id = v_player and c.state <> 'draft')
    );

  if v_result is null then
    raise exception 'challenge unavailable';
  end if;

  return v_result;
end;
$function$;

revoke all on function private.get_game_challenge(uuid) from public, anon;
grant execute on function private.get_game_challenge(uuid) to authenticated;

create function public.get_game_challenge(p_challenge_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.get_game_challenge(p_challenge_id);
$function$;

revoke all on function public.get_game_challenge(uuid) from public, anon;
grant execute on function public.get_game_challenge(uuid) to authenticated;

create function private.get_game_challenge_deck(p_challenge_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_challenge public.game_challenges%rowtype;
  v_deck jsonb;
begin
  perform private.expire_game_challenges();

  select * into v_challenge
  from public.game_challenges
  where id = p_challenge_id;

  if not found or not (
    (v_challenge.challenger_id = v_player
      and v_challenge.state = 'draft'
      and v_challenge.challenger_round_id is null)
    or (v_challenge.recipient_id = v_player
      and v_challenge.state = 'pending'
      and v_challenge.expires_at > now()
      and v_challenge.recipient_round_id is null)
  ) then
    raise exception 'challenge unavailable';
  end if;

  select coalesce(jsonb_agg(q.question_id order by q.asked_order), '[]'::jsonb)
  into v_deck
  from public.game_challenge_questions q
  where q.challenge_id = p_challenge_id;

  return v_deck;
end;
$function$;

revoke all on function private.get_game_challenge_deck(uuid) from public, anon;
grant execute on function private.get_game_challenge_deck(uuid) to authenticated;

create function public.get_game_challenge_deck(p_challenge_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.get_game_challenge_deck(p_challenge_id);
$function$;

revoke all on function public.get_game_challenge_deck(uuid) from public, anon;
grant execute on function public.get_game_challenge_deck(uuid) to authenticated;

create function private.submit_game_challenge(
  p_challenge_id uuid,
  p_guesses jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_challenge public.game_challenges%rowtype;
  v_count integer;
  v_deck_count integer;
  v_matched integer;
  v_submission jsonb;
  v_round_id uuid;
  v_result integer;
  -- A test or trusted server workflow can complete multiple matches inside one
  -- transaction. clock_timestamp() preserves their real completion order,
  -- whereas now() would give every submission the transaction start time.
  v_now timestamptz := clock_timestamp();
begin
  perform private.expire_game_challenges();

  select * into v_challenge
  from public.game_challenges
  where id = p_challenge_id
  for update;

  if not found then
    raise exception 'challenge unavailable';
  end if;

  if v_challenge.challenger_id = v_player then
    if v_challenge.state <> 'draft' or v_challenge.challenger_round_id is not null then
      raise exception 'challenge attempt already used';
    end if;
  elsif v_challenge.recipient_id = v_player then
    if v_challenge.state = 'expired' then
      raise exception 'this challenge has expired';
    end if;
    if v_challenge.state <> 'pending'
       or v_challenge.expires_at <= v_now
       or v_challenge.recipient_round_id is not null then
      raise exception 'challenge unavailable';
    end if;
  else
    raise exception 'challenge unavailable';
  end if;

  if jsonb_typeof(p_guesses) is distinct from 'array' then
    raise exception 'guesses must be a JSON array';
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

  select count(*) into v_count from jsonb_array_elements(p_guesses);
  select count(*) into v_deck_count
  from public.game_challenge_questions
  where challenge_id = p_challenge_id;

  if v_challenge.format = 'classic' and v_count <> v_deck_count then
    raise exception 'a Classic challenge must answer its complete deck';
  end if;

  if v_challenge.format = 'survival'
     and (v_count < 1 or v_count > v_deck_count) then
    raise exception 'a Survival challenge must answer a valid deck prefix';
  end if;

  select count(*) into v_matched
  from jsonb_array_elements(p_guesses) with ordinality as item(guess, ordinality)
  join public.game_challenge_questions deck
    on deck.challenge_id = p_challenge_id
   and deck.asked_order = item.ordinality
   and deck.question_id = item.guess ->> 'question_id';

  if v_matched <> v_count then
    raise exception 'challenge questions must be answered in their assigned order';
  end if;

  if v_challenge.format = 'classic' then
    v_submission := private.submit_round(v_challenge.classic_mode, p_guesses);
    v_round_id := (v_submission ->> 'round_id')::uuid;
    v_result := (v_submission ->> 'total_score')::integer;
  else
    v_submission := private.submit_survival_run(p_guesses);
    v_round_id := (v_submission ->> 'run_id')::uuid;
    v_result := (v_submission ->> 'survived')::integer;
  end if;

  if v_challenge.challenger_id = v_player then
    update public.game_challenges
    set
      state = 'pending',
      challenger_round_id = v_round_id,
      challenger_result = v_result,
      activated_at = v_now,
      expires_at = v_now + interval '7 days',
      updated_at = v_now
    where id = p_challenge_id;
  else
    update public.game_challenges
    set
      state = 'completed',
      recipient_round_id = v_round_id,
      recipient_result = v_result,
      completed_at = v_now,
      updated_at = v_now
    where id = p_challenge_id;
  end if;

  return jsonb_build_object(
    'challenge_id', p_challenge_id,
    'round_id', v_round_id,
    'result', v_result,
    'state', case
      when v_challenge.challenger_id = v_player then 'pending'
      else 'completed'
    end,
    'challenge', private.get_game_challenge(p_challenge_id)
  );
end;
$function$;

revoke all on function private.submit_game_challenge(uuid, jsonb)
  from public, anon;
grant execute on function private.submit_game_challenge(uuid, jsonb)
  to authenticated;

create function public.submit_game_challenge(
  p_challenge_id uuid,
  p_guesses jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.submit_game_challenge(p_challenge_id, p_guesses);
$function$;

revoke all on function public.submit_game_challenge(uuid, jsonb)
  from public, anon;
grant execute on function public.submit_game_challenge(uuid, jsonb)
  to authenticated;

create function private.cancel_game_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_challenge public.game_challenges%rowtype;
begin
  select * into v_challenge
  from public.game_challenges
  where id = p_challenge_id
  for update;

  if not found
     or v_challenge.challenger_id <> v_player
     or v_challenge.state not in ('draft', 'pending') then
    raise exception 'challenge unavailable';
  end if;

  update public.game_challenges
  set state = 'cancelled', updated_at = now()
  where id = p_challenge_id;
end;
$function$;

revoke all on function private.cancel_game_challenge(uuid) from public, anon;
grant execute on function private.cancel_game_challenge(uuid) to authenticated;

create function public.cancel_game_challenge(p_challenge_id uuid)
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.cancel_game_challenge(p_challenge_id);
$function$;

revoke all on function public.cancel_game_challenge(uuid) from public, anon;
grant execute on function public.cancel_game_challenge(uuid) to authenticated;

create function private.decline_game_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_challenge public.game_challenges%rowtype;
begin
  perform private.expire_game_challenges();

  select * into v_challenge
  from public.game_challenges
  where id = p_challenge_id
  for update;

  if not found
     or v_challenge.recipient_id <> v_player
     or v_challenge.state <> 'pending' then
    raise exception 'challenge unavailable';
  end if;

  update public.game_challenges
  set state = 'declined', updated_at = now()
  where id = p_challenge_id;
end;
$function$;

revoke all on function private.decline_game_challenge(uuid) from public, anon;
grant execute on function private.decline_game_challenge(uuid) to authenticated;

create function public.decline_game_challenge(p_challenge_id uuid)
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.decline_game_challenge(p_challenge_id);
$function$;

revoke all on function public.decline_game_challenge(uuid) from public, anon;
grant execute on function public.decline_game_challenge(uuid) to authenticated;

create function private.get_friend_match_history(
  p_friend_id uuid,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_limit integer := least(20, greatest(1, coalesce(p_limit, 20)));
  v_friend public.profiles%rowtype;
  v_matches jsonb;
begin
  if p_friend_id is null or p_friend_id = v_player then
    raise exception 'player unavailable';
  end if;

  select * into v_friend from public.profiles where id = p_friend_id;
  if not found then
    raise exception 'player unavailable';
  end if;

  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.recipient_id) = least(v_player, p_friend_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(v_player, p_friend_id)
  ) and not exists (
    select 1 from public.game_challenges c
    where c.state = 'completed'
      and least(c.challenger_id, c.recipient_id) = least(v_player, p_friend_id)
      and greatest(c.challenger_id, c.recipient_id) = greatest(v_player, p_friend_id)
  ) then
    raise exception 'player unavailable';
  end if;

  select coalesce(jsonb_agg(row_data order by completed_at desc, id desc), '[]'::jsonb)
  into v_matches
  from (
    select
      c.id,
      c.completed_at,
      jsonb_build_object(
        'id', c.id,
        'format', c.format,
        'classic_mode', c.classic_mode,
        'my_result', case
          when c.challenger_id = v_player then c.challenger_result
          else c.recipient_result
        end,
        'opponent_result', case
          when c.challenger_id = v_player then c.recipient_result
          else c.challenger_result
        end,
        'outcome', case
          when c.challenger_id = v_player then
            case
              when c.challenger_result > c.recipient_result then 'win'
              when c.challenger_result < c.recipient_result then 'loss'
              else 'draw'
            end
          else
            case
              when c.recipient_result > c.challenger_result then 'win'
              when c.recipient_result < c.challenger_result then 'loss'
              else 'draw'
            end
        end,
        'completed_at', c.completed_at
      ) as row_data
    from public.game_challenges c
    where c.state = 'completed'
      and least(c.challenger_id, c.recipient_id) = least(v_player, p_friend_id)
      and greatest(c.challenger_id, c.recipient_id) = greatest(v_player, p_friend_id)
    order by c.completed_at desc, c.id desc
    limit v_limit
  ) recent;

  return jsonb_build_object(
    'friend', jsonb_build_object(
      'id', v_friend.id,
      'display_name', v_friend.display_name,
      'avatar_key', v_friend.avatar_key
    ),
    'record', private.friend_record_json(v_player, p_friend_id),
    'matches', v_matches
  );
end;
$function$;

revoke all on function private.get_friend_match_history(uuid, integer)
  from public, anon;
grant execute on function private.get_friend_match_history(uuid, integer)
  to authenticated;

create function public.get_friend_match_history(
  p_friend_id uuid,
  p_limit integer default 20
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.get_friend_match_history(p_friend_id, p_limit);
$function$;

revoke all on function public.get_friend_match_history(uuid, integer)
  from public, anon;
grant execute on function public.get_friend_match_history(uuid, integer)
  to authenticated;

create function private.get_social_dashboard()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_seen timestamptz;
  v_unread integer;
  v_incoming jsonb;
  v_outgoing jsonb;
  v_friends jsonb;
  v_active jsonb;
  v_recent jsonb;
  v_blocked jsonb;
begin
  perform private.expire_game_challenges();

  select coalesce(s.last_seen_at, 'epoch'::timestamptz) into v_seen
  from private.social_inbox_state s
  where s.player_id = v_player;
  v_seen := coalesce(v_seen, 'epoch'::timestamptz);

  select count(*) into v_unread
  from (
    select f.id::text || ':request' as event_id
    from public.friendships f
    where f.recipient_id = v_player
      and f.status = 'pending'
      and f.created_at > v_seen
    union all
    select f.id::text || ':accepted'
    from public.friendships f
    where f.requester_id = v_player
      and f.status = 'accepted'
      and f.responded_at > v_seen
    union all
    select c.id::text || ':invite'
    from public.game_challenges c
    where c.recipient_id = v_player
      and c.state = 'pending'
      and c.activated_at > v_seen
    union all
    select c.id::text || ':result'
    from public.game_challenges c
    where c.challenger_id = v_player
      and c.state = 'completed'
      and c.completed_at > v_seen
  ) events;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'player', jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'avatar_key', p.avatar_key
      ),
      'created_at', f.created_at
    ) order by f.created_at desc
  ), '[]'::jsonb) into v_incoming
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.recipient_id = v_player and f.status = 'pending';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'player', jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'avatar_key', p.avatar_key
      ),
      'created_at', f.created_at
    ) order by f.created_at desc
  ), '[]'::jsonb) into v_outgoing
  from public.friendships f
  join public.profiles p on p.id = f.recipient_id
  where f.requester_id = v_player and f.status = 'pending';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'friendship_id', rows.friendship_id,
      'player', jsonb_build_object(
        'id', rows.friend_id,
        'display_name', rows.display_name,
        'avatar_key', rows.avatar_key
      ),
      'friends_since', rows.friends_since,
      'record', private.friend_record_json(v_player, rows.friend_id)
    ) order by lower(rows.display_name)
  ), '[]'::jsonb) into v_friends
  from (
    select
      f.id as friendship_id,
      p.id as friend_id,
      p.display_name,
      p.avatar_key,
      f.responded_at as friends_since
    from public.friendships f
    join public.profiles p on p.id = case
      when f.requester_id = v_player then f.recipient_id
      else f.requester_id
    end
    where f.status = 'accepted'
      and v_player in (f.requester_id, f.recipient_id)
  ) rows;

  select coalesce(jsonb_agg(row_data order by updated_at desc), '[]'::jsonb)
  into v_active
  from (
    select
      c.updated_at,
      jsonb_build_object(
        'id', c.id,
        'format', c.format,
        'classic_mode', c.classic_mode,
        'state', c.state,
        'role', case when c.challenger_id = v_player then 'challenger' else 'recipient' end,
        'opponent', jsonb_build_object(
          'id', p.id,
          'display_name', p.display_name,
          'avatar_key', p.avatar_key
        ),
        'my_result', case
          when c.challenger_id = v_player then c.challenger_result
          else c.recipient_result
        end,
        'opponent_result', null,
        'activated_at', c.activated_at,
        'expires_at', c.expires_at,
        'completed_at', c.completed_at,
        'created_at', c.created_at
      ) as row_data
    from public.game_challenges c
    join public.profiles p on p.id = case
      when c.challenger_id = v_player then c.recipient_id
      else c.challenger_id
    end
    where (c.state = 'draft' and c.challenger_id = v_player)
       or (c.state = 'pending' and v_player in (c.challenger_id, c.recipient_id))
  ) rows;

  select coalesce(jsonb_agg(row_data order by event_at desc), '[]'::jsonb)
  into v_recent
  from (
    select
      coalesce(c.completed_at, c.updated_at) as event_at,
      jsonb_build_object(
        'id', c.id,
        'format', c.format,
        'classic_mode', c.classic_mode,
        'state', c.state,
        'role', case when c.challenger_id = v_player then 'challenger' else 'recipient' end,
        'opponent', jsonb_build_object(
          'id', p.id,
          'display_name', p.display_name,
          'avatar_key', p.avatar_key
        ),
        'my_result', case
          when c.challenger_id = v_player then c.challenger_result
          else c.recipient_result
        end,
        'opponent_result', case
          when c.state = 'completed' and c.challenger_id = v_player then c.recipient_result
          when c.state = 'completed' then c.challenger_result
          else null
        end,
        'activated_at', c.activated_at,
        'expires_at', c.expires_at,
        'completed_at', c.completed_at,
        'created_at', c.created_at
      ) as row_data
    from public.game_challenges c
    join public.profiles p on p.id = case
      when c.challenger_id = v_player then c.recipient_id
      else c.challenger_id
    end
    where c.state in ('completed', 'expired')
      and v_player in (c.challenger_id, c.recipient_id)
    order by coalesce(c.completed_at, c.updated_at) desc
    limit 20
  ) rows;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'avatar_key', p.avatar_key,
      'blocked_at', b.created_at
    ) order by b.created_at desc
  ), '[]'::jsonb) into v_blocked
  from private.player_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = v_player;

  return jsonb_build_object(
    'unread_count', v_unread,
    'incoming_requests', v_incoming,
    'outgoing_requests', v_outgoing,
    'friends', v_friends,
    'active_challenges', v_active,
    'recent_results', v_recent,
    'blocked_players', v_blocked
  );
end;
$function$;

revoke all on function private.get_social_dashboard() from public, anon;
grant execute on function private.get_social_dashboard() to authenticated;

create function public.get_social_dashboard()
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.get_social_dashboard();
$function$;

revoke all on function public.get_social_dashboard() from public, anon;
grant execute on function public.get_social_dashboard() to authenticated;

create function private.mark_social_seen()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
begin
  insert into private.social_inbox_state (player_id, last_seen_at)
  values (v_player, now())
  on conflict (player_id) do update
  set last_seen_at = excluded.last_seen_at;
end;
$function$;

revoke all on function private.mark_social_seen() from public, anon;
grant execute on function private.mark_social_seen() to authenticated;

create function public.mark_social_seen()
returns void
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.mark_social_seen();
$function$;

revoke all on function public.mark_social_seen() from public, anon;
grant execute on function public.mark_social_seen() to authenticated;

comment on table public.friendships is
  'One canonical mutual-friend row per pair; all mutations go through social RPCs.';
comment on table public.game_challenges is
  'Private asynchronous Classic and Survival matches; pending opponent results are hidden by RPC responses.';
comment on table public.game_challenge_questions is
  'Immutable server-generated ordered deck shared by both challenge players.';
comment on function public.get_friend_match_history(uuid, integer) is
  'Returns a participant-only, per-opponent record and the 20 most recent completed matches.';
comment on function public.submit_game_challenge(uuid, jsonb) is
  'Locks and validates one challenge attempt, then records it through the normal server scoring path.';
