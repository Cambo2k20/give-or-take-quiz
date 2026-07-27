alter table public.rank_titles
  add column badge_key text;

with badge_ladder(category, rank_floor, title, badge_key) as (
  values
    ('population'::public.question_category, 1, 'Newcomer', null),
    ('population', 5, 'People Watcher', 'population-05'),
    ('population', 10, 'Crowd Counter', 'population-10'),
    ('population', 15, 'Census Scout', 'population-15'),
    ('population', 20, 'Demography Detective', 'population-20'),
    ('population', 25, 'Population Expert', 'population-25'),
    ('population', 30, 'Sage of the Census', 'population-30'),

    ('history', 1, 'Newcomer', null),
    ('history', 5, 'Time Tourist', 'history-05'),
    ('history', 10, 'Past Pupil', 'history-10'),
    ('history', 15, 'Chronicle Keeper', 'history-15'),
    ('history', 20, 'Era Expert', 'history-20'),
    ('history', 25, 'Timeline Sage', 'history-25'),
    ('history', 30, 'Master of Ages', 'history-30'),

    ('geography', 1, 'Newcomer', null),
    ('geography', 5, 'Globe Gazer', 'geography-05'),
    ('geography', 10, 'Terrain Tracker', 'geography-10'),
    ('geography', 15, 'Atlas Scholar', 'geography-15'),
    ('geography', 20, 'Meridian Master', 'geography-20'),
    ('geography', 25, 'Famed Pathfinder', 'geography-25'),
    ('geography', 30, 'Master of the Earth', 'geography-30'),

    ('science', 1, 'Newcomer', null),
    ('science', 5, 'Curious Mind', 'science-05'),
    ('science', 10, 'Lab Assistant', 'science-10'),
    ('science', 15, 'Theory Tester', 'science-15'),
    ('science', 20, 'Formula Finder', 'science-20'),
    ('science', 25, 'Master of Matter', 'science-25'),
    ('science', 30, 'Architect of Reality', 'science-30'),

    ('animals', 1, 'Newcomer', null),
    ('animals', 5, 'Creature Curious', 'animals-05'),
    ('animals', 10, 'Wildlife Tracker', 'animals-10'),
    ('animals', 15, 'Species Specialist', 'animals-15'),
    ('animals', 20, 'Creature Connoisseur', 'animals-20'),
    ('animals', 25, 'Beast Whisperer', 'animals-25'),
    ('animals', 30, 'Guardian of the Wild', 'animals-30'),

    ('space', 1, 'Newcomer', null),
    ('space', 5, 'Stargazer', 'space-05'),
    ('space', 10, 'Orbit Scout', 'space-10'),
    ('space', 15, 'Planet Pathfinder', 'space-15'),
    ('space', 20, 'Cosmic Navigator', 'space-20'),
    ('space', 25, 'Galactic Sage', 'space-25'),
    ('space', 30, 'Oracle of the Cosmos', 'space-30'),

    ('technology', 1, 'Newcomer', null),
    ('technology', 5, 'Tinkerer', 'technology-05'),
    ('technology', 10, 'Gadget Scout', 'technology-10'),
    ('technology', 15, 'Machine Maker', 'technology-15'),
    ('technology', 20, 'Engineering Expert', 'technology-20'),
    ('technology', 25, 'Master Inventor', 'technology-25'),
    ('technology', 30, 'Titan of Technology', 'technology-30'),

    ('movies', 1, 'Newcomer', null),
    ('movies', 5, 'Casual Viewer', 'movies-05'),
    ('movies', 10, 'Film Fan', 'movies-10'),
    ('movies', 15, 'Screen Scholar', 'movies-15'),
    ('movies', 20, 'Movie Maestro', 'movies-20'),
    ('movies', 25, 'Cinema Savant', 'movies-25'),
    ('movies', 30, 'Legend of the Silver Screen', 'movies-30')
)
update public.rank_titles as rank_title
set
  title = badge_ladder.title,
  badge_key = badge_ladder.badge_key
from badge_ladder
where rank_title.category = badge_ladder.category
  and rank_title.rank_floor = badge_ladder.rank_floor;

alter table public.rank_titles
  add constraint rank_titles_badge_key_unique unique (badge_key),
  add constraint rank_titles_badge_key_format check (
    badge_key is null
    or badge_key ~ '^(population|history|geography|science|animals|space|technology|movies)-(05|10|15|20|25|30)$'
  ),
  add constraint rank_titles_badge_key_matches_rank check (
    (rank_floor = 1 and badge_key is null)
    or (
      rank_floor in (5, 10, 15, 20, 25, 30)
      and badge_key = category::text || '-' || lpad(rank_floor::text, 2, '0')
    )
  );

comment on column public.rank_titles.badge_key is
  'Stable key for the rank medallion asset. Newcomer rows deliberately have no badge.';
