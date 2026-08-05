\set ON_ERROR_STOP on
\set ordinary_id 'a1111111-1111-4111-8111-111111111111'
\set qa_id 'b2222222-2222-4222-8222-222222222222'
\set friend_id 'c3333333-3333-4333-8333-333333333333'

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $function$
begin
  if p_condition is distinct from true then
    raise exception 'assertion failed: %', p_message;
  end if;
end;
$function$;

create function pg_temp.assert_raises(p_sql text, p_message_part text)
returns void language plpgsql security invoker set search_path = '' as $function$
declare v_message text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_message = message_text;
    if strpos(v_message, p_message_part) = 0 then
      raise exception 'expected error containing "%", got "%"', p_message_part, v_message;
    end if;
    return;
  end;
  raise exception 'expected error containing "%", but the statement succeeded', p_message_part;
end;
$function$;

insert into auth.users (id, email, email_confirmed_at)
values
  (:'ordinary_id', 'qa-capability-ordinary@example.test', now()),
  (:'qa_id', 'qa-capability-qa@example.test', now()),
  (:'friend_id', 'qa-capability-friend@example.test', now());

insert into public.profiles (id, display_name)
values
  (:'ordinary_id', 'QA Capability Ordinary'),
  (:'friend_id', 'QA Capability Friend');

-- The ordinary caller gets five valid Classic guesses from the committed bank.
select jsonb_agg(jsonb_build_object('question_id', id, 'guess', answer) order by id)
  as classic_guesses
from (
  select id, answer from public.questions
  where category = 'space' and not is_daily
  order by id limit 5
) q \gset

select pg_temp.assert_true(
  jsonb_array_length(:'classic_guesses'::jsonb) = 5,
  'the local fixture needs five regular Space questions'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'ordinary_id', true);
select pg_temp.assert_true(
  public.get_qa_account_capability() = false,
  'an ordinary authenticated account is not QA'
);
select public.submit_round('space', :'classic_guesses'::jsonb) as ordinary_round \gset
select pg_temp.assert_true(
  (:'ordinary_round'::jsonb ->> 'round_id') is not null,
  'ordinary Classic submission still works'
);
select pg_temp.assert_raises(
  $sql$insert into private.qa_accounts (user_id) values ('a1111111-1111-4111-8111-111111111111')$sql$,
  'permission denied'
);
select pg_temp.assert_raises(
  $sql$select private.is_qa_account()$sql$,
  'permission denied'
);

reset role;
insert into private.qa_accounts (user_id) values (:'qa_id');

set local role authenticated;
select set_config('request.jwt.claim.sub', :'qa_id', true);
insert into public.profiles (id, display_name)
values (:'qa_id', 'QA Capability Tester');
update public.profiles
set display_name = 'QA Identity Tester'
where id = :'qa_id';
update public.profiles
set display_name = 'QA Must Not Rename Friend'
where id = :'friend_id';
select pg_temp.assert_true(
  (select display_name = 'QA Identity Tester'
   from public.profiles where id = :'qa_id')
  and (select display_name = 'QA Capability Friend'
       from public.profiles where id = :'friend_id'),
  'QA callers can create and update only their own account identity'
);
select pg_temp.assert_true(
  public.get_public_qa_profile_status(:'qa_id') = true,
  'the QA public profile receives a server-derived QA marker'
);

reset role;

-- Seed historical rows only as the database owner. They model a QA account
-- marked after prior score data existed, which exercises leaderboard defense.
insert into public.daily_sets (puzzle_date)
values (current_date)
on conflict (puzzle_date) do nothing;
insert into public.game_rounds (player_id, mode, total_score, question_count)
values
  (:'qa_id', 'space', 5000, 5),
  (:'qa_id', 'survival', 0, 2);
insert into public.game_rounds (player_id, mode, total_score, question_count, puzzle_date, is_official)
values (:'qa_id', 'daily', 5000, 5, current_date, true);

