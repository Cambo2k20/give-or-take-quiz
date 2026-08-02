\set ON_ERROR_STOP on
\set alpha_id '11111111-1111-4111-8111-111111111111'
\set bravo_id '22222222-2222-4222-8222-222222222222'
\set charlie_id '33333333-3333-4333-8333-333333333333'

begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $function$
begin
  if p_condition is distinct from true then
    raise exception 'assertion failed: %', p_message;
  end if;
end;
$function$;

create function pg_temp.assert_raises(p_sql text, p_message_part text)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_message text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_message = message_text;
    if strpos(v_message, p_message_part) = 0 then
      raise exception 'expected error containing "%", got "%"',
        p_message_part, v_message;
    end if;
    return;
  end;
  raise exception 'expected error containing "%", but the statement succeeded',
    p_message_part;
end;
$function$;

create function pg_temp.challenge_guesses(
  p_challenge_id uuid,
  p_pattern text,
  p_take integer default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', chosen.question_id,
        'guess', case p_pattern
          when 'perfect' then chosen.answer
          when 'miss' then case
            when public.slider_position(
              chosen.min, chosen.max, chosen.scale, chosen.answer
            ) >= 0.5 then chosen.min
            else chosen.max
          end
          else null
        end
      ) order by chosen.asked_order
    ),
    '[]'::jsonb
  )
  from (
    select deck.question_id, deck.asked_order,
      q.answer, q.min, q.max, q.scale
    from public.game_challenge_questions deck
    join public.questions q on q.id = deck.question_id
    where deck.challenge_id = p_challenge_id
    order by deck.asked_order
    limit coalesce(p_take, 32767)
  ) chosen;
$function$;

-- The Data API contract is RPC-only. Raw social rows and hidden scores are not
-- directly readable by authenticated clients even though RLS is also enabled.
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.friendships', 'select'),
  'authenticated must not read friendships directly'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.game_challenges', 'select'),
  'authenticated must not read challenge scores directly'
);
select pg_temp.assert_true(
  not has_table_privilege(
    'authenticated', 'public.game_challenge_questions', 'select'
  ),
  'authenticated must not read immutable decks directly'
);
select pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'public.get_social_dashboard()',
    'execute'
  ),
  'authenticated needs the social dashboard RPC'
);
select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.get_social_dashboard()',
    'execute'
  ),
  'anonymous users must not execute social RPCs'
);
select pg_temp.assert_true(
  (select count(*) from public.achievements) = 65,
  'the expanded catalogue must contain 65 distinct achievements'
);
select pg_temp.assert_true(
  (
    select bool_and(relrowsecurity)
    from pg_class
    where oid in (
      'public.friendships'::regclass,
      'public.game_challenges'::regclass,
      'public.game_challenge_questions'::regclass
    )
  ),
  'every exposed social table must have RLS enabled'
);

-- Temporarily grant SELECT inside this rolled-back test transaction so the
-- participant-only RLS policies themselves can be exercised. Production keeps
-- these grants revoked to prevent a pending score from being selected at all.
grant select on
  public.friendships,
  public.game_challenges,
  public.game_challenge_questions
to authenticated;

insert into public.question_subtype_rules (subtype, measure)
values ('count', 'quantity')
on conflict (subtype) do nothing;

insert into public.question_subtype_units (subtype, unit)
values ('count', 'count')
on conflict (subtype, unit) do nothing;

with categories(category) as (
  values
    ('population'::public.question_category),
    ('history'::public.question_category),
    ('geography'::public.question_category),
    ('science'::public.question_category),
    ('animals'::public.question_category),
    ('space'::public.question_category),
    ('technology'::public.question_category),
    ('movies'::public.question_category)
)
insert into public.questions (
  id, measure, subtype, prompt, answer, min, max, scale, unit,
  source_title, source_url, explanation, category, is_daily
)
select
  format('social-test-%s-%s', category::text, question_number),
  'quantity',
  'count',
  format('How many test units belong to %s item %s?', category, question_number),
  50,
  0,
  100,
  'linear',
  'count',
  'Social challenge fixture',
  'https://example.com/social-challenge-fixture',
  'A deterministic test question used only inside a rolled-back transaction.',
  category,
  false
from categories
cross join generate_series(1, 12) question_number;

