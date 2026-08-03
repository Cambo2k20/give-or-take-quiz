-- Allow city-population questions to use urban-area definitions.

alter table public.questions
drop constraint if exists
  questions_measure_population_prompt_states_definition;

alter table public.questions
add constraint questions_measure_population_prompt_states_definition
check (
  measure <> 'population'
  or (
    subtype = 'country'
    and (
      lower(prompt) like '%country-total%'
      or lower(prompt) ~ '(^|[^a-z])census([^a-z]|$)'
    )
  )
  or (
    subtype = 'city'
    and (
      lower(prompt) like '%city proper%'
      or lower(prompt) like '%urban area%'
      or lower(prompt) like '%urban agglomeration%'
    )
  )
);