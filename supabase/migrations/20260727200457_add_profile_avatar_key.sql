alter table public.profiles
  add column avatar_key text not null default 'event-horizon',
  add constraint profiles_avatar_key_valid check (
    avatar_key = 'event-horizon'
    or avatar_key ~ '^(population|history|geography|science|animals|space|technology|movies)-(05|10|15|20|25|30)$'
  );

comment on column public.profiles.avatar_key is
  'Built-in profile avatar key. Rank badge keys use the same stable catalogue as rank_titles.';
