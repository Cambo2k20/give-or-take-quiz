-- Additional Dinosaur and Games questions approved for launch prep.

insert into public.questions (
  id, category, measure, subtype, prompt, answer, min, max, scale, unit,
  reference_year, source_title, source_url, explanation, is_daily
) values
(
    'dinosaurs-speed-tyrannosaurus-top-speed', 'dinosaurs', 'physics', 'speed',
    'How fast could a Tyrannosaurus rex run, according to University of Manchester modelling?', 12.4, 2, 60, 'linear', 'kph', '2017',
    'University of Manchester Research IT — How fast can a T. rex run?',
    'https://research-it.manchester.ac.uk/news/2017/07/19/how-fast-can-a-t-rex-run/',
    'The simulations capped T. rex at 7.7 mph — about 12.4 km/h — because at a full run its own weight would have snapped its leg bones, meaning an average human could just about outpace it.',
    false
  ),
(
    'dinosaurs-duration-stegosaurus-to-tyrannosaurus-gap', 'dinosaurs', 'physics', 'duration',
    'How many years separated Stegosaurus from Tyrannosaurus rex?', 80000000, 5000000, 300000000, 'log', 'duration-year', null,
    'University of California Museum of Paleontology — The Dinosauria',
    'https://ucmp.berkeley.edu/diapsids/dinosaur.html',
    'Tyrannosaurus turned up around 80 million years after the last stegosaurs died out — a longer gap than the one between T. rex and us.',
    false
  ),
(
    'dinosaurs-length-largest-footprint', 'dinosaurs', 'size', 'length',
    'How wide is the largest dinosaur footprint ever found?', 1.5, 0.2, 4, 'linear', 'metre', null,
    'Australian Museum — Western Australian Giant Sauropod',
    'https://australian.museum/learn/australia-over-time/extinct-animals/western-australian-giant-sauropod/',
    'Sauropod prints on the Western Australian coast reach 1.5 metres across — wide enough to sit in — and are the only trace of an animal that may have topped 45 metres, since no bones have ever been found.',
    false
  ),
(
    'dinosaurs-length-chicxulub-asteroid-width', 'dinosaurs', 'size', 'length',
    'How wide was the asteroid that killed the dinosaurs?', 10, 0.5, 100, 'log', 'kilometre', null,
    'U.S. National Science Foundation — A Moment That Changed Earth',
    'https://www.nsf.gov/science-matters/moment-changed-earth',
    'Nearly 10 kilometres across, it blasted an initial cavity 100 kilometres wide and 30 kilometres deep into what is now the Yucatán.',
    false
  ),
(
    'dinosaurs-count-wall-of-bones', 'dinosaurs', 'quantity', 'count',
    'How many dinosaur bones are in the Wall of Bones at Dinosaur National Monument?', 1500, 50, 20000, 'log', 'count', null,
    'U.S. National Park Service — Quarry Exhibit Hall',
    'https://www.nps.gov/thingstodo/quarry-exhibit-hall.htm',
    'About 1,500 bones sit half-excavated in the cliff face, left deliberately in the rock so visitors can see Allosaurus, Stegosaurus and Diplodocus exactly where they were buried.',
    false
  ),
(
    'dinosaurs-count-total-tyrannosaurus-ever-lived', 'dinosaurs', 'quantity', 'count',
    'How many Tyrannosaurus rex ever lived, by Berkeley''s estimate?', 2500000000, 1000000, 100000000000, 'log', 'count', '2021',
    'Berkeley News — How many T. rexes were there? Billions.',
    'https://news.berkeley.edu/2021/04/15/how-many-t-rexes-were-there-billions/',
    'Roughly 20,000 adults at a time across 127,000 generations works out at about 2.5 billion animals — and fewer than 100 individuals have ever been dug up.',
    false
  ),
(
    'dinosaurs-mass-patagotitan-weight', 'dinosaurs', 'size', 'mass',
    'How heavy was Patagotitan, one of the biggest dinosaurs ever found?', 70, 3, 400, 'log', 'tonne', null,
    'The Field Museum — Máximo the Titanosaur',
    'https://www.fieldmuseum.org/exhibition/halls-and-galleries/maximo-titanosaur',
    'At about 70 tons it weighed as much as ten African elephants, yet it hatched from an egg small enough to hold in two hands.',
    false
  ),