-- Phase 2 is scoreless rather than simulated. Capture the derived state from
-- those owner-seeded historical rows so rejected browser submissions can be
-- proved not to move progression, achievements, or challenge state.
select coalesce(sum(xp), 0)::bigint as qa_xp_before
from public.player_progress where player_id = :'qa_id' \gset
select coalesce(sum(progress), 0)::bigint as qa_achievement_progress_before
from public.player_achievements where player_id = :'qa_id' \gset
select count(*)::bigint as qa_challenges_before
from public.game_challenges
where challenger_id = :'qa_id' or recipient_id = :'qa_id' \gset

set local role authenticated;
select set_config('request.jwt.claim.sub', :'ordinary_id', true);
select pg_temp.assert_true(
  public.get_qa_account_capability() = false,
  'an ordinary caller cannot discover another account capability through the self-only RPC'
);
select pg_temp.assert_true(
  public.get_public_qa_profile_status(:'qa_id') = true
  and public.get_public_qa_profile_status(gen_random_uuid()) = false,
  'the public marker identifies one known QA profile without listing the allowlist'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'qa_id', true);
select pg_temp.assert_true(
  public.get_qa_account_capability() = true,
  'the QA caller can discover only their own capability'
);
-- The RPC takes no account id, so another account cannot be inspected; a direct
-- allowlist read is also denied to the browser role.
select pg_temp.assert_true(
  pg_get_function_arguments('public.get_qa_account_capability()'::regprocedure) = '',
  'the QA capability RPC accepts no account identifier'
);
select pg_temp.assert_raises(
  $sql$select * from private.qa_accounts$sql$,
  'permission denied'
);
select pg_temp.assert_raises(
  $sql$select * from private.qa_progress_simulations$sql$,
  'permission denied'
);
select pg_temp.assert_true(
  not has_table_privilege(
    'authenticated',
    'private.qa_progress_simulations',
    'select, insert, update, delete'
  )
  and not has_table_privilege(
    'authenticated',
    'private.qa_simulation_settings',
    'select, insert, update, delete'
  )
  and has_table_privilege(
    'service_role',
    'private.qa_progress_simulations',
    'select, insert, update, delete'
  ),
  'QA simulation tables are private and service-role administrable'
);
select pg_temp.assert_true(
  pg_get_function_arguments('public.get_qa_simulation()'::regprocedure) = ''
  and pg_get_function_arguments(
    'public.get_qa_simulated_progress()'::regprocedure
  ) = ''
  and pg_get_function_arguments(
    'public.update_qa_simulation(json,boolean)'::regprocedure
  ) not like '%user%',
  'QA simulation RPCs accept no player identifier'
);
select pg_temp.assert_true(
  (select count(*) = 10 and bool_and(value::integer = 30)
   from jsonb_each_text(public.get_qa_simulation() -> 'category_ranks'))
  and (public.get_qa_simulation() ->> 'simulate_all_achievements')::boolean,
  'an unsaved QA simulation defaults every live category to rank 30 with achievements enabled'
);
select pg_temp.assert_raises(
  $sql$select public.update_qa_simulation('{"space": 5}'::json, true)$sql$,
  'exactly 10 categories'
);
select pg_temp.assert_raises(
  $sql$select public.update_qa_simulation(
    '{"population":1,"history":1,"geography":1,"science":1,"animals":1,"space":1,"space":5,"technology":1,"movies":1,"dinosaurs":1}'::json,
    true
  )$sql$,
  'duplicate categories'
);
select pg_temp.assert_raises(
  $sql$select public.update_qa_simulation(
    '{"population":1,"history":1,"geography":1,"science":1,"animals":1,"space":1,"technology":1,"movies":1,"dinosaurs":1,"unknown":1}'::json,
    true
  )$sql$,
  'unknown category'
);
select pg_temp.assert_raises(
  $sql$select public.update_qa_simulation(
    '{"population":1,"history":1,"geography":1,"science":1,"animals":1,"space":1.5,"technology":1,"movies":1,"dinosaurs":1,"games":1}'::json,
    true
  )$sql$,
  'integer from 1 to 30'
);
select pg_temp.assert_raises(
  $sql$select public.update_qa_simulation(
    '{"population":1,"history":1,"geography":1,"science":1,"animals":1,"space":31,"technology":1,"movies":1,"dinosaurs":1,"games":1}'::json,
    true
  )$sql$,
  'integer from 1 to 30'
);
select public.update_qa_simulation(
  '{"population":1,"history":5,"geography":10,"science":15,"animals":20,"space":25,"technology":30,"movies":1,"dinosaurs":5,"games":10}'::json,
  false
);
select pg_temp.assert_true(
  (public.get_qa_simulation() -> 'category_ranks' ->> 'technology')::integer = 30
  and (public.get_qa_simulation() -> 'category_ranks' ->> 'population')::integer = 1
  and not (public.get_qa_simulation() ->> 'simulate_all_achievements')::boolean
  and (select (category ->> 'xp')::integer = public.xp_for_rank(25)
       from jsonb_array_elements(
         public.get_qa_simulated_progress() -> 'categories'
       ) category
       where category ->> 'category' = 'space')
  and jsonb_array_length(
    public.get_qa_simulated_progress() -> 'achievements'
  ) > 0
  and not exists (
    select 1
    from jsonb_array_elements(
      public.get_qa_simulated_progress() -> 'achievements'
    ) achievement
    where (achievement ->> 'earned')::boolean
  ),
  'the QA caller persists exact ranks, derives XP, and can disable simulated achievements'
);
select pg_temp.assert_raises(
  $sql$update public.profiles set avatar_key = 'hermes' where id = 'b2222222-2222-4222-8222-222222222222'$sql$,
  'permission denied'
);
select public.update_profile_avatar('hermes');
select pg_temp.assert_true(
  (select avatar_key = 'hermes' from public.profiles where id = :'qa_id'),
  'a QA caller can select a built-in avatar through the owner-only RPC'
);
select pg_temp.assert_raises(
  $sql$select public.update_profile_avatar('space-30')$sql$,
  'rank badge has not been unlocked'
);
select public.update_profile_avatar('technology-30');
select pg_temp.assert_raises(
  $sql$select public.update_profile_avatar('not-a-real-avatar')$sql$,
  'known profile avatar'
);
select pg_temp.assert_true(
  (select avatar_key = 'technology-30' from public.profiles where id = :'qa_id')
  and (select avatar_key <> 'technology-30' from public.profiles where id = :'friend_id'),
  'QA badge avatar eligibility uses simulated rank and cannot update another account'
);
select pg_temp.assert_raises(
  $sql$select public.update_profile_showcase('space-30', '{}'::text[], 'deep-space')$sql$,
  'badge has not been earned'
);
select public.update_profile_showcase('technology-30', '{}'::text[], 'city-pulse');
select pg_temp.assert_true(
  (public.get_public_player_profile(:'qa_id') ->> 'is_simulated')::boolean
  and jsonb_array_length(
    public.get_public_player_profile(:'qa_id') -> 'classic_bests'
  ) = 0
  and (public.get_public_player_profile(:'qa_id') -> 'showcase' ->> 'profile_theme_id') = 'city-pulse'
  and exists (
    select 1
    from jsonb_array_elements(
      public.get_public_player_profile(:'qa_id') -> 'category_ranks'
    ) category
    where (category ->> 'simulated')::boolean
  ),
  'QA public profile cosmetics use effective ranks and mark progression as simulated'
);
select pg_temp.assert_raises(
  format('select public.submit_round(%L, %L::jsonb)', 'space', :'classic_guesses'),
  'QA accounts cannot submit competitive scores'
);
select pg_temp.assert_raises(
  $sql$select public.submit_daily_round(current_date, '[]'::jsonb)$sql$,
  'QA accounts cannot submit competitive scores'
);
select pg_temp.assert_raises(
  $sql$select public.submit_survival_run('[]'::jsonb)$sql$,
  'QA accounts cannot submit competitive scores'
);
select pg_temp.assert_raises(
  format('select public.create_game_challenge(%L::uuid, %L, %L)', :'friend_id', 'classic', 'space'),
  'QA accounts cannot submit competitive scores'
);
select pg_temp.assert_raises(
  $sql$select public.submit_game_challenge(gen_random_uuid(), '[]'::jsonb)$sql$,
  'QA accounts cannot submit competitive scores'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'ordinary_id', true);
