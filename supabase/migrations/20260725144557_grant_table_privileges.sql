-- RLS decides which rows are visible, but the role still needs the privilege
-- to look at the table at all.
grant usage on schema public to anon, authenticated;

grant select on questions to anon, authenticated;
grant select on question_subtype_rules to anon, authenticated;
grant select on question_subtype_units to anon, authenticated;
grant select on game_rounds to anon, authenticated;
grant select on round_answers to anon, authenticated;
grant select on leaderboard to anon, authenticated;
grant select on question_stats to anon, authenticated;

grant select on profiles to anon, authenticated;
grant insert, update on profiles to authenticated;

grant execute on function score_guess(text, numeric) to anon, authenticated;
grant execute on function slider_position(numeric, numeric, question_scale, numeric) to anon, authenticated;
;
