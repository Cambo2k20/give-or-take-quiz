-- An anonymous sign-in carries the authenticated role too, so spell out that
-- it may not claim an identity. is_email_confirmed() already excludes them
-- (they have no confirmed address), but a security boundary should be legible
-- in the policy itself rather than hidden inside a function.
drop policy "Confirmed players may create their own profile" on profiles;
drop policy "Confirmed players may update their own profile" on profiles;

create policy "Confirmed players may create their own profile"
  on profiles for insert to authenticated
  with check (
    id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and public.is_email_confirmed()
  );

create policy "Confirmed players may update their own profile"
  on profiles for update to authenticated
  using (
    id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and public.is_email_confirmed()
  )
  with check (
    id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and public.is_email_confirmed()
  );
;