select pg_temp.assert_raises(
  $sql$select public.get_qa_simulation()$sql$,
  'unavailable for this account'
);
select pg_temp.assert_raises(
  $sql$select public.update_profile_avatar('space-05')$sql$,
  'rank badge has not been unlocked'
);
select public.update_profile_avatar('hermes');

select pg_temp.assert_true(
  (select avatar_key = 'hermes' from public.profiles where id = :'ordinary_id'),
  'ordinary accounts retain built-in avatar selection while unearned badges are rejected'
);
select public.submit_round('space', :'classic_guesses'::jsonb);
select public.submit_round('space', :'classic_guesses'::jsonb);
select public.submit_round('space', :'classic_guesses'::jsonb);
select public.submit_round('space', :'classic_guesses'::jsonb);
select public.submit_round('space', :'classic_guesses'::jsonb);
select public.submit_round('space', :'classic_guesses'::jsonb);
select public.submit_round('space', :'classic_guesses'::jsonb);
select public.submit_round('space', :'classic_guesses'::jsonb);
select pg_temp.assert_true(
  (select rank >= 5 from public.player_progress
   where player_id = :'ordinary_id' and category = 'space'),
  'the ordinary earned-badge fixture reaches Space rank 5'
);
select public.update_profile_avatar('space-05');
select pg_temp.assert_true(
  (select avatar_key = 'space-05' from public.profiles where id = :'ordinary_id'),
  'ordinary earned badge selection continues to use real rank'
);

