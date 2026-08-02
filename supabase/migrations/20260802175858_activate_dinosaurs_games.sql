-- Public activation aligns the cross-subject achievements with all ten
-- selectable subjects.
update public.achievements
set threshold = 10
where id in ('well-read', 'polymath');

-- Mixed and Survival challenge decks are created server-side. Keep the
-- existing authorization and deck-shape rules, but let both formats use all
-- ten live subjects now that Dinosaurs and Games are launching.
create or replace function private.create_game_challenge(
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
      limit 5
    ) picked;
  elsif p_format = 'classic' then
    with ranked as (
      select
        q.id,
        q.category,
        row_number() over (
          partition by q.category
          order by md5(v_challenge::text || ':category:' || q.id)
        ) as category_order
      from public.questions q
      where not q.is_daily
        and q.category::text in (
          'population', 'history', 'geography', 'science',
          'animals', 'space', 'technology', 'movies', 'dinosaurs', 'games'
        )
    ), picked as (
      select id
      from ranked
      where category_order = 1
      order by md5(v_challenge::text || ':mixed:' || category::text)
      limit 5
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
    where not q.is_daily
      and q.category::text in (
        'population', 'history', 'geography', 'science',
        'animals', 'space', 'technology', 'movies', 'dinosaurs', 'games'
      );
  end if;

  select count(*) into v_count
  from public.game_challenge_questions
  where challenge_id = v_challenge;

  if (p_format = 'classic' and v_count <> 5)
     or (p_format = 'survival' and v_count < 1) then
    raise exception 'the question bank cannot build that challenge deck';
  end if;

  return v_challenge;
end;
$function$;