(
    'dinosaurs-event-dinosauria-named', 'dinosaurs', 'history', 'event',
    'In what year was the word "dinosaur" invented?', 1842, 1700, 1950, 'linear', 'year', null,
    'University of California Museum of Paleontology — The Dinosauria',
    'https://ucmp.berkeley.edu/diapsids/dinosaur.html',
    'Richard Owen coined "Dinosauria" — fearfully great reptiles — in 1842, on the strength of just three known kinds: Megalosaurus, Iguanodon and Hylaeosaurus.',
    false
  ),
(
    'dinosaurs-percentage-extinction-species-lost', 'dinosaurs', 'quantity', 'percentage',
    'What share of Earth''s species died out alongside the dinosaurs?', 70, 0, 100, 'linear', 'percent', null,
    'U.S. National Science Foundation — A Moment That Changed Earth',
    'https://www.nsf.gov/science-matters/moment-changed-earth',
    'Around 70 percent of species vanished, and it was the climate chaos afterwards — a deep freeze followed by greenhouse warming — that did most of the killing.',
    false
  ),
(
    'dinosaurs-duration-first-dinosaurs-appeared', 'dinosaurs', 'physics', 'duration',
    'How long ago did the first dinosaurs appear?', 225000000, 50000000, 1000000000, 'log', 'duration-year', null,
    'University of California Museum of Paleontology — The Dinosauria',
    'https://ucmp.berkeley.edu/diapsids/dinosaur.html',
    'Dinosaurs show up late in the Triassic, about 225 million years ago, as small two-legged animals sharing the world with much larger reptiles.',
    false
  ),
(
    'dinosaurs-count-cleveland-lloyd-allosaurus', 'dinosaurs', 'quantity', 'count',
    'How many Allosaurus have come out of a single Utah quarry?', 46, 1, 300, 'log', 'count', null,
    'Bureau of Land Management — Jurassic National Monument',
    'https://www.blm.gov/programs/national-conservation-lands/utah/jurassic-national-monument',
    'The Cleveland-Lloyd quarry has yielded over 12,000 fossils from at least 74 animals, and more than 46 of them are Allosaurus — a pile-up of predators nobody has fully explained.',
    false
  ),
(
    'dinosaurs-duration-extinction-age', 'dinosaurs', 'physics', 'duration',
    'How long ago did the dinosaurs die out?', 66000000, 5000000, 500000000, 'log', 'duration-year', null,
    'U.S. National Park Service — Geologic Time Scale',
    'https://www.nps.gov/subjects/geology/time-scale.htm',
    'The Cretaceous ended 66 million years ago, taking every dinosaur except the birds with it.',
    false
  ),
(
    'dinosaurs-duration-sue-age-at-death', 'dinosaurs', 'physics', 'duration',
    'How old was SUE, the most complete T. rex ever found, when she died?', 28, 3, 90, 'linear', 'duration-year', null,
    'The Field Museum — SUE the T. rex',
    'https://www.fieldmuseum.org/blog/sue-t-rex',
    'SUE was about 28 — the most geriatric Tyrannosaurus yet found — reaching full size at 19 after a teenage growth spurt of up to 4.5 pounds a day.',
    false
  ),
(
    'dinosaurs-length-utahceratops-skull', 'dinosaurs', 'size', 'length',
    'How long was the skull of Utahceratops, a cousin of Triceratops?', 2.3, 0.3, 5, 'linear', 'metre', null,
    'Natural History Museum of Utah — Utahceratops gettyi',
    'https://nhmu.utah.edu/utahceratops-gettyi',
    'Its head alone ran 2.3 metres on a 6-metre body — horned dinosaurs carried the largest skulls of any land animal that has ever lived.',
    false
  ),
(
    'dinosaurs-length-baryonyx-thumb-claw', 'dinosaurs', 'size', 'length',
    'How long was the giant thumb claw of Baryonyx?', 0.3, 0.05, 1, 'linear', 'metre', null,
    'The Field Museum — Let''s Lend These Dinosaurs a Hand',
    'https://www.fieldmuseum.org/blog/lets-lend-these-dinosaurs-hand',
    'The hooked claw measures 30 centimetres — about the length of your forearm — on a fish-eating dinosaur that probably hooked prey out of rivers like a bear.',
    false
  ),
