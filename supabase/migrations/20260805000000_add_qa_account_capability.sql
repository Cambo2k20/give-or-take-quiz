-- QA capability is deliberately separate from public profile data. Only trusted
-- server-side code with service_role database privileges may assign it.
create table private.qa_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

alter table private.qa_accounts enable row level security;

revoke all on table private.qa_accounts from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, delete on table private.qa_accounts to service_role;

create function private.is_qa_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from private.qa_accounts qa
      where qa.user_id = auth.uid()
    );
$function$;

revoke all on function private.is_qa_account() from public, anon, authenticated;

create function private.require_not_qa_account()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if private.is_qa_account() then
    raise exception 'QA accounts cannot submit competitive scores';
  end if;
end;
$function$;

revoke all on function private.require_not_qa_account()
  from public, anon, authenticated;

create function public.get_qa_account_capability()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'get_qa_account_capability requires a signed-in player';
  end if;

  return private.is_qa_account();
end;
$function$;

revoke all on function public.get_qa_account_capability() from public, anon;
grant execute on function public.get_qa_account_capability() to authenticated;

comment on table private.qa_accounts is
  'Service-role-managed allowlist for accounts that may exercise QA-only play flows.';
comment on function public.get_qa_account_capability() is
  'Returns only the signed-in caller QA capability; no account identifier is accepted.';

-- Keep this shared social entrypoint before every challenge mutation. Both
-- create_game_challenge and submit_game_challenge initialise v_player from it.
create or replace function private.require_social_player()
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

  perform private.require_not_qa_account();

  if not private.is_email_confirmed() then
    raise exception 'confirm your email address before using friends';
  end if;

  if not exists (select 1 from public.profiles where id = v_player) then
    raise exception 'pick a display name before using friends';
  end if;

  return v_player;
end;
$function$;

-- Guard the three standalone score paths immediately after authentication and
-- before they inspect inputs or mutate a round, answer, or progression state.
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
  v_expected_categories integer := cardinality(enum_range(null::public.question_category));
begin
  if v_player is null then raise exception 'submit_round requires a signed-in player'; end if;
  perform private.require_not_qa_account();
  if not public.is_email_confirmed() then raise exception 'confirm your email address before submitting a round'; end if;
  if not exists (select 1 from public.profiles where id = v_player) then raise exception 'pick a display name before submitting a round'; end if;
  if p_mode in ('daily', 'survival') then raise exception '% rounds must be submitted through their dedicated function', p_mode; end if;
  if jsonb_typeof(p_guesses) is distinct from 'array' then raise exception 'guesses must be a JSON array'; end if;
  select count(*) into v_count from jsonb_array_elements(p_guesses);
  if v_count not in (5, 10) then raise exception 'a Classic round must contain exactly 5 guesses'; end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) where jsonb_typeof(guess) is distinct from 'object' or jsonb_typeof(guess -> 'question_id') is distinct from 'string' or jsonb_typeof(guess -> 'guess') is distinct from 'number') then raise exception 'every guess must contain a question_id and numeric guess'; end if;
  select count(distinct guess ->> 'question_id') into v_distinct from jsonb_array_elements(p_guesses) as item(guess);
  if v_distinct <> v_count then raise exception 'a Classic round must contain unique questions'; end if;
  select count(*) into v_known from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id';
  if v_known <> v_count then raise exception 'every guess must reference a known question'; end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id' where q.is_daily) then raise exception 'daily questions can only be answered through the daily'; end if;
  if p_mode <> 'mixed' and exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id' where q.category::text <> p_mode::text) then raise exception 'every question in a % round must be a % question', p_mode, p_mode; end if;
  if p_mode = 'mixed' then
    select count(distinct q.category) into v_category_count from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id';
    if (v_count = 5 and v_category_count <> 5) or (v_count = 10 and v_category_count <> v_expected_categories) then raise exception 'a Mixed round must use distinct question categories'; end if;
  end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id' where (guess ->> 'guess')::numeric < q.min or (guess ->> 'guess')::numeric > q.max) then raise exception 'every guess must stay within its question bounds'; end if;
  insert into public.game_rounds (player_id, mode, total_score, question_count) values (v_player, p_mode, 0, v_count) returning id into v_round;
  insert into public.round_answers (round_id, question_id, asked_order, guess, points)
  select v_round, parsed.question_id, parsed.asked_order, parsed.guess, public.score_guess(parsed.question_id, parsed.guess)
  from (select item.ordinality::smallint as asked_order, item.guess ->> 'question_id' as question_id, (item.guess ->> 'guess')::numeric as guess from jsonb_array_elements(p_guesses) with ordinality as item(guess, ordinality)) as parsed;
  select coalesce(sum(points), 0) into v_total from public.round_answers where round_id = v_round;
  if v_total not between 0 and v_count * 1000 then raise exception 'calculated score is outside the allowed range'; end if;
  update public.game_rounds set total_score = v_total where id = v_round;
  return jsonb_build_object('round_id', v_round, 'total_score', v_total);
end;
$function$;

