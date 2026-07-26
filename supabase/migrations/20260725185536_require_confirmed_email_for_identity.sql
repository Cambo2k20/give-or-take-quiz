-- Leaderboard identity now requires a confirmed email address. Definer because
-- auth.users is not readable by the authenticated role; it returns only a
-- boolean about the caller, so it leaks nothing about anyone else.
create function public.is_email_confirmed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;

revoke execute on function public.is_email_confirmed() from public;
grant execute on function public.is_email_confirmed() to authenticated;

-- A profile is a public identity on the board, so it may only be claimed by
-- someone who has proved they own the address they signed up with.
drop policy "Players may create their own profile" on profiles;
drop policy "Players may update their own profile" on profiles;

create policy "Confirmed players may create their own profile"
  on profiles for insert to authenticated
  with check (id = (select auth.uid()) and public.is_email_confirmed());

create policy "Confirmed players may update their own profile"
  on profiles for update to authenticated
  using (id = (select auth.uid()) and public.is_email_confirmed())
  with check (id = (select auth.uid()) and public.is_email_confirmed());

-- Same gate on the write path, so an unconfirmed account cannot record a round
-- even if it somehow already had a profile row.
create or replace function submit_round(p_mode game_mode, p_guesses jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player uuid := auth.uid();
  v_round  uuid;
  v_count  integer;
  v_total  integer;
  v_known  integer;
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

  select count(*) into v_count from jsonb_array_elements(p_guesses);
  if v_count < 1 or v_count > 50 then
    raise exception 'a round must contain between 1 and 50 guesses, got %', v_count;
  end if;

  select count(*) into v_known
  from jsonb_array_elements(p_guesses) as g
  join public.questions q on q.id = g ->> 'question_id';

  if v_known <> v_count then
    raise exception 'every guess must reference a known question';
  end if;

  if p_mode <> 'mixed' and exists (
    select 1
    from jsonb_array_elements(p_guesses) as g
    join public.questions q on q.id = g ->> 'question_id'
    where q.category::text <> p_mode::text
  ) then
    raise exception 'every question in a % round must be a % question', p_mode, p_mode;
  end if;

  insert into public.game_rounds (player_id, mode, total_score, question_count)
  values (v_player, p_mode, 0, v_count)
  returning id into v_round;

  insert into public.round_answers (round_id, question_id, asked_order, guess, points)
  select
    v_round,
    parsed.question_id,
    parsed.asked_order,
    parsed.guess,
    public.score_guess(parsed.question_id, parsed.guess)
  from (
    select
      (row_number() over ())::smallint as asked_order,
      g ->> 'question_id' as question_id,
      (g ->> 'guess')::numeric as guess
    from jsonb_array_elements(p_guesses) as g
  ) as parsed;

  select coalesce(sum(points), 0) into v_total
  from public.round_answers where round_id = v_round;

  update public.game_rounds set total_score = v_total where id = v_round;

  return jsonb_build_object('round_id', v_round, 'total_score', v_total);
end;
$$;

revoke execute on function submit_round(game_mode, jsonb) from public;
revoke execute on function submit_round(game_mode, jsonb) from anon;
grant execute on function submit_round(game_mode, jsonb) to authenticated;
;
