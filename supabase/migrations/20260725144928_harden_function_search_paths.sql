-- Pin search_path so neither function can be redirected by a caller's own
-- search_path, and fully qualify everything they touch.
create or replace function slider_position(
  p_min numeric, p_max numeric, p_scale public.question_scale, p_value numeric
) returns numeric
language sql immutable
set search_path = ''
as $$
  select case
    when p_scale = 'log'
      then (ln(clamped) - ln(p_min)) / (ln(p_max) - ln(p_min))
    else (clamped - p_min) / (p_max - p_min)
  end
  from (select greatest(least(p_value, p_max), p_min) as clamped) as c;
$$;

create or replace function score_guess(p_question_id text, p_guess numeric)
returns integer
language sql stable
set search_path = ''
as $$
  select round(
    1000 * power(
      1 - abs(
        public.slider_position(q.min, q.max, q.scale, q.answer)
        - public.slider_position(q.min, q.max, q.scale, p_guess)
      ),
      2
    )
  )::integer
  from public.questions q
  where q.id = p_question_id;
$$;

-- EXECUTE is granted to PUBLIC by default, which is how anon could still reach
-- submit_round after the earlier revoke. Close it properly: only signed-in
-- players may record a round.
revoke execute on function submit_round(public.game_mode, jsonb) from public;
revoke execute on function submit_round(public.game_mode, jsonb) from anon;
grant execute on function submit_round(public.game_mode, jsonb) to authenticated;
;
