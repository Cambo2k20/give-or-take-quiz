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
  (:'qa_id', 'QA Capability Tester'),
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

-- Seed historical rows only as the database owner. They model a QA account
-- marked after prior score data existed, which exercises leaderboard defense.
insert into public.game_rounds (player_id, mode, total_score, question_count)
values
  (:'qa_id', 'space', 5000, 5),
  (:'qa_id', 'survival', 0, 2);
insert into public.game_rounds (player_id, mode, total_score, question_count, puzzle_date, is_official)
values (:'qa_id', 'daily', 5000, 5, current_date, true);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'ordinary_id', true);
select pg_temp.assert_true(
  public.get_qa_account_capability() = false,
  'an ordinary caller cannot discover another account capability through the self-only RPC'
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
