-- Classic now lasts five questions. Ten-question Classic submissions remain
-- accepted as a narrow compatibility path for the already-active challenge
-- and browser tabs loaded before the client deployment. New client draws and
-- challenge decks are always five, and only five-question rounds enter the
-- Classic leaderboard.

alter table public.game_rounds
  drop constraint if exists game_rounds_question_count_matches_mode;

alter table public.game_rounds
  add constraint game_rounds_question_count_matches_mode
  check (
    case mode
      when 'daily'    then question_count = 5
      when 'survival' then question_count between 1 and 500
      else question_count in (5, 10)
    end
  );

create or replace function private.submit_round(
  p_mode public.game_mode,
  p_guesses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player uuid := auth.uid();
  v_round uuid;
  v_count integer;
  v_distinct integer;
  v_known integer;
  v_total integer;
  v_category_count integer;
  v_expected_categories integer :=
    cardinality(enum_range(null::public.question_category));
begin
  if v_player is null then
    raise exception 'submit_round requires a signed-in player';
  end if;

  if not public.is_email_confirmed() then
    raise exception 'confirm your email address before submitting a round';
  end if;

  if not exists (select 1 from public.profiles where id = v_player) then
    raise exception 'pick a display name before submitting a round';
  end if;

  if p_mode in ('daily', 'survival') then
    raise exception '% rounds must be submitted through their dedicated function', p_mode;
  end if;

  if jsonb_typeof(p_guesses) is distinct from 'array' then
    raise exception 'guesses must be a JSON array';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(p_guesses);

  if v_count not in (5, 10) then
    raise exception 'a Classic round must contain exactly 5 guesses';
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

  select count(distinct guess ->> 'question_id') into v_distinct
  from jsonb_array_elements(p_guesses) as item(guess);

  if v_distinct <> v_count then
    raise exception 'a Classic round must contain unique questions';
  end if;

  select count(*) into v_known
  from jsonb_array_elements(p_guesses) as item(guess)
  join public.questions q on q.id = guess ->> 'question_id';

  if v_known <> v_count then
    raise exception 'every guess must reference a known question';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where q.is_daily
  ) then
    raise exception 'daily questions can only be answered through the daily';
  end if;

  if p_mode <> 'mixed' and exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where q.category::text <> p_mode::text
  ) then
    raise exception 'every question in a % round must be a % question',
      p_mode, p_mode;
  end if;

  if p_mode = 'mixed' then
    select count(distinct q.category) into v_category_count
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id';

    if (v_count = 5 and v_category_count <> 5)
       or (v_count = 10 and v_category_count <> v_expected_categories) then
      raise exception 'a Mixed round must use distinct question categories';
    end if;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_guesses) as item(guess)
    join public.questions q on q.id = guess ->> 'question_id'
    where (guess ->> 'guess')::numeric < q.min
       or (guess ->> 'guess')::numeric > q.max
  ) then
    raise exception 'every guess must stay within its question bounds';
  end if;

  insert into public.game_rounds (
    player_id,
    mode,
    total_score,
    question_count
  )
  values (v_player, p_mode, 0, v_count)
  returning id into v_round;

  insert into public.round_answers (
    round_id,
    question_id,
    asked_order,
    guess,
    points
  )
  select
    v_round,
    parsed.question_id,
    parsed.asked_order,
    parsed.guess,
    public.score_guess(parsed.question_id, parsed.guess)
  from (
    select
      item.ordinality::smallint as asked_order,
      item.guess ->> 'question_id' as question_id,
      (item.guess ->> 'guess')::numeric as guess
    from jsonb_array_elements(p_guesses)
      with ordinality as item(guess, ordinality)
  ) as parsed;

  select coalesce(sum(points), 0) into v_total
  from public.round_answers
  where round_id = v_round;

  if v_total not between 0 and v_count * 1000 then
    raise exception 'calculated score is outside the allowed range';
  end if;

  update public.game_rounds
  set total_score = v_total
  where id = v_round;

  return jsonb_build_object(
    'round_id', v_round,
    'total_score', v_total
  );
end;
$function$;

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
    where not q.is_daily;
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
    and r.question_count = 5
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
  'Best five-question Classic round per player and category. Correct means an answer worth at least 980 points.';

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
) as facts;

grant select on public.player_stats to anon, authenticated;

comment on view public.player_stats is
  'Every measurable fact about a player, pivoted to (stat_key, value) so the achievements catalogue can join to it generically.';

update public.achievements
set description = 'Score at least 80% in every subject.'
where id = 'polymath';