insert into auth.users (id, email, email_confirmed_at)
values
  (:'alpha_id', 'social-alpha@example.test', now()),
  (:'bravo_id', 'social-bravo@example.test', now()),
  (:'charlie_id', 'social-charlie@example.test', now());

insert into public.profiles (id, display_name)
values
  (:'alpha_id', 'Social Alpha QA'),
  (:'bravo_id', 'Social Bravo QA'),
  (:'charlie_id', 'Social Charlie QA');

-- Legacy ten-question scores can remain in history, but five-question
-- achievement thresholds must only consider rounds with the new maximum.
insert into public.game_rounds (player_id, mode, total_score, question_count)
values
  (:'alpha_id', 'space', 9479, 10),
  (:'alpha_id', 'space', 4000, 5);

select pg_temp.assert_true(
  (select value from public.player_stats
   where player_id = :'alpha_id' and stat_key = 'best_category_score') = 4000,
  'Classic score achievements must ignore legacy ten-question totals'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);

select pg_temp.assert_raises(
  $sql$select public.send_friend_request('Social Alpha QA')$sql$,
  'you cannot add yourself'
);

select pg_temp.assert_true(
  public.search_players_exact('Social Bravo QA') ->> 'id' = :'bravo_id',
  'exact-name search must return the matching player'
);

select (public.send_friend_request('Social Bravo QA') ->> 'id')::uuid
  as friendship_id \gset

select pg_temp.assert_raises(
  $sql$select public.send_friend_request('Social Bravo QA')$sql$,
  'friend relationship already exists'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select public.respond_friend_request(:'friendship_id', true);

select pg_temp.assert_true(
  jsonb_array_length(public.get_social_dashboard() -> 'friends') = 1,
  'accepting a request must create one mutual friend'
);
select pg_temp.assert_true(
  (select earned from public.player_achievements
   where player_id = :'bravo_id' and achievement_id = 'connected'),
  'an accepted friendship must earn Connected for the signed-in player'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);

select public.create_game_challenge(:'bravo_id', 'classic', 'mixed')
  as challenge_one \gset

select set_config(
  'validation.challenge_one_deck',
  public.get_game_challenge_deck(:'challenge_one')::text,
  true
);

select pg_temp.assert_true(
  jsonb_array_length(public.get_game_challenge_deck(:'challenge_one')) = 5,
  'a Mixed Classic challenge must contain exactly five questions'
);

select pg_temp.assert_true(
  (
    select count(distinct q.category)
    from public.game_challenge_questions deck
    join public.questions q on q.id = deck.question_id
    where deck.challenge_id = :'challenge_one'
  ) = 5,
  'a Mixed Classic challenge must use five distinct subjects'
);

select pg_temp.assert_raises(
  format(
    'select public.create_game_challenge(%L::uuid, %L, %L)',
    :'bravo_id', 'classic', 'space'
  ),
  'active challenge'
);

reset role;
select pg_temp.assert_true(
  (
    select count(distinct q.category) = 5
    from public.game_challenge_questions deck
    join public.questions q on q.id = deck.question_id
    where deck.challenge_id = :'challenge_one'
  ),
  'a five-question Mixed deck must use five subjects'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select pg_temp.assert_true(
  (select count(*) from public.game_challenges
    where id = :'challenge_one') = 0
  and (select count(*) from public.game_challenge_questions
    where challenge_id = :'challenge_one') = 0,
  'the recipient must not read a draft challenge or deck through RLS'
);
select pg_temp.assert_raises(
  format('select public.get_game_challenge(%L::uuid)', :'challenge_one'),
  'challenge unavailable'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'charlie_id', true);
select pg_temp.assert_true(
  (select count(*) from public.friendships) = 0
  and (select count(*) from public.game_challenges) = 0
  and (select count(*) from public.game_challenge_questions) = 0,
  'an unrelated player must not read social rows through RLS'
);
select pg_temp.assert_raises(
  format('select public.get_game_challenge(%L::uuid)', :'challenge_one'),
  'challenge unavailable'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.submit_game_challenge(
  :'challenge_one',
  pg_temp.challenge_guesses(:'challenge_one', 'perfect')
);

select pg_temp.assert_raises(
  format(
    'select public.submit_game_challenge(%L::uuid, %L::jsonb)',
    :'challenge_one',
    pg_temp.challenge_guesses(:'challenge_one', 'perfect')::text
  ),
  'attempt already used'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);

select pg_temp.assert_true(
  public.get_game_challenge(:'challenge_one') ->> 'opponent_result' is null,
  'the recipient must not see the challenger score before finishing'
);
select pg_temp.assert_true(
  (select count(*) from public.game_challenges
    where id = :'challenge_one') = 1
  and (select count(*) from public.game_challenge_questions
    where challenge_id = :'challenge_one') = 5,
  'the intended recipient must read the activated match and deck through RLS'
);
select pg_temp.assert_true(
  public.get_game_challenge_deck(:'challenge_one') =
    current_setting('validation.challenge_one_deck')::jsonb,
  'both players must receive the identical ordered deck'
);

select public.submit_game_challenge(
  :'challenge_one',
  pg_temp.challenge_guesses(:'challenge_one', 'miss')
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);

select pg_temp.assert_true(
  (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'wins')::int = 1
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'losses')::int = 0
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'current_win_streak')::int = 1,
  'the first completed match must count as a win and a one-game streak'
);

-- A second match reverses the challenger while Alpha still wins. This checks
-- that records are player-relative rather than challenger-relative.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select public.create_game_challenge(:'alpha_id', 'classic', 'space')
  as challenge_two \gset
select pg_temp.assert_true(
  jsonb_array_length(public.get_game_challenge_deck(:'challenge_two')) = 5,
  'a subject Classic challenge must contain exactly five questions'
);
select public.submit_game_challenge(
  :'challenge_two',
  pg_temp.challenge_guesses(:'challenge_two', 'miss')
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.submit_game_challenge(
  :'challenge_two',
  pg_temp.challenge_guesses(:'challenge_two', 'perfect')
);

select pg_temp.assert_true(
  (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'wins')::int = 2
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'current_win_streak')::int = 2
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'best_win_streak')::int = 2,
  'consecutive wins must update current and best streaks'
);