create or replace function private.submit_daily_round(p_date date, p_guesses jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player uuid := auth.uid(); v_round uuid; v_count integer; v_distinct integer;
  v_matched integer; v_total integer; v_official boolean; v_official_score integer;
begin
  if v_player is null then raise exception 'submit_daily_round requires a signed-in player'; end if;
  perform private.require_not_qa_account();
  if not public.is_email_confirmed() then raise exception 'confirm your email address before submitting a round'; end if;
  if not exists (select 1 from public.profiles where id = v_player) then raise exception 'pick a display name before submitting a round'; end if;
  if p_date is null or p_date > current_date + 1 then raise exception 'that daily has not been published yet'; end if;
  if not exists (select 1 from public.daily_sets where puzzle_date = p_date) then raise exception 'no daily was published for %', p_date; end if;
  if jsonb_typeof(p_guesses) is distinct from 'array' then raise exception 'guesses must be a JSON array'; end if;
  select count(*) into v_count from jsonb_array_elements(p_guesses);
  if v_count <> 5 then raise exception 'a daily must contain exactly 5 guesses, got %', v_count; end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) where jsonb_typeof(guess) is distinct from 'object' or jsonb_typeof(guess -> 'question_id') is distinct from 'string' or jsonb_typeof(guess -> 'guess') is distinct from 'number') then raise exception 'every guess must contain a question_id and numeric guess'; end if;
  select count(distinct guess ->> 'question_id') into v_distinct from jsonb_array_elements(p_guesses) as item(guess);
  if v_distinct <> 5 then raise exception 'a daily must contain 5 unique questions'; end if;
  select count(*) into v_matched from jsonb_array_elements(p_guesses) as item(guess) join public.daily_set_questions d on d.question_id = guess ->> 'question_id' and d.puzzle_date = p_date;
  if v_matched <> 5 then raise exception 'every guess must answer a question from the % daily', p_date; end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id' where (guess ->> 'guess')::numeric < q.min or (guess ->> 'guess')::numeric > q.max) then raise exception 'every guess must stay within its question bounds'; end if;
  v_official := p_date between current_date - 1 and current_date + 1 and not exists (select 1 from public.game_rounds where player_id = v_player and puzzle_date = p_date and is_official);
  begin
    insert into public.game_rounds (player_id, mode, total_score, question_count, puzzle_date, is_official) values (v_player, 'daily', 0, 5, p_date, v_official) returning id into v_round;
  exception when unique_violation then
    v_official := false;
    insert into public.game_rounds (player_id, mode, total_score, question_count, puzzle_date, is_official) values (v_player, 'daily', 0, 5, p_date, false) returning id into v_round;
  end;
  insert into public.round_answers (round_id, question_id, asked_order, guess, points)
  select v_round, parsed.question_id, parsed.asked_order, parsed.guess, public.score_guess(parsed.question_id, parsed.guess)
  from (select item.ordinality::smallint as asked_order, item.guess ->> 'question_id' as question_id, (item.guess ->> 'guess')::numeric as guess from jsonb_array_elements(p_guesses) with ordinality as item(guess, ordinality)) as parsed;
  select coalesce(sum(points), 0) into v_total from public.round_answers where round_id = v_round;
  if v_total not between 0 and 5000 then raise exception 'calculated score is outside the allowed range'; end if;
  update public.game_rounds set total_score = v_total where id = v_round;
  select total_score into v_official_score
  from public.game_rounds
  where player_id = v_player and puzzle_date = p_date and is_official;
  return jsonb_build_object('round_id', v_round, 'total_score', v_total, 'puzzle_date', p_date, 'is_official', v_official, 'official_score', v_official_score);
end;
$function$;