(
    'dinosaurs-count-connecticut-tracks', 'dinosaurs', 'quantity', 'count',
    'How many dinosaur footprints were uncovered at Connecticut''s Dinosaur State Park?', 2600, 100, 30000, 'log', 'count', null,
    'Connecticut State Parks — Dinosaur State Park',
    'https://ctparks.com/node/41',
    'A bulldozer operator hit the first tracks in 1966 and over 2,600 were eventually exposed; about 750 sit under the park''s dome and the rest were reburied to protect them.',
    false
  ),
(
    'dinosaurs-mass-carnegie-quarry-fossils', 'dinosaurs', 'size', 'mass',
    'How many tonnes of fossils were hauled out of the Carnegie Quarry?', 300, 5, 3000, 'log', 'tonne', null,
    'U.S. National Park Service — Historic Carnegie Quarry',
    'https://www.nps.gov/dino/learn/historyculture/carnegie_quarry.htm',
    'Earl Douglass''s crews shipped out over 300 tons between 1909 and 1922, including ten near-complete skeletons and fourteen skulls.',
    false
  ),
(
    'dinosaurs-duration-mesozoic-length', 'dinosaurs', 'physics', 'duration',
    'How long did the Age of the Dinosaurs last?', 186000000, 20000000, 800000000, 'log', 'duration-year', null,
    'U.S. National Park Service — Geologic Time Scale',
    'https://www.nps.gov/subjects/geology/time-scale.htm',
    'The Mesozoic ran from 252.2 to 66 million years ago — about 186 million years, roughly 700 times longer than our own species has existed.',
    false
  ),
(
    'dinosaurs-event-patagotitan-named', 'dinosaurs', 'history', 'event',
    'In what year was Patagotitan, one of the biggest dinosaurs ever, finally named?', 2017, 1950, 2026, 'linear', 'year', null,
    'The Field Museum — Putting the "Titan" in Titanosaur',
    'https://www.fieldmuseum.org/blog/putting-titan-titanosaur',
    'Dug out of an Argentine farm in 2010, it was not formally named until 2017 — proof that the biggest dinosaurs are very recent science.',
    false
  ),
(
    'dinosaurs-count-albertosaurus-bonebed', 'dinosaurs', 'quantity', 'count',
    'How many Albertosaurus were found buried together in one Alberta bonebed?', 12, 1, 100, 'log', 'count', null,
    'Royal Tyrrell Museum — Cretaceous Alberta',
    'https://tyrrellmuseum.com/whats_on/exhibits/cretaceous_alberta',
    'At least 12 died together at Dry Island Buffalo Jump — the strongest hint yet that big tyrannosaurs may not have hunted alone.',
    false
  ),
(
    'games-event-famicom-launch', 'games', 'history', 'event',
    'In what year did Nintendo launch the Family Computer, sold abroad as the NES?', 1983, 1965, 2000, 'linear', 'year', null,
    'Nintendo Co., Ltd. — Company History',
    'https://www.nintendo.co.jp/corporate/en/history/index.html',
    'The Famicom arrived in 1983 and rebuilt a games industry that had just collapsed in North America, reaching the West as the NES two years later.',
    false
  ),
(
    'games-event-tetris-created', 'games', 'history', 'event',
    'In what year did Alexey Pajitnov create Tetris?', 1984, 1960, 2005, 'linear', 'year', null,
    'Tetris — About Tetris',
    'https://tetris.com/about',
    'Pajitnov built it in 1984 while working at a Soviet computer centre, naming it from the Greek "tetra" and his favourite sport, tennis.',
    false
  ),
(
    'games-event-nintendo-64-launch', 'games', 'history', 'event',
    'In what year did the Nintendo 64 launch?', 1996, 1980, 2010, 'linear', 'year', null,
    'Nintendo Co., Ltd. — Company History',
    'https://www.nintendo.co.jp/corporate/en/history/index.html',
    'The N64 arrived in 1996 and put an analogue stick in players'' hands, which is why 3D games feel the way they do today.',
    false
  ),