-- A draw ends the current streak without erasing the best streak.
select public.create_game_challenge(:'bravo_id', 'classic', 'mixed')
  as challenge_three \gset
select public.submit_game_challenge(
  :'challenge_three',
  pg_temp.challenge_guesses(:'challenge_three', 'perfect')
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select public.submit_game_challenge(
  :'challenge_three',
  pg_temp.challenge_guesses(:'challenge_three', 'perfect')
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select pg_temp.assert_true(
  (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'played')::int = 3
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'wins')::int = 2
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'draws')::int = 1
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'current_win_streak')::int = 0
  and (public.get_friend_match_history(:'bravo_id') -> 'record' ->> 'best_win_streak')::int = 2,
  'draws must break the current streak while preserving the best streak'
);
select pg_temp.assert_true(
  jsonb_array_length(
    public.get_friend_match_history(:'bravo_id') -> 'matches'
  ) = 3,
  'head-to-head history must include each completed match'
);
select pg_temp.assert_true(
  (select value from public.player_stats
   where player_id = :'alpha_id' and stat_key = 'challenges_completed') = 3
  and (select value from public.player_stats
       where player_id = :'alpha_id' and stat_key = 'challenges_won') = 2
  and (select value from public.player_stats
       where player_id = :'alpha_id'
         and stat_key = 'best_challenge_win_streak') = 2
  and (select value from public.player_stats
       where player_id = :'alpha_id'
         and stat_key = 'max_challenges_vs_one_opponent') = 3,
  'social achievement statistics must derive wins, streaks, and rivalry depth'
);
select pg_temp.assert_true(
  (select earned from public.player_achievements
   where player_id = :'alpha_id' and achievement_id = 'challenge-accepted')
  and (select earned from public.player_achievements
       where player_id = :'alpha_id' and achievement_id = 'rivalry-begins')
  and (select earned from public.player_achievements
       where player_id = :'alpha_id' and achievement_id = 'first-victory')
  and not (select earned from public.player_achievements
           where player_id = :'alpha_id' and achievement_id = 'hot-streak'),
  'completed matches must unlock only the social milestones actually reached'
);

-- Survival uses every eligible non-Daily question in one shared order and
-- accepts only a prefix ending at the first miss.
select public.create_game_challenge(:'bravo_id', 'survival', null)
  as challenge_survival \gset
select set_config(
  'validation.survival_deck',
  public.get_game_challenge_deck(:'challenge_survival')::text,
  true
);

