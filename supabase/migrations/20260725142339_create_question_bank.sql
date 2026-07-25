-- Enum domains mirror lib/types.ts exactly.
create type question_category as enum (
  'population', 'history', 'size', 'quantity', 'physics'
);

create type question_subtype as enum (
  'country', 'city', 'event', 'length', 'area', 'mass',
  'count', 'percentage', 'money', 'duration', 'speed', 'temperature'
);

create type question_scale as enum ('linear', 'log');

create type question_unit as enum (
  'people', 'year', 'percent', 'metre', 'kilometre', 'square-kilometre',
  'kilogram', 'tonne', 'second', 'minute', 'hour', 'day',
  'duration-year', 'kph', 'celsius', 'usd', 'count'
);

-- SUBTYPE_RULES from scripts/validate-data.ts, as data rather than code:
-- every subtype belongs to exactly one category and one set of units.
create table question_subtype_rules (
  subtype  question_subtype primary key,
  category question_category not null,
  unique (subtype, category)
);

create table question_subtype_units (
  subtype question_subtype not null references question_subtype_rules (subtype),
  unit    question_unit not null,
  primary key (subtype, unit)
);

create table questions (
  id             text primary key,
  category       question_category not null,
  subtype        question_subtype not null,
  prompt         text not null,
  -- numeric, not float: answers span 2.5 to 1_600_000_000 and must round-trip.
  answer         numeric not null,
  min            numeric not null,
  max            numeric not null,
  scale          question_scale not null,
  unit           question_unit not null,
  reference_year text,
  source_title   text not null,
  source_url     text not null,
  explanation    text not null,

  -- A subtype may only pair with its own category and one of its own units.
  foreign key (subtype, category) references question_subtype_rules (subtype, category),
  foreign key (subtype, unit) references question_subtype_units (subtype, unit),

  constraint questions_id_is_kebab_case
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint questions_bounds_ordered
    check (min < max),
  constraint questions_answer_within_bounds
    check (answer >= min and answer <= max),
  -- A logarithmic slider cannot start at or below zero.
  constraint questions_log_scale_needs_positive_min
    check (scale <> 'log' or min > 0),
  constraint questions_prompt_long_enough
    check (length(btrim(prompt)) >= 15),
  constraint questions_explanation_long_enough
    check (length(btrim(explanation)) >= 20),
  constraint questions_source_title_long_enough
    check (length(btrim(source_title)) >= 5),
  constraint questions_source_url_is_http
    check (source_url ~ '^https?://[^/]+\.[^/]'),
  -- Population figures are snapshots, so the prompt must name its year.
  constraint questions_population_needs_reference_year
    check (category <> 'population' or reference_year is not null),
  constraint questions_population_prompt_states_reference_year
    check (
      category <> 'population'
      or strpos(prompt, substring(reference_year from '\d{4}')) > 0
    ),
  constraint questions_population_prompt_states_definition
    check (
      category <> 'population'
      or (subtype = 'country' and lower(prompt) like '%country-total%')
      or (subtype = 'city' and lower(prompt) like '%city proper%')
    ),
  -- Every money question is a historical figure, so it must say which year.
  constraint questions_money_needs_reference_year
    check (subtype <> 'money' or reference_year is not null),
  -- A percentage slider that does not span 0-100 misrepresents the quantity.
  constraint questions_percentage_spans_full_range
    check (subtype <> 'percentage' or (min = 0 and max = 100)),
  -- History answers are integer years on a linear timeline.
  constraint questions_history_is_linear_integer_years
    check (
      category <> 'history'
      or (scale = 'linear' and answer = round(answer))
    )
);

create index questions_category_idx on questions (category);
create index questions_subtype_idx on questions (subtype);

-- The bank is public reference data: readable by anyone, writable only by
-- the service role (which bypasses RLS). No write policies exist by design.
alter table question_subtype_rules enable row level security;
alter table question_subtype_units enable row level security;
alter table questions enable row level security;

create policy "Question subtype rules are publicly readable"
  on question_subtype_rules for select to anon, authenticated using (true);

create policy "Question subtype units are publicly readable"
  on question_subtype_units for select to anon, authenticated using (true);

create policy "Questions are publicly readable"
  on questions for select to anon, authenticated using (true);
;
