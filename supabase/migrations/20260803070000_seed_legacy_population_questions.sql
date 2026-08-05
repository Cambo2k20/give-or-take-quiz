-- These 30 rows existed in the linked Postgres source of truth before the
-- migration chain was committed. Their complete values were verified field by
-- field against the linked public.questions rows before this predecessor was
-- authored. The temporary canonical set makes clean replay deterministic and
-- makes late, out-of-order execution a validated no-op on an existing database.
create temporary table canonical_legacy_population_questions (
  id text primary key,
  category public.question_category not null,
  measure public.question_measure not null,
  subtype public.question_subtype not null,
  prompt text not null,
  answer numeric not null,
  min numeric not null,
  max numeric not null,
  scale public.question_scale not null,
  unit public.question_unit not null,
  reference_year text,
  source_title text not null,
  source_url text not null,
  explanation text not null,
  is_daily boolean not null
) on commit drop;

insert into canonical_legacy_population_questions (
  id, category, measure, subtype, prompt, answer, min, max, scale, unit,
  reference_year, source_title, source_url, explanation, is_daily
)
values
  (
    'population-country-bangladesh-2024', 'population',
    'population', 'country',
    'What was the estimated population of Bangladesh in 2024?', 173562364, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 173.6 million people across Bangladesh as a whole.', false
  ),
  (
    'population-country-brazil-2024', 'population',
    'population', 'country',
    'What was the estimated population of Brazil in 2024?', 211998573, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 212.0 million people across Brazil as a whole.', false
  ),
  (
    'population-country-china-2024', 'population',
    'population', 'country',
    'What was the estimated population of China in 2024?', 1419321278, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 1.419 billion people in China''s national population series.', false
  ),
  (
    'population-country-dr-congo-2024', 'population',
    'population', 'country',
    'What was the estimated population of the Democratic Republic of the Congo in 2024?', 109276265, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 109.3 million people across the DRC as a whole.', false
  ),
  (
    'population-country-egypt-2024', 'population',
    'population', 'country',
    'What was the estimated population of Egypt in 2024?', 116538258, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 116.5 million people across Egypt as a whole.', false
  ),
  (
    'population-country-ethiopia-2024', 'population',
    'population', 'country',
    'What was the estimated population of Ethiopia in 2024?', 132059768, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 132.1 million people across Ethiopia as a whole.', false
  ),
  (
    'population-country-india-2024', 'population',
    'population', 'country',
    'What was the estimated population of India in 2024?', 1450935791, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 1.451 billion people across India as a whole.', false
  ),
  (
    'population-country-indonesia-2024', 'population',
    'population', 'country',
    'What was the estimated population of Indonesia in 2024?', 283487931, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 283.5 million people across the Indonesian archipelago.', false
  ),
  (
    'population-country-japan-2024', 'population',
    'population', 'country',
    'What was the estimated population of Japan in 2024?', 123753041, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 123.8 million people across Japan as a whole.', false
  ),
  (
    'population-country-mexico-2024', 'population',
    'population', 'country',
    'What was the estimated population of Mexico in 2024?', 130861007, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 130.9 million people across Mexico as a whole.', false
  ),
  (
    'population-country-nigeria-2024', 'population',
    'population', 'country',
    'What was the estimated population of Nigeria in 2024?', 232679478, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 232.7 million people across Nigeria as a whole.', false
  ),
  (
    'population-country-pakistan-2024', 'population',
    'population', 'country',
    'What was the estimated population of Pakistan in 2024?', 251269164, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 251.3 million people across Pakistan as a whole.', false
  ),
  (
    'population-country-philippines-2024', 'population',
    'population', 'country',
    'What was the estimated population of the Philippines in 2024?', 115843670, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 115.8 million people across the Philippines as a whole.', false
  ),
  (
    'population-country-russia-2024', 'population',
    'population', 'country',
    'What was the estimated population of Russia in 2024?', 144820423, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 144.8 million people across the Russian Federation.', false
  ),
  (
    'population-country-united-states-2024', 'population',
    'population', 'country',
    'What was the estimated population of the United States in 2024?', 345426571, 1000000, 1600000000,
    'log', 'people',
    '2024 midyear estimate', 'UN DESA — World Population Prospects 2024',
    'https://population.un.org/wpp/', 'The 2024 midyear estimate was about 345.4 million people for the United States as a whole.', false
  ),
  (
    'population-city-austin-2020', 'population',
    'population', 'city',
    'What was Austin''s population in the 2020 U.S. Census?', 961855, 300000, 8000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Austin city, Texas',
    'https://www.census.gov/quickfacts/fact/table/austincitytexas/PST045225', 'The 2020 decennial census counted 961,855 residents inside Austin''s legal city limits.', false
  ),
  (
    'population-city-charlotte-2020', 'population',
    'population', 'city',
    'What was Charlotte''s population in the 2020 U.S. Census?', 874579, 300000, 8000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Charlotte city, North Carolina',
    'https://www.census.gov/quickfacts/fact/table/charlottecitynorthcarolina/PST045225', 'The 2020 decennial census counted 874,579 residents inside Charlotte''s legal city limits.', false
  ),
  (
    'population-city-chicago-2020', 'population',
    'population', 'city',
    'What was Chicago''s population in the 2020 U.S. Census?', 2746388, 100000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Chicago city, Illinois',
    'https://www.census.gov/quickfacts/fact/table/chicagocityillinois/PST045225', 'The 2020 decennial census counted 2,746,388 residents inside Chicago''s legal city limits.', false
  ),
  (
    'population-city-columbus-2020', 'population',
    'population', 'city',
    'What was Columbus, Ohio''s population in the 2020 U.S. Census?', 905748, 300000, 8000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Columbus city, Ohio',
    'https://www.census.gov/quickfacts/fact/table/columbuscityohio/PST045225', 'The 2020 decennial census counted 905,748 residents inside Columbus'' legal city limits.', false
  ),
  (
    'population-city-dallas-2020', 'population',
    'population', 'city',
    'What was Dallas'' population in the 2020 U.S. Census?', 1304379, 700000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Dallas city, Texas',
    'https://www.census.gov/quickfacts/fact/table/dallascitytexas/PST045225', 'The 2020 decennial census counted 1,304,379 residents inside Dallas'' legal city limits.', false
  ),
  (
    'population-city-fort-worth-2020', 'population',
    'population', 'city',
    'What was Fort Worth''s population in the 2020 U.S. Census?', 918915, 300000, 8000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Fort Worth city, Texas',
    'https://www.census.gov/quickfacts/fact/table/fortworthcitytexas/PST045225', 'The 2020 decennial census counted 918,915 residents inside Fort Worth''s legal city limits.', false
  ),
  (
    'population-city-houston-2020', 'population',
    'population', 'city',
    'What was Houston''s population in the 2020 U.S. Census?', 2304580, 100000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Houston city, Texas',
    'https://www.census.gov/quickfacts/fact/table/houstoncitytexas/PST045225', 'The 2020 decennial census counted 2,304,580 residents inside Houston''s legal city limits.', false
  ),
  (
    'population-city-jacksonville-2020', 'population',
    'population', 'city',
    'What was Jacksonville''s population in the 2020 U.S. Census?', 949611, 300000, 8000000,
    'log', 'people',
    '2020 decennial census (consolidated city proper)', 'U.S. Census Bureau QuickFacts — Jacksonville city, Florida',
    'https://www.census.gov/quickfacts/fact/table/jacksonvillecityflorida/PST045225', 'The 2020 decennial census counted 949,611 residents inside Jacksonville''s consolidated city boundaries.', false
  ),
  (
    'population-city-los-angeles-2020', 'population',
    'population', 'city',
    'What was Los Angeles'' population in the 2020 U.S. Census?', 3898747, 100000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Los Angeles city, California',
    'https://www.census.gov/quickfacts/fact/table/losangelescitycalifornia/PST045225', 'The 2020 decennial census counted 3,898,747 residents inside Los Angeles'' legal city limits.', false
  ),
  (
    'population-city-new-york-2020', 'population',
    'population', 'city',
    'What was New York City''s population in the 2020 U.S. Census?', 8804190, 100000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — New York city, New York',
    'https://www.census.gov/quickfacts/fact/table/newyorkcitynewyork/PST045225', 'The 2020 decennial census counted 8,804,190 residents inside New York City''s legal city limits.', false
  ),
  (
    'population-city-philadelphia-2020', 'population',
    'population', 'city',
    'What was Philadelphia''s population in the 2020 U.S. Census?', 1603797, 700000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Philadelphia city, Pennsylvania',
    'https://www.census.gov/quickfacts/fact/table/philadelphiacitypennsylvania/PST045225', 'The 2020 decennial census counted 1,603,797 residents inside Philadelphia''s legal city limits.', false
  ),
  (
    'population-city-phoenix-2020', 'population',
    'population', 'city',
    'What was Phoenix''s population in the 2020 U.S. Census?', 1608139, 700000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — Phoenix city, Arizona',
    'https://www.census.gov/quickfacts/fact/table/phoenixcityarizona/PST045225', 'The 2020 decennial census counted 1,608,139 residents inside Phoenix''s legal city limits.', false
  ),
  (
    'population-city-san-antonio-2020', 'population',
    'population', 'city',
    'What was San Antonio''s population in the 2020 U.S. Census?', 1434625, 700000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — San Antonio city, Texas',
    'https://www.census.gov/quickfacts/fact/table/sanantoniocitytexas/PST045225', 'The 2020 decennial census counted 1,434,625 residents inside San Antonio''s legal city limits.', false
  ),
  (
    'population-city-san-diego-2020', 'population',
    'population', 'city',
    'What was San Diego''s population in the 2020 U.S. Census?', 1386932, 700000, 10000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — San Diego city, California',
    'https://www.census.gov/quickfacts/fact/table/sandiegocitycalifornia/PST045225', 'The 2020 decennial census counted 1,386,932 residents inside San Diego''s legal city limits.', false
  ),
  (
    'population-city-san-jose-2020', 'population',
    'population', 'city',
    'What was San Jose''s population in the 2020 U.S. Census?', 1013240, 300000, 8000000,
    'log', 'people',
    '2020 decennial census (city proper)', 'U.S. Census Bureau QuickFacts — San Jose city, California',
    'https://www.census.gov/quickfacts/fact/table/sanjosecitycalifornia/PST045225', 'The 2020 decennial census counted 1,013,240 residents inside San Jose''s legal city limits.', false
  );

