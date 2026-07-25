-- What was called "category" only ever described what is being measured, not
-- what the question is about. Rename it to measure and free the name up for a
-- real subject axis.
drop view if exists question_stats;
drop view if exists leaderboard;

alter type question_category rename to question_measure;
alter table questions rename column category to measure;
alter table question_subtype_rules rename column category to measure;
alter index questions_category_idx rename to questions_measure_idx;

-- Constraint names still say "population"; the rule is unchanged, it just
-- reads off measure now.
alter table questions
  rename constraint questions_population_needs_reference_year
  to questions_measure_population_needs_reference_year;
alter table questions
  rename constraint questions_population_prompt_states_reference_year
  to questions_measure_population_prompt_states_reference_year;
alter table questions
  rename constraint questions_population_prompt_states_definition
  to questions_measure_population_prompt_states_definition;
alter table questions
  rename constraint questions_history_is_linear_integer_years
  to questions_measure_history_is_linear_integer_years;

-- The subject a question is actually about.
create type question_category as enum (
  'geography', 'history', 'science', 'space', 'human-world'
);

alter table questions add column category question_category;
;