reset role;
select pg_temp.assert_true(
  (select count(*) from public.game_rounds where player_id = :'qa_id') = 3,
  'rejected QA submissions create no game_rounds'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.round_answers a join public.game_rounds r on r.id = a.round_id
    where r.player_id = :'qa_id'
  ),
  'rejected QA submissions create no round_answers'
);
select pg_temp.assert_true(
  (select coalesce(sum(xp), 0) from public.player_progress
   where player_id = :'qa_id') = :'qa_xp_before'::bigint
  and (select coalesce(sum(progress), 0) from public.player_achievements
       where player_id = :'qa_id') = :'qa_achievement_progress_before'::bigint,
  'rejected QA submissions create no progression or achievement progress'
);
select pg_temp.assert_true(
  (select count(*) from public.game_challenges
   where challenger_id = :'qa_id' or recipient_id = :'qa_id')
    = :'qa_challenges_before'::bigint,
  'rejected QA submissions create no challenge state'
);
select pg_temp.assert_true(
  not exists (select 1 from public.leaderboard where player_id = :'qa_id')
  and not exists (select 1 from public.daily_leaderboard where player_id = :'qa_id')
  and not exists (select 1 from public.survival_leaderboard where player_id = :'qa_id'),
  'QA accounts are absent from Classic, Daily, and Survival leaderboard views'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'private.qa_accounts', 'select, insert, update, delete')
  and has_table_privilege('service_role', 'private.qa_accounts', 'select, insert, delete'),
  'only service_role has allowlist assignment privileges'
);

select extensions.pass('qa account capability assertions passed');
select * from extensions.finish();
rollback;

\echo 'qa_accounts.sql: all assertions passed'
