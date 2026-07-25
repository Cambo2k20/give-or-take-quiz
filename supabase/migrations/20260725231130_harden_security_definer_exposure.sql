-- Keep privileged implementations out of the exposed public API schema.
-- Public wrappers retain the existing RPC contract while running as the caller.
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.is_email_confirmed()
  set schema private;

revoke all on function private.is_email_confirmed()
  from public, anon;
grant execute on function private.is_email_confirmed()
  to authenticated;

create function public.is_email_confirmed()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_email_confirmed();
$function$;

revoke all on function public.is_email_confirmed()
  from public, anon;
grant execute on function public.is_email_confirmed()
  to authenticated;

comment on function public.is_email_confirmed() is
  'Unprivileged API wrapper around the private email-confirmation check.';

alter function public.submit_round(public.game_mode, jsonb)
  set schema private;

revoke all on function private.submit_round(public.game_mode, jsonb)
  from public, anon;
grant execute on function private.submit_round(public.game_mode, jsonb)
  to authenticated;

create function public.submit_round(
  p_mode public.game_mode,
  p_guesses jsonb
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select private.submit_round(p_mode, p_guesses);
$function$;

revoke all on function public.submit_round(public.game_mode, jsonb)
  from public, anon;
grant execute on function public.submit_round(public.game_mode, jsonb)
  to authenticated;

comment on function public.submit_round(public.game_mode, jsonb) is
  'Unprivileged API wrapper around server-validated round submission.';

-- This function is an internal DDL event-trigger implementation. Event triggers
-- do not need client EXECUTE privileges, and it must not be exposed as an RPC.
do $block$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute
      'revoke all on function public.rls_auto_enable() '
      'from public, anon, authenticated';
  end if;
end;
$block$;