reset role;
select pg_temp.assert_true(
  jsonb_array_length(current_setting('validation.survival_deck')::jsonb) =
    (select count(*) from public.questions where not is_daily),
  'Survival must include every eligible non-Daily question'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.submit_game_challenge(
  :'challenge_survival',
  pg_temp.challenge_guesses(:'challenge_survival', 'miss', 1)
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select pg_temp.assert_true(
  public.get_game_challenge_deck(:'challenge_survival') =
    current_setting('validation.survival_deck')::jsonb,
  'both Survival players must receive the same order'
);
select public.submit_game_challenge(
  :'challenge_survival',
  pg_temp.challenge_guesses(:'challenge_survival', 'miss', 1)
);

-- Expiry is enforced server-side on read/play, and the expired match remains
-- visible without revealing a playable deck.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.create_game_challenge(:'bravo_id', 'classic', 'history')
  as challenge_expired \gset
select public.submit_game_challenge(
  :'challenge_expired',
  pg_temp.challenge_guesses(:'challenge_expired', 'perfect')
);

reset role;
update public.game_challenges
set activated_at = now() - interval '8 days',
    expires_at = now() - interval '1 day'
where id = :'challenge_expired';

set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select pg_temp.assert_true(
  public.get_game_challenge(:'challenge_expired') ->> 'state' = 'expired',
  'a seven-day challenge must expire before it can be played'
);
select pg_temp.assert_raises(
  format(
    'select public.get_game_challenge_deck(%L::uuid)',
    :'challenge_expired'
  ),
  'challenge unavailable'
);

-- Decline and cancel are distinct terminal states.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.create_game_challenge(:'bravo_id', 'classic', 'science')
  as challenge_declined \gset
select public.submit_game_challenge(
  :'challenge_declined',
  pg_temp.challenge_guesses(:'challenge_declined', 'perfect')
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select public.decline_game_challenge(:'challenge_declined');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.create_game_challenge(:'bravo_id', 'classic', 'animals')
  as challenge_cancelled \gset
select public.cancel_game_challenge(:'challenge_cancelled');

reset role;
select pg_temp.assert_true(
  (select state = 'declined' from public.game_challenges
    where id = :'challenge_declined'),
  'recipient decline must persist the declined state'
);
select pg_temp.assert_true(
  (select state = 'cancelled' from public.game_challenges
    where id = :'challenge_cancelled'),
  'challenger cancellation must persist the cancelled state'
);

-- Removing a friend cancels an unfinished challenge, while completed history
-- remains available to the two former participants.
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.create_game_challenge(:'bravo_id', 'classic', 'technology')
  as challenge_removed \gset
select public.remove_friend(:'bravo_id');

select pg_temp.assert_true(
  jsonb_array_length(
    public.get_friend_match_history(:'bravo_id') -> 'matches'
  ) = 4,
  'completed history must remain visible after removing a friend'
);

reset role;
select pg_temp.assert_true(
  (select state = 'cancelled' from public.game_challenges
    where id = :'challenge_removed'),
  'removing a friend must cancel an unfinished challenge'
);

-- Re-friend, then block. Blocking also removes the friendship and cancels the
-- pending/draft match, while exact search gives the generic unavailable result.
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select (public.send_friend_request('Social Bravo QA') ->> 'id')::uuid
  as friendship_two \gset

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select public.respond_friend_request(:'friendship_two', true);
select public.create_game_challenge(:'alpha_id', 'classic', 'movies')
  as challenge_blocked \gset

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'alpha_id', true);
select public.block_player(:'bravo_id');

reset role;
select pg_temp.assert_true(
  (select state = 'cancelled' from public.game_challenges
    where id = :'challenge_blocked'),
  'blocking must cancel an unfinished challenge'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.friendships
    where least(requester_id, recipient_id) = least(:'alpha_id'::uuid, :'bravo_id'::uuid)
      and greatest(requester_id, recipient_id) = greatest(:'alpha_id'::uuid, :'bravo_id'::uuid)
  ),
  'blocking must remove the friendship'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'bravo_id', true);
select pg_temp.assert_true(
  public.search_players_exact('Social Alpha QA') is null,
  'blocked players must receive a generic unavailable search result'
);

rollback;

\echo 'friends_challenges.sql: all assertions passed'
