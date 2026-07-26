-- The daily schedule policies were created without a role list, which grants
-- them to the `public` role — every role, present and future. Every other
-- readable table here names `anon, authenticated` explicitly; match that.

drop policy daily_sets_are_public_once_published on public.daily_sets;
drop policy daily_set_questions_are_public_once_published on public.daily_set_questions;

create policy daily_sets_are_public_once_published
  on public.daily_sets for select
  to anon, authenticated
  using (puzzle_date <= current_date);

create policy daily_set_questions_are_public_once_published
  on public.daily_set_questions for select
  to anon, authenticated
  using (puzzle_date <= current_date);
