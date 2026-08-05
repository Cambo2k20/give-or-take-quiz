-- A QA profile is a real public identity, but its status must remain derived
-- from the private service-role allowlist. This lookup exposes one boolean for
-- one existing, viewable profile; it cannot list or mutate QA assignments.
create function public.get_public_qa_profile_status(p_player_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_viewer uuid := auth.uid();
begin
  if p_player_id is null or not exists (
    select 1 from public.profiles p where p.id = p_player_id
  ) then
    return false;
  end if;

  if v_viewer is not null and v_viewer <> p_player_id and exists (
    select 1
    from private.player_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = p_player_id)
       or (b.blocker_id = p_player_id and b.blocked_id = v_viewer)
  ) then
    return false;
  end if;

  return exists (
    select 1
    from private.qa_accounts qa
    where qa.user_id = p_player_id
  );
end;
$function$;

revoke all on function public.get_public_qa_profile_status(uuid)
  from public;
grant execute on function public.get_public_qa_profile_status(uuid)
  to anon, authenticated;

comment on function public.get_public_qa_profile_status(uuid) is
  'Returns the server-assigned QA marker for one existing, viewable public profile.';