do $function$
declare
  v_mismatch text;
  v_existing integer;
begin
  select canonical.id into v_mismatch
  from canonical_legacy_population_questions canonical
  join public.questions existing using (id)
  where row(
    existing.category::text, existing.measure::text, existing.subtype::text,
    existing.prompt, existing.answer, existing.min, existing.max,
    existing.scale::text, existing.unit::text, existing.reference_year,
    existing.source_title, existing.source_url, existing.explanation,
    existing.is_daily
  ) is distinct from row(
    canonical.category::text, canonical.measure::text, canonical.subtype::text,
    canonical.prompt, canonical.answer, canonical.min, canonical.max,
    canonical.scale::text, canonical.unit::text, canonical.reference_year,
    canonical.source_title, canonical.source_url, canonical.explanation,
    canonical.is_daily
  )
  order by canonical.id
  limit 1;

  if v_mismatch is not null then
    raise exception 'Existing legacy population question % differs from the canonical row',
      v_mismatch;
  end if;

  select count(*) into v_existing
  from public.questions existing
  join canonical_legacy_population_questions canonical using (id);

  if v_existing < 30 then
    -- The constraint installed by 20260803062500 is intentionally strict for
    -- the new import. These verified legacy country prompts use the later,
    -- compatible population wording. Install the final rule from
    -- 20260804014500 as NOT VALID so it governs the inserted rows without
    -- rejecting the 31 long prompts that the later migration shortens.
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
      ) not valid;

    insert into public.questions (
      id, category, measure, subtype, prompt, answer, min, max, scale, unit,
      reference_year, source_title, source_url, explanation, is_daily
    )
    select
      id, category, measure, subtype, prompt, answer, min, max, scale, unit,
      reference_year, source_title, source_url, explanation, is_daily
    from canonical_legacy_population_questions
    on conflict (id) do nothing;
  end if;
end;
$function$;

do $function$
declare
  v_problem text;
begin
  if (select count(*) from canonical_legacy_population_questions) <> 30 then
    raise exception 'Expected 30 canonical legacy population questions';
  end if;

  select canonical.id into v_problem
  from canonical_legacy_population_questions canonical
  left join public.questions existing using (id)
  where existing.id is null
     or row(
       existing.category::text, existing.measure::text, existing.subtype::text,
       existing.prompt, existing.answer, existing.min, existing.max,
       existing.scale::text, existing.unit::text, existing.reference_year,
       existing.source_title, existing.source_url, existing.explanation,
       existing.is_daily
     ) is distinct from row(
       canonical.category::text, canonical.measure::text, canonical.subtype::text,
       canonical.prompt, canonical.answer, canonical.min, canonical.max,
       canonical.scale::text, canonical.unit::text, canonical.reference_year,
       canonical.source_title, canonical.source_url, canonical.explanation,
       canonical.is_daily
     )
  order by canonical.id
  limit 1;

  if v_problem is not null then
    raise exception 'Legacy population reconciliation failed for %', v_problem;
  end if;
end;
$function$;