(
    'games-event-wii-launch', 'games', 'history', 'event',
    'In what year did the Nintendo Wii launch?', 2006, 1990, 2020, 'linear', 'year', null,
    'Nintendo Co., Ltd. — Company History',
    'https://www.nintendo.co.jp/corporate/en/history/index.html',
    'The Wii landed in 2006 and sold on motion control rather than horsepower, pulling in people who had never owned a console.',
    false
  ),
(
    'games-money-activision-blizzard-acquisition', 'games', 'quantity', 'money',
    'How much did Microsoft agree to pay for Activision Blizzard in 2022?', 68700000000, 1000000000, 500000000000, 'log', 'usd', '2022',
    'Microsoft — Microsoft to acquire Activision Blizzard',
    'https://news.microsoft.com/source/2022/01/18/microsoft-to-acquire-activision-blizzard-to-bring-the-joy-and-community-of-gaming-to-everyone-across-every-device/',
    'The all-cash deal valued Activision Blizzard at $68.7 billion, or $95 a share — the biggest purchase in gaming history and enough to make Microsoft the third-largest games company by revenue.',
    false
  ),
(
    'games-money-mojang-acquisition', 'games', 'quantity', 'money',
    'How much did Microsoft pay for Mojang, the maker of Minecraft, in 2014?', 2500000000, 50000000, 100000000000, 'log', 'usd', '2014',
    'Microsoft — Minecraft to join Microsoft',
    'https://news.microsoft.com/source/2014/09/15/minecraft-to-join-microsoft/',
    'Microsoft paid $2.5 billion for a Stockholm studio of a few dozen people whose one big game has since become the best-selling of all time.',
    false
  ),
(
    'games-count-switch-hardware-sales', 'games', 'quantity', 'count',
    'How many Nintendo Switch consoles had been sold worldwide by March 2026?', 155920000, 5000000, 1000000000, 'log', 'count', '2026',
    'Nintendo Co., Ltd. — Dedicated Video Game Sales Units',
    'https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html',
    'Nintendo reported 155.92 million Switch consoles sold life-to-date, putting it comfortably past the Wii and closing on the all-time leaders.',
    false
  ),
(
    'games-count-game-boy-hardware-sales', 'games', 'quantity', 'count',
    'How many Game Boy handhelds did Nintendo sell in total?', 118690000, 2000000, 800000000, 'log', 'count', '2026',
    'Nintendo Co., Ltd. — Dedicated Video Game Sales Units',
    'https://www.nintendo.co.jp/ir/en/finance/hard_soft/index.html',
    'The original Game Boy line reached 118.69 million units on a green-grey screen with no backlight, outselling nearly every console that had colour.',
    false
  ),
(
    'games-count-mario-kart-8-deluxe-sales', 'games', 'quantity', 'count',
    'How many copies of Mario Kart 8 Deluxe had sold by March 2026?', 71080000, 1000000, 500000000, 'log', 'count', '2026',
    'Nintendo Co., Ltd. — Top Selling Title Sales Units, Nintendo Switch',
    'https://www.nintendo.co.jp/ir/en/finance/software/switch.html',
    'At 71.08 million it is the best-selling Switch game by a wide margin — roughly one copy for every two consoles Nintendo has sold.',
    false
  ),
(
    'games-count-tetris-piece-shapes', 'games', 'quantity', 'count',
    'How many different piece shapes are there in Tetris?', 7, 3, 20, 'linear', 'count', null,
    'Tetris — About Tetris',
    'https://tetris.com/about',
    'Seven Tetriminos, each built from four squares — that is every shape four connected squares can make, which is the whole game in one sentence.',
    false
  ),
(
    'games-count-chessboard-squares', 'games', 'quantity', 'count',
    'How many squares are on a chessboard?', 64, 16, 200, 'log', 'count', null,
    'FIDE Handbook — Laws of Chess',
    'https://handbook.fide.com/chapter/E012023',
    'An 8x8 grid of 64 alternating light and dark squares, a layout unchanged for roughly five centuries.',
    false
  ),
