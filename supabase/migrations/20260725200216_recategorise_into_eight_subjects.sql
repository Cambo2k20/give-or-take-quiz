drop view if exists question_stats;
drop view if exists leaderboard;

create type question_category_new as enum (
  'population', 'history', 'geography', 'science',
  'animals', 'space', 'technology', 'movies'
);

-- Provisional mapping; the precise reclassification follows.
alter table questions
  alter column category type question_category_new
  using (case category::text
    when 'human-world' then 'technology'
    else category::text
  end)::question_category_new;

drop type question_category;
alter type question_category_new rename to question_category;

-- Game modes follow the same subjects.
alter type game_mode rename to game_mode_old;

create type game_mode as enum (
  'population', 'history', 'geography', 'science',
  'animals', 'space', 'technology', 'movies', 'mixed'
);

alter table game_rounds
  alter column mode type game_mode
  using (case mode::text
    when 'human-world' then 'technology'
    else mode::text
  end)::game_mode;

drop function if exists submit_round(game_mode_old, jsonb);
drop type game_mode_old;

create function submit_round(p_mode game_mode, p_guesses jsonb)
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
    v_round, parsed.question_id, parsed.asked_order, parsed.guess,
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

create view leaderboard with (security_invoker = true) as
select r.mode, p.id as player_id, p.display_name,
       max(r.total_score) as best_score, count(*) as rounds_played,
       max(r.created_at) as last_played,
       rank() over (partition by r.mode order by max(r.total_score) desc) as rank
from game_rounds r join profiles p on p.id = r.player_id
group by r.mode, p.id, p.display_name;

create view question_stats with (security_invoker = true) as
select q.id, q.category, q.measure, q.prompt,
       count(a.round_id) as times_asked, round(avg(a.points)) as average_points
from questions q left join round_answers a on a.question_id = q.id
group by q.id, q.category, q.measure, q.prompt;

grant select on leaderboard to anon, authenticated;
grant select on question_stats to anon, authenticated;
;
