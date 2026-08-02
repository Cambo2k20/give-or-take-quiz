-- Five sourced starter questions make each incubating category testable while
-- the production client keeps both behind Coming soon. Public activation is a
-- later coordinated release after each bank reaches 20 regular questions.

alter table public.rank_titles
  drop constraint rank_titles_badge_key_format;

alter table public.rank_titles
  add constraint rank_titles_badge_key_format check (
    badge_key is null
    or badge_key ~ '^[a-z0-9]+(-[a-z0-9]+)*-(05|10|15|20|25|30)$'
  );

insert into public.rank_titles (category, rank_floor, title, badge_key) values
  ('dinosaurs', 5, 'Fossil Finder', 'dinosaurs-05'),
  ('dinosaurs', 10, 'Trackway Tracker', 'dinosaurs-10'),
  ('dinosaurs', 15, 'Bone Detective', 'dinosaurs-15'),
  ('dinosaurs', 20, 'Mesozoic Scholar', 'dinosaurs-20'),
  ('dinosaurs', 25, 'Paleo Supreme', 'dinosaurs-25'),
  ('dinosaurs', 30, 'Titan of Prehistory', 'dinosaurs-30'),
  ('games', 5, 'Rookie Gamer', 'games-05'),
  ('games', 10, 'Level Navigator', 'games-10'),
  ('games', 15, 'Achievement Hunter', 'games-15'),
  ('games', 20, 'Elite Player', 'games-20'),
  ('games', 25, 'Ranked Royalty', 'games-25'),
  ('games', 30, 'Icon of Gaming', 'games-30');

insert into public.questions (
  id, category, measure, subtype, prompt, answer, min, max, scale, unit,
  reference_year, source_title, source_url, explanation, is_daily
) values
  (
    'dinosaurs-length-tyrannosaurus-rex', 'dinosaurs', 'size', 'length',
    'Approximately how long was a typical Tyrannosaurus rex?',
    12, 4, 20, 'linear', 'metre', null,
    'Natural History Museum - Tyrannosaurus',
    'https://www.nhm.ac.uk/discover/dino-directory/tyrannosaurus.html',
    'The Natural History Museum gives a typical T. rex length of about 12 metres, although the largest known specimens approached 13 metres.',
    false
  ),
  (
    'dinosaurs-count-sophie-stegosaurus-plates', 'dinosaurs', 'quantity', 'count',
    'How many back plates are preserved on the Natural History Museum''s Sophie Stegosaurus?',
    19, 5, 40, 'linear', 'count', null,
    'Natural History Museum - World''s most complete Stegosaurus goes on show',
    'https://www.nhm.ac.uk/press-office/press-releases/world_s-most-complete-stegosaurus-goes-on-show.html',
    'Sophie preserves 19 back plates as well as four tail spikes, making the skeleton unusually complete.',
    false
  ),
  (
    'dinosaurs-count-lark-quarry-footprints', 'dinosaurs', 'quantity', 'count',
    'Roughly how many muddy dinosaur footprints are preserved at Queensland''s Lark Quarry?',
    4000, 200, 50000, 'log', 'count', null,
    'Queensland Parks - Lark Quarry Conservation Park',
    'https://parks.qld.gov.au/parks/lark-quarry/about',
    'Queensland Parks describes more than 4,000 footprints preserved in the 95-million-year-old trackways.',
    false
  ),
  (
    'dinosaurs-event-megalosaurus-named', 'dinosaurs', 'history', 'event',
    'In what year was Megalosaurus, the first dinosaur given a scientific name, named?',
    1824, 1700, 1950, 'linear', 'year', null,
    'Natural History Museum - Megalosaurus',
    'https://www.nhm.ac.uk/discover/dino-directory/megalosaurus.html',
    'Megalosaurus was named in 1824, eighteen years before the word dinosaur was coined in 1842.',
    false
  ),
  (
    'dinosaurs-duration-non-avian-extinction', 'dinosaurs', 'physics', 'duration',
    'Approximately how many years ago did the non-avian dinosaurs become extinct?',
    66000000, 1000000, 500000000, 'log', 'duration-year', null,
    'Natural History Museum - What killed the dinosaurs?',
    'https://www.nhm.ac.uk/discover/dinosaur-extinction.html',
    'The mass extinction happened about 66 million years ago. Birds survived and are the only dinosaurs still alive today.',
    false
  ),
  (
    'games-count-chessboard-squares', 'games', 'quantity', 'count',
    'How many squares are on a standard chessboard?',
    64, 16, 144, 'linear', 'count', null,
    'FIDE Handbook - Laws of Chess',
    'https://handbook.fide.com/chapter/e012023',
    'FIDE defines the chessboard as an 8 by 8 grid, giving 64 alternating light and dark squares.',
    false
  ),
  (
    'games-count-monopoly-title-deed-cards', 'games', 'quantity', 'count',
    'How many Title Deed cards come with the classic Monopoly game?',
    28, 5, 80, 'linear', 'count', null,
    'Hasbro - Monopoly Classic Game instructions',
    'https://instructions.hasbro.com/en-nz/instruction/monopoly-classic-game',
    'Hasbro lists 28 Title Deed cards in the classic set, covering streets, stations and utilities.',
    false
  ),
  (
    'games-count-uno-cards', 'games', 'quantity', 'count',
    'How many cards are in a standard modern UNO deck?',
    112, 40, 200, 'linear', 'count', null,
    'Mattel - UNO instruction sheet',
    'https://service.mattel.com/instruction_sheets/10020-SN70_G1_4XN_IS_Uno.pdf',
    'Mattel''s standard modern UNO instructions list a 112-card deck.',
    false
  ),
  (
    'games-event-dungeons-dragons-first-publication', 'games', 'history', 'event',
    'In what year was Dungeons & Dragons first published?',
    1974, 1900, 2025, 'linear', 'year', null,
    'Dungeons & Dragons - 50th anniversary',
    'https://www.dndbeyond.com/posts/1660-dungeons-dragons-turns-50-see-how-were-celebrating',
    'Dungeons & Dragons celebrated 50 years since its first publication in 2024, placing the original release in 1974.',
    false
  ),
  (
    'games-count-game-boy-hardware-sales', 'games', 'quantity', 'count',
    'According to Nintendo''s life-to-date figures, how many Game Boy systems were sold worldwide?',
    118690000, 10000000, 500000000, 'log', 'count', '2026',
    'Nintendo Investor Relations - Dedicated Video Game Sales Units',
    'https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html',
    'Nintendo reports 118.69 million worldwide hardware sales for the Game Boy family, including Game Boy Color.',
    false
  );

