alter table public.questions
drop constraint if exists
  questions_measure_population_prompt_states_definition;

do $$
declare
  updated_count integer;
begin
  with prompt_updates(id, prompt) as (
    values
      ('pop-bangladesh-2026', 'What is the estimated population of Bangladesh in 2026?'),
      ('pop-canada-2026', 'What is the estimated population of Canada in 2026?'),
      ('pop-chile-2026', 'What is the estimated population of Chile in 2026?'),
      ('pop-colombia-2026', 'What is the estimated population of Colombia in 2026?'),
      ('pop-dr-congo-2026', 'What is the estimated population of DR Congo in 2026?'),
      ('pop-egypt-2026', 'What is the estimated population of Egypt in 2026?'),
      ('pop-germany-2026', 'What is the estimated population of Germany in 2026?'),
      ('pop-india-2026', 'What is the estimated population of India in 2026?'),
      ('pop-japan-2026', 'What is the estimated population of Japan in 2026?'),
      ('pop-new-zealand-2026', 'What is the estimated population of New Zealand in 2026?'),
      ('pop-pakistan-2026', 'What is the estimated population of Pakistan in 2026?'),
      ('pop-poland-2026', 'What is the estimated population of Poland in 2026?'),
      ('pop-singapore-2026', 'What is the estimated population of Singapore in 2026?'),
      ('pop-tanzania-2026', 'What is the estimated population of Tanzania in 2026?'),
      ('pop-vietnam-2026', 'What is the estimated population of Vietnam in 2026?'),
      ('population-country-bangladesh-2024', 'What was the estimated population of Bangladesh in 2024?'),
      ('population-country-brazil-2024', 'What was the estimated population of Brazil in 2024?'),
      ('population-country-china-2024', 'What was the estimated population of China in 2024?'),
      ('population-country-dr-congo-2024', 'What was the estimated population of the Democratic Republic of the Congo in 2024?'),
      ('population-country-egypt-2024', 'What was the estimated population of Egypt in 2024?'),
      ('population-country-ethiopia-2024', 'What was the estimated population of Ethiopia in 2024?'),
      ('population-country-india-2024', 'What was the estimated population of India in 2024?'),
      ('population-country-indonesia-2024', 'What was the estimated population of Indonesia in 2024?'),
      ('population-country-japan-2024', 'What was the estimated population of Japan in 2024?'),
      ('population-country-mexico-2024', 'What was the estimated population of Mexico in 2024?'),
      ('population-country-nigeria-2024', 'What was the estimated population of Nigeria in 2024?'),
      ('population-country-pakistan-2024', 'What was the estimated population of Pakistan in 2024?'),
      ('population-country-philippines-2024', 'What was the estimated population of the Philippines in 2024?'),
      ('population-country-russia-2024', 'What was the estimated population of Russia in 2024?'),
      ('population-country-united-states-2024', 'What was the estimated population of the United States in 2024?'),
      ('agg-bangkok-2025', 'How many people lived in the Bangkok urban area in 2025?'),
      ('agg-buenos-aires-2025', 'How many people lived in the Buenos Aires urban area in 2025?'),
      ('agg-cairo-2025', 'How many people lived in the Cairo urban area in 2025?'),
      ('agg-delhi-2025', 'How many people lived in the Delhi urban area in 2025?'),
      ('agg-istanbul-2025', 'How many people lived in the Istanbul urban area in 2025?'),
      ('agg-jakarta-2025', 'How many people lived in the Jakarta urban area in 2025?'),
      ('agg-karachi-2025', 'How many people lived in the Karachi urban area in 2025?'),
      ('agg-lagos-2025', 'How many people lived in the Lagos urban area in 2025?'),
      ('agg-luanda-2025', 'How many people lived in the Luanda urban area in 2025?'),
      ('agg-manila-2025', 'How many people lived in the Manila urban area in 2025?'),
      ('agg-mexico-city-2025', 'How many people lived in the Mexico City urban area in 2025?'),
      ('agg-new-york-2025', 'How many people lived in the New York urban area in 2025?'),
      ('agg-paris-2025', 'How many people lived in the Paris urban area in 2025?'),
      ('agg-sao-paulo-2025', 'How many people lived in the São Paulo urban area in 2025?'),
      ('agg-seoul-2025', 'How many people lived in the Seoul urban area in 2025?'),
      ('agg-shanghai-2025', 'How many people lived in the Shanghai urban area in 2025?'),
      ('population-city-austin-2020', 'What was Austin''s population in the 2020 U.S. Census?'),
      ('population-city-charlotte-2020', 'What was Charlotte''s population in the 2020 U.S. Census?'),
      ('population-city-chicago-2020', 'What was Chicago''s population in the 2020 U.S. Census?'),
      ('population-city-columbus-2020', 'What was Columbus, Ohio''s population in the 2020 U.S. Census?'),
      ('population-city-dallas-2020', 'What was Dallas'' population in the 2020 U.S. Census?'),
      ('population-city-fort-worth-2020', 'What was Fort Worth''s population in the 2020 U.S. Census?'),
      ('population-city-houston-2020', 'What was Houston''s population in the 2020 U.S. Census?'),
      ('population-city-jacksonville-2020', 'What was Jacksonville''s population in the 2020 U.S. Census?'),
      ('population-city-los-angeles-2020', 'What was Los Angeles'' population in the 2020 U.S. Census?'),
      ('population-city-new-york-2020', 'What was New York City''s population in the 2020 U.S. Census?'),
      ('population-city-philadelphia-2020', 'What was Philadelphia''s population in the 2020 U.S. Census?'),
      ('population-city-phoenix-2020', 'What was Phoenix''s population in the 2020 U.S. Census?'),
      ('population-city-san-antonio-2020', 'What was San Antonio''s population in the 2020 U.S. Census?'),
      ('population-city-san-diego-2020', 'What was San Diego''s population in the 2020 U.S. Census?'),
      ('population-city-san-jose-2020', 'What was San Jose''s population in the 2020 U.S. Census?')
  )
  update public.questions as questions
  set prompt = prompt_updates.prompt
  from prompt_updates
  where questions.id = prompt_updates.id;

  get diagnostics updated_count = row_count;

  if updated_count <> 61 then
    raise exception 'Expected to update 61 population prompts, updated %', updated_count;
  end if;
end
$$;

alter table public.questions
add constraint questions_measure_population_prompt_states_definition
check (
  measure <> 'population'
  or (
    subtype = 'country'
    and (
      lower(prompt) like '%population%'
      or lower(prompt) ~ '(^|[^a-z])census([^a-z]|$)'
    )
  )
  or (
    subtype = 'city'
    and (
      lower(prompt) like '%city proper%'
      or lower(prompt) like '%urban area%'
      or lower(prompt) like '%urban agglomeration%'
      or lower(coalesce(reference_year, '')) like '%city proper%'
    )
  )
);
