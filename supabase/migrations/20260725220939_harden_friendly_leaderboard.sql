alter table public.game_rounds
  drop constraint if exists game_rounds_question_count_sane;

alter table public.game_rounds
  add constraint game_rounds_question_count_exact
  check (question_count = 10);

alter table public.game_rounds
  drop constraint if exists game_rounds_total_score_in_range;

alter table public.game_rounds
  add constraint game_rounds_total_score_in_range
  check (total_score between 0 and 10000);

create or replace function public.submit_round(
  p_mode public.game_mode,
  p_guesses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_player             uuid := auth.uid();
  v_round              uuid;
  v_count              integer;
  v_distinct           integer;
  v_known              integer;
  v_total              integer;
  v_category_count     integer;
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

  if jsonb_typeof(p_guesses) is distinct from 'array' then
    raise exception 'guesses must be a JSON array';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(p_guesses);

  if v_count <> 10 then
    raise exception 'a round must contain exactly 10 guesses, got %', v_count;
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

  if v_distinct <> 10 then
    raise exception 'a round must contain 10 unique questions';
  end if;

  select count(*) into v_known
  from jsonb_array_elements(p_guesses) as item(guess)
  join public.questions q on q.id = guess ->> 'question_id';

  if v_known <> 10 then
    raise exception 'every guess must reference a known question';
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

    if v_category_count <> v_expected_categories then
      raise exception 'a mixed round must include every question category';
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
  values (v_player, p_mode, 0, 10)
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

  if v_total not between 0 and 10000 then
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

revoke all on function public.submit_round(public.game_mode, jsonb)
  from public, anon;
grant execute on function public.submit_round(public.game_mode, jsonb)
  to authenticated;

comment on function public.submit_round(public.game_mode, jsonb) is
  'Records one authenticated 10-question round, validates its composition, and recalculates every score on the server.';