-- Challenge decks are created on the server. Dedicated Dinosaur and Games
-- challenges remain technically testable, but production Mixed and Survival
-- decks must continue to draw only from the eight live subjects.
create or replace function private.create_game_challenge(
  p_friend_id uuid,
  p_format public.challenge_format,
  p_classic_mode public.game_mode default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_player uuid := private.require_social_player();
  v_challenge uuid;
  v_count integer;
begin
  perform private.expire_game_challenges();

  if p_friend_id is null or p_friend_id = v_player then
    raise exception 'friend unavailable';
  end if;

  perform p.id
  from public.profiles p
  where p.id in (v_player, p_friend_id)
  order by p.id
  for update;

  if p_format = 'classic' and (
    p_classic_mode is null or p_classic_mode in ('daily', 'survival')
  ) then
    raise exception 'Classic challenges need a subject or Mixed';
  end if;

  if p_format = 'survival' and p_classic_mode is not null then
    raise exception 'Survival challenges do not take a subject';
  end if;

  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.recipient_id) = least(v_player, p_friend_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(v_player, p_friend_id)
  ) then
    raise exception 'only friends can challenge each other';
  end if;

  if exists (
    select 1 from private.player_blocks b
    where (b.blocker_id = v_player and b.blocked_id = p_friend_id)
       or (b.blocker_id = p_friend_id and b.blocked_id = v_player)
  ) then
    raise exception 'friend unavailable';
  end if;

  begin
    insert into public.game_challenges (
      challenger_id, recipient_id, format, classic_mode
    )
    values (v_player, p_friend_id, p_format, p_classic_mode)
    returning id into v_challenge;
  exception when unique_violation then
    raise exception 'you already have an active challenge with this friend';
  end;

  if p_format = 'classic' and p_classic_mode <> 'mixed' then
    insert into public.game_challenge_questions (
      challenge_id, question_id, asked_order
    )
    select
      v_challenge,
      picked.id,
      row_number() over (
        order by md5(v_challenge::text || ':order:' || picked.id)
      )::smallint
    from (
      select q.id
      from public.questions q
      where not q.is_daily
        and q.category::text = p_classic_mode::text
      order by md5(v_challenge::text || ':pick:' || q.id)
      limit 5
    ) picked;
  elsif p_format = 'classic' then
    with ranked as (
      select
        q.id,
        q.category,
        row_number() over (
          partition by q.category
          order by md5(v_challenge::text || ':category:' || q.id)
        ) as category_order
      from public.questions q
      where not q.is_daily
        and q.category::text in (
          'population', 'history', 'geography', 'science',
          'animals', 'space', 'technology', 'movies'
        )
    ), picked as (
      select id
      from ranked
      where category_order = 1
      order by md5(v_challenge::text || ':mixed:' || category::text)
      limit 5
    )
    insert into public.game_challenge_questions (
      challenge_id, question_id, asked_order
    )
    select
      v_challenge,
      picked.id,
      row_number() over (
        order by md5(v_challenge::text || ':order:' || picked.id)
      )::smallint
    from picked;
  else
    insert into public.game_challenge_questions (
      challenge_id, question_id, asked_order
    )
    select
      v_challenge,
      q.id,
      row_number() over (
        order by md5(v_challenge::text || ':survival:' || q.id)
      )::smallint
    from public.questions q
    where not q.is_daily
      and q.category::text in (
        'population', 'history', 'geography', 'science',
        'animals', 'space', 'technology', 'movies'
      );
  end if;

  select count(*) into v_count
  from public.game_challenge_questions
  where challenge_id = v_challenge;

  if (p_format = 'classic' and v_count <> 5)
     or (p_format = 'survival' and v_count < 1) then
    raise exception 'the question bank cannot build that challenge deck';
  end if;

  return v_challenge;
end;
$function$;
