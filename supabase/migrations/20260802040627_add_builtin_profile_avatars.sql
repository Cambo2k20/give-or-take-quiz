set local lock_timeout = '5s';

alter table public.profiles
  drop constraint if exists profiles_avatar_key_valid;

alter table public.profiles
  add constraint profiles_avatar_key_valid check (
    avatar_key in (
      'event-horizon',
      'volcano',
      'hermes',
      'aphrodite',
      'storm-rocket',
      'aurora-longship',
      'mayan-temple',
      'valkyrie-helm',
      'mjolnir'
    )
    or avatar_key ~ '^(population|history|geography|science|animals|space|technology|movies)-(05|10|15|20|25|30)$'
  ) not valid;

alter table public.profiles
  validate constraint profiles_avatar_key_valid;

comment on column public.profiles.avatar_key is
  'Built-in profile avatar key. Rank badge keys use the same stable catalogue as rank_titles.';
