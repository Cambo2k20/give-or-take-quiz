-- Clean database replays reach the 2026 population import before the original
-- urban-area constraint migration. Install that exact rule only when the
-- import has not run yet. On an existing database where the import is already
-- present, this predecessor is deliberately a no-op.
do $function$
begin
  if not exists (
    select 1
    from public.questions
    where id = 'agg-jakarta-2025'
  ) then
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
  end if;
end;
$function$;