create or replace function private.submit_survival_run(p_guesses jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player uuid := auth.uid(); v_round uuid; v_count integer; v_distinct integer;
  v_known integer; v_bank integer; v_first_miss bigint; v_survived integer; v_total integer;
begin
  if v_player is null then raise exception 'submit_survival_run requires a signed-in player'; end if;
  perform private.require_not_qa_account();
  if not public.is_email_confirmed() then raise exception 'confirm your email address before submitting a run'; end if;
  if not exists (select 1 from public.profiles where id = v_player) then raise exception 'pick a display name before submitting a run'; end if;
  if jsonb_typeof(p_guesses) is distinct from 'array' then raise exception 'guesses must be a JSON array'; end if;
  select count(*) into v_count from jsonb_array_elements(p_guesses);
  if v_count < 1 then raise exception 'a survival run must contain at least one guess'; end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) where jsonb_typeof(guess) is distinct from 'object' or jsonb_typeof(guess -> 'question_id') is distinct from 'string' or jsonb_typeof(guess -> 'guess') is distinct from 'number') then raise exception 'every guess must contain a question_id and numeric guess'; end if;
  select count(distinct guess ->> 'question_id') into v_distinct from jsonb_array_elements(p_guesses) as item(guess);
  if v_distinct <> v_count then raise exception 'a survival run may not repeat a question'; end if;
  select count(*) into v_known from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id';
  if v_known <> v_count then raise exception 'every guess must reference a known question'; end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id' where q.is_daily) then raise exception 'daily questions can only be answered through the daily'; end if;
  if exists (select 1 from jsonb_array_elements(p_guesses) as item(guess) join public.questions q on q.id = guess ->> 'question_id' where (guess ->> 'guess')::numeric < q.min or (guess ->> 'guess')::numeric > q.max) then raise exception 'every guess must stay within its question bounds'; end if;
  with parsed as (select item.ordinality as ord, item.guess ->> 'question_id' as question_id, (item.guess ->> 'guess')::numeric as guess from jsonb_array_elements(p_guesses) with ordinality as item(guess, ordinality))
  select min(judged.ord) into v_first_miss from (select parsed.ord, abs(public.slider_position(q.min, q.max, q.scale, q.answer) - public.slider_position(q.min, q.max, q.scale, parsed.guess)) as distance, greatest(0.04, 0.12 - 0.01 * ((parsed.ord - 1) / 3)) as window from parsed join public.questions q on q.id = parsed.question_id) as judged where judged.distance > judged.window;
  select count(*) into v_bank from public.questions where not is_daily;
  if v_first_miss is null then if v_count < v_bank then raise exception 'a survival run ends at its first miss'; end if; v_survived := v_count;
  elsif v_first_miss <> v_count then raise exception 'a survival run ends at its first miss'; else v_survived := v_count - 1; end if;
  insert into public.game_rounds (player_id, mode, total_score, question_count) values (v_player, 'survival', 0, v_count) returning id into v_round;
  insert into public.round_answers (round_id, question_id, asked_order, guess, points)
  select v_round, parsed.question_id, parsed.asked_order, parsed.guess, public.score_guess(parsed.question_id, parsed.guess)
  from (select item.ordinality::smallint as asked_order, item.guess ->> 'question_id' as question_id, (item.guess ->> 'guess')::numeric as guess from jsonb_array_elements(p_guesses) with ordinality as item(guess, ordinality)) as parsed;
  select coalesce(sum(points), 0) into v_total from public.round_answers where round_id = v_round;
  if v_total not between 0 and v_count * 1000 then raise exception 'calculated score is outside the allowed range'; end if;
  update public.game_rounds set total_score = v_total where id = v_round;
  return jsonb_build_object('run_id', v_round, 'survived', v_survived, 'total_score', v_total);
end;
$function$;

-- These public, projection-only leaderboard views must evaluate the private
-- allowlist as their owner. A security-invoker view would require browser roles
-- to receive SELECT on private.qa_accounts just to execute this anti-join.
create or replace view public.leaderboard with (security_invoker = false) as
with ranked_rounds as (
  select r.*, count(*) over (partition by r.player_id, r.mode) as rounds_played,
    max(r.created_at) over (partition by r.player_id, r.mode) as last_played,
    row_number() over (partition by r.player_id, r.mode order by r.total_score desc, r.created_at asc, r.id asc) as best_order
  from public.game_rounds r
  where r.mode not in ('daily', 'survival') and r.question_count = 5
    and not exists (select 1 from private.qa_accounts qa where qa.user_id = r.player_id)
), best_rounds as (select * from ranked_rounds where best_order = 1), answer_stats as (
  select a.round_id, count(*) filter (where a.points >= 980)::integer as correct_answers from public.round_answers a group by a.round_id
)
select b.mode, p.id as player_id, p.display_name, b.total_score as best_score, b.rounds_played, b.last_played,
  rank() over (partition by b.mode order by b.total_score desc, b.created_at asc, b.id asc) as rank,
  coalesce(a.correct_answers, 0) as correct_answers,
  round(b.total_score::numeric / nullif(b.question_count * 1000, 0) * 100, 1)::double precision as accuracy, b.created_at as best_date
from best_rounds b join public.profiles p on p.id = b.player_id left join answer_stats a on a.round_id = b.id;

create or replace view public.daily_leaderboard with (security_invoker = false) as
select r.puzzle_date, p.id as player_id, p.display_name, r.total_score as best_score,
  (select count(*) from public.game_rounds a where a.player_id = r.player_id and a.puzzle_date = r.puzzle_date and a.mode = 'daily') as attempts,
  rank() over (partition by r.puzzle_date order by r.total_score desc, r.created_at asc, p.id asc) as rank,
  r.total_score as score, r.created_at as completed_at
from public.game_rounds r join public.profiles p on p.id = r.player_id
where r.mode = 'daily' and r.is_official
  and not exists (select 1 from private.qa_accounts qa where qa.user_id = r.player_id);

create or replace view public.survival_leaderboard with (security_invoker = false) as
select p.id as player_id, p.display_name, max(r.question_count - 1) as best_run, count(*) as attempts,
  rank() over (order by max(r.question_count - 1) desc) as rank
from public.game_rounds r join public.profiles p on p.id = r.player_id
where r.mode = 'survival'
  and not exists (select 1 from private.qa_accounts qa where qa.user_id = r.player_id)
group by p.id, p.display_name;

grant select on public.leaderboard, public.daily_leaderboard, public.survival_leaderboard to anon, authenticated;
