\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $function$
begin
  if p_condition is distinct from true then
    raise exception 'assertion failed: %', p_message;
  end if;
end;
$function$;

-- Four daily questions covering every case retirement has to tell apart.
insert into public.questions (
  id, measure, subtype, prompt, answer, min, max, scale, unit,
  source_title, source_url, explanation, category, is_daily
)
values
  ('retire-test-past', 'quantity', 'count',
   'How many test units did the expired daily hold?', 50, 0, 100, 'linear',
   'count', 'Retirement fixture', 'https://example.com/retirement-fixture',
   'A deterministic test question used only inside a rolled-back transaction.',
   'science', true),
  ('retire-test-today', 'quantity', 'count',
   'How many test units does the live daily hold?', 50, 0, 100, 'linear',
   'count', 'Retirement fixture', 'https://example.com/retirement-fixture',
   'A deterministic test question used only inside a rolled-back transaction.',
   'science', true),
  ('retire-test-future', 'quantity', 'count',
   'How many test units will the future daily hold?', 50, 0, 100, 'linear',
   'count', 'Retirement fixture', 'https://example.com/retirement-fixture',
   'A deterministic test question used only inside a rolled-back transaction.',
   'science', true),
  ('retire-test-reserved', 'quantity', 'count',
   'How many test units does the reserved question hold?', 50, 0, 100,
   'linear', 'count', 'Retirement fixture',
   'https://example.com/retirement-fixture',
   'A deterministic test question used only inside a rolled-back transaction.',
   'science', true);

insert into public.daily_sets (puzzle_date)
values
  (current_date - 1),
  (current_date),
  (current_date + 1);

-- `retire-test-reserved` is deliberately left unscheduled.
insert into public.daily_set_questions (puzzle_date, question_id, asked_order)
values
  (current_date - 1, 'retire-test-past', 1),
  (current_date,     'retire-test-today', 1),
  (current_date + 1, 'retire-test-future', 1);

select pg_temp.assert_true(
  private.retire_expired_daily_questions() = 1,
  'exactly one question should retire'
);

select pg_temp.assert_true(
  (select not is_daily from public.questions where id = 'retire-test-past'),
  'a daily whose date has passed must rejoin the category pool'
);

select pg_temp.assert_true(
  (select is_daily from public.questions where id = 'retire-test-today'),
  'today''s daily is still being scored and must not retire'
);

select pg_temp.assert_true(
  (select is_daily from public.questions where id = 'retire-test-future'),
  'a daily held for a future date must not surface early'
);

select pg_temp.assert_true(
  (select is_daily from public.questions where id = 'retire-test-reserved'),
  'a reserved but unscheduled question must stay out of the pool'
);

-- Running twice must not retire anything a second time.
select pg_temp.assert_true(
  private.retire_expired_daily_questions() = 0,
  'retirement must be idempotent'
);

-- A question scheduled for both a past and a future date stays reserved until
-- every one of its dates is behind us.
insert into public.daily_set_questions (puzzle_date, question_id, asked_order)
values
  (current_date - 1, 'retire-test-future', 2);

select pg_temp.assert_true(
  private.retire_expired_daily_questions() = 0,
  'a question still scheduled ahead must not retire on the strength of a past date'
);

select extensions.pass('all transaction assertions passed');
select * from extensions.finish();

rollback;

\echo 'daily_retirement.sql: all assertions passed'
