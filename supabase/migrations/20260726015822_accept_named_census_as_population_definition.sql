-- A population prompt has to pin down what is being counted. The UN midyear
-- series needs the "country-total" wording to rule out a city or metro reading,
-- but a named census already carries its own scope and its own published
-- figure, and reads far better for a national statistics office release.
--
-- scripts/validate-data.ts already accepts either; this brings the database
-- rule back in line with it.

alter table public.questions
  drop constraint questions_measure_population_prompt_states_definition;

alter table public.questions
  add constraint questions_measure_population_prompt_states_definition
  check (
    measure <> 'population'
    or (
      subtype = 'country'
      and (lower(prompt) like '%country-total%' or lower(prompt) ~ '\ycensus\y')
    )
    or (subtype = 'city' and lower(prompt) like '%city proper%')
  );
