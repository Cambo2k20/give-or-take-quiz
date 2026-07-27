alter table public.profiles
  drop constraint profiles_avatar_key_valid,
  add constraint profiles_avatar_key_valid check (
    avatar_key in ('event-horizon', 'volcano')
    or avatar_key ~ '^(population|history|geography|science|animals|space|technology|movies)-(05|10|15|20|25|30)$'
  );