(
    'games-count-chess-fifty-move-rule', 'games', 'quantity', 'count',
    'After how many quiet moves each can a chess player claim a draw?', 50, 5, 200, 'log', 'count', null,
    'FIDE Handbook — Laws of Chess',
    'https://handbook.fide.com/chapter/E012023',
    'Fifty moves by each player with no capture and no pawn moved lets either side call the game drawn, which is what stops a hopeless endgame running forever.',
    false
  ),
(
    'games-count-scrabble-tiles', 'games', 'quantity', 'count',
    'How many letter tiles come in a standard Scrabble set?', 100, 20, 400, 'log', 'count', null,
    'Hasbro — Scrabble Board Game official instructions',
    'https://instructions.hasbro.com/en-us/instruction/scrabble-board-game',
    'One hundred wooden tiles, including two blanks, split between players seven at a time.',
    false
  ),
(
    'games-count-national-pokedex-entries', 'games', 'quantity', 'count',
    'As of 2026, how many Pokémon are listed in the National Pokédex?', 1025, 100, 3000, 'log', 'count', '2026',
    'The Pokémon Company — Pokédex',
    'https://www.pokemon.com/us/pokedex',
    'The official Pokédex now runs from 1 to 1,025, up from the 151 that started it all on the Game Boy.',
    false
  ),
(
    'games-count-largest-videogame-memorabilia-collection', 'games', 'quantity', 'count',
    'How many items are in the world''s largest videogame memorabilia collection?', 17127, 500, 100000, 'log', 'count', '2016',
    'Guinness World Records — Largest collection of videogame memorabilia',
    'https://www.guinnessworldrecords.com/world-records/largest-collection-of-videogame-memorabilia',
    'Lisa Courtney of the UK was verified with 17,127 pieces of Pokémon memorabilia, a hoard she had been building since childhood.',
    false
  ),
(
    'games-count-minecraft-pc-downloads-at-acquisition', 'games', 'quantity', 'count',
    'When Microsoft bought Mojang in 2014, how many times had Minecraft been downloaded on PC?', 100000000, 1000000, 2000000000, 'log', 'count', '2014',
    'Microsoft — Minecraft to join Microsoft',
    'https://news.microsoft.com/source/2014/09/15/minecraft-to-join-microsoft/',
    'More than 100 million PC downloads in five years, and nearly 90 percent of paying players had signed in within the past year — which is what Microsoft was really buying.',
    false
  ),
(
    'games-duration-longest-videogame-marathon', 'games', 'physics', 'duration',
    'How long is the record for the longest videogame marathon?', 144, 12, 400, 'log', 'hour', '2024',
    'Guinness World Records — Longest videogame marathon',
    'https://www.guinnessworldrecords.com/world-records/longest-video-games-marathon',
    'Szabolcs Csépe played Dance Dance Revolution for 144 hours straight — six full days, over 3,000 songs and 22,000 calories burned.',
    false
  ),
(
    'games-duration-longest-running-videogame-series', 'games', 'physics', 'duration',
    'How many years has the longest-running videogame series been going?', 51, 10, 90, 'linear', 'duration-year', '2023',
    'Guinness World Records — Longest-running videogame series',
    'https://www.guinnessworldrecords.com/world-records/longest-running-videogame-series',
    'The Oregon Trail was recognised at 51 years and 145 days, running from a 1971 text game written for a classroom to a 2023 mobile release.',
    false
  ),
(
    'games-duration-switch-battery-life', 'games', 'physics', 'duration',
    'At best, how many hours does a Nintendo Switch battery last?', 9, 2, 30, 'linear', 'hour', null,
    'Nintendo of America — Nintendo Switch technical specs',
    'https://www.nintendo.com/us/switch/tech-specs/',
    'Nintendo quotes roughly 4.5 to 9 hours, so the best case is about nine — and a demanding game will halve that.',
    false
  ),
(
    'games-mass-nintendo-switch-console', 'games', 'size', 'mass',
    'How much does a Nintendo Switch console weigh without its controllers?', 0.3, 0.05, 1.5, 'linear', 'kilogram', null,
    'Nintendo of America — Nintendo Switch technical specs',
    'https://www.nintendo.com/us/switch/tech-specs/',
    'The tablet alone is about 0.66 lbs, roughly 0.3 kilograms, rising to about 0.4 kg once the Joy-Con are clipped on.',
    false
  )
on conflict (id) do nothing;
