-- Adds 30 sourced, non-Daily Space questions to the shared question bank.
-- These intentionally avoid answer targets already used by Daily or regular
-- questions, including the existing Sputnik 1 and Apollo 11 questions.

-- The original question bank was loaded before migrations became the complete
-- local bootstrap path. Keep the subtype reference data here so a clean replay
-- can satisfy the foreign keys used by this and every later content migration.
-- The live project already contains these rows, so the inserts are idempotent.
insert into public.question_subtype_rules (subtype, measure) values
  ('country', 'population'),
  ('city', 'population'),
  ('event', 'history'),
  ('length', 'size'),
  ('area', 'size'),
  ('mass', 'size'),
  ('count', 'quantity'),
  ('percentage', 'quantity'),
  ('money', 'quantity'),
  ('duration', 'physics'),
  ('speed', 'physics'),
  ('temperature', 'physics')
on conflict (subtype) do nothing;

insert into public.question_subtype_units (subtype, unit) values
  ('country', 'people'),
  ('city', 'people'),
  ('event', 'year'),
  ('length', 'metre'),
  ('length', 'kilometre'),
  ('area', 'square-kilometre'),
  ('mass', 'kilogram'),
  ('mass', 'tonne'),
  ('count', 'count'),
  ('percentage', 'percent'),
  ('money', 'usd'),
  ('duration', 'second'),
  ('duration', 'minute'),
  ('duration', 'hour'),
  ('duration', 'day'),
  ('duration', 'duration-year'),
  ('speed', 'kph'),
  ('temperature', 'celsius')
on conflict (subtype, unit) do nothing;

insert into public.questions (
  id, category, measure, subtype, prompt, answer, min, max, scale, unit,
  reference_year, source_title, source_url, explanation, is_daily
) values
  ('space-event-first-spacewalk', 'space', 'history', 'event', 'In what year did Alexei Leonov make the first spacewalk?', 1965, 1940, 1980, 'linear', 'year', null, 'NASA - What Is a Spacewalk?', 'https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-a-spacewalk-grades-5-8/', 'Alexei Leonov floated outside his Voskhod 2 spacecraft on 18 March 1965 for history''s first spacewalk.', false),
  ('space-event-viking-one-mars-landing', 'space', 'history', 'event', 'In what year did Viking 1 make the first fully successful landing on Mars?', 1976, 1950, 2000, 'linear', 'year', null, 'NASA Science - Viking 1', 'https://science.nasa.gov/mission/viking-1/', 'Viking 1 landed safely on 20 July 1976 and immediately returned the first clear images from the Martian surface.', false),
  ('space-event-voyager-one-launch', 'space', 'history', 'event', 'In what year was Voyager 1 launched on its journey through the outer Solar System?', 1977, 1950, 2005, 'linear', 'year', null, 'NASA Science - Voyager 1', 'https://science.nasa.gov/mission/voyager/voyager-1/', 'Voyager 1 launched in 1977, visited Jupiter and Saturn, and later became the first spacecraft to enter interstellar space.', false),
  ('space-event-hubble-launch', 'space', 'history', 'event', 'In what year was the Hubble Space Telescope launched into orbit?', 1990, 1960, 2025, 'linear', 'year', null, 'NASA - Hubble Launch Anniversary', 'https://www.nasa.gov/missions/hubble/30-years-ago-hubble-launched-to-unlock-the-secrets-of-the-universe/', 'Hubble rode to orbit aboard Space Shuttle Discovery in April 1990 and transformed astronomy from above Earth''s atmosphere.', false),
  ('space-event-iss-first-module', 'space', 'history', 'event', 'In what year was Zarya, the first module of the International Space Station, launched?', 1998, 1970, 2025, 'linear', 'year', null, 'NASA - Zarya Module', 'https://www.nasa.gov/international-space-station/zarya-module/', 'The Russian-built Zarya module launched in November 1998 and became the first piece of the International Space Station in orbit.', false),
  ('space-event-webb-launch', 'space', 'history', 'event', 'In what year was the James Webb Space Telescope launched?', 2021, 1990, 2030, 'linear', 'year', null, 'NASA Science - Webb Fact Sheet', 'https://science.nasa.gov/mission/webb/fact-sheet/', 'Webb launched on Christmas Day 2021, then travelled to its observing position about 1.5 million kilometres from Earth.', false),
  ('space-length-earth-equatorial-diameter', 'space', 'size', 'length', 'What is Earth''s diameter around the equator?', 12756, 1000, 100000, 'log', 'kilometre', null, 'NASA Science - Earth Facts', 'https://science.nasa.gov/earth/facts/', 'Earth is 12,756 kilometres wide at the equator, slightly wider than it is from pole to pole.', false),
  ('space-length-sun-diameter', 'space', 'size', 'length', 'Approximately how wide is the Sun?', 1400000, 100000, 10000000, 'log', 'kilometre', null, 'NASA Science - Sun Facts', 'https://science.nasa.gov/sun/facts/', 'The Sun is about 1.4 million kilometres across, wide enough to line up roughly 109 Earths from side to side.', false),
  ('space-length-moon-diameter', 'space', 'size', 'length', 'Approximately how wide is Earth''s Moon?', 3480, 500, 20000, 'log', 'kilometre', null, 'NASA Science - Moon Facts', 'https://science.nasa.gov/moon/facts/', 'NASA gives the Moon a radius of about 1,740 kilometres, making its diameter roughly 3,480 kilometres.', false),
  ('space-length-saturn-five-height', 'space', 'size', 'length', 'How tall was a fully assembled Saturn V Moon rocket?', 111, 20, 250, 'linear', 'metre', null, 'NASA - What Was the Saturn V?', 'https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-saturn-v-grades-5-8/', 'The Saturn V stood 111 metres tall, about the height of a 36-storey building.', false),
  ('space-length-bennu-diameter', 'space', 'size', 'length', 'Roughly how wide is the asteroid Bennu?', 500, 20, 5000, 'log', 'metre', null, 'NASA Science - Bennu Facts', 'https://science.nasa.gov/solar-system/asteroids/101955-bennu/facts/', 'Bennu is about 500 metres wide, roughly the height of a very large skyscraper turned on its side.', false),
  ('space-length-perseverance-rover', 'space', 'size', 'length', 'About how long is NASA''s Perseverance Mars rover?', 3, 0.5, 30, 'log', 'metre', null, 'NASA Science - Perseverance Rover Components', 'https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/', 'Perseverance is about three metres long, comparable to a small car, but packed with cameras, instruments and sample tubes.', false),
  ('space-length-mars-distance-from-sun', 'space', 'size', 'length', 'What is Mars'' average distance from the Sun?', 228000000, 10000000, 2000000000, 'log', 'kilometre', null, 'NASA Science - Mars Facts', 'https://science.nasa.gov/mars/facts/', 'Mars orbits at an average distance of about 228 million kilometres from the Sun, around one and a half times Earth''s distance.', false),
  ('space-length-new-horizons-pluto-journey', 'space', 'size', 'length', 'About how far did New Horizons travel from Earth to reach Pluto?', 4800000000, 100000000, 20000000000, 'log', 'kilometre', '2015', 'NASA - New Horizons Nears Pluto', 'https://www.nasa.gov/news-release/nasas-new-horizons-spacecraft-nears-historic-july-14-encounter-with-pluto/', 'New Horizons covered more than three billion miles, about 4.8 billion kilometres, before its 2015 Pluto flyby.', false),
  ('space-count-shuttle-missions', 'space', 'quantity', 'count', 'How many missions did NASA''s Space Shuttle programme fly?', 135, 10, 1000, 'log', 'count', null, 'NASA - Space Shuttle', 'https://www.nasa.gov/space-shuttle/', 'The Space Shuttle fleet flew 135 missions between Columbia''s first launch in 1981 and Atlantis'' final landing in 2011.', false),
  ('space-count-shuttle-orbiters', 'space', 'quantity', 'count', 'How many different Space Shuttle orbiters flew in space?', 5, 1, 10, 'linear', 'count', null, 'NASA - What Was the Space Shuttle?', 'https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-space-shuttle-grades-5-8/', 'Five orbiters flew in space: Columbia, Challenger, Discovery, Atlantis and Endeavour. Enterprise was used only for atmospheric tests.', false),
  ('space-count-voyager-record-languages', 'space', 'quantity', 'count', 'How many languages are represented by spoken greetings on the Voyager Golden Record?', 55, 5, 500, 'log', 'count', null, 'NASA Science - Voyager 1', 'https://science.nasa.gov/mission/voyager/voyager-1/', 'The Golden Record carries spoken greetings in 55 languages alongside music, natural sounds and images from Earth.', false),
  ('space-percentage-mars-gravity', 'space', 'quantity', 'percentage', 'Mars surface gravity is roughly what percentage of Earth''s?', 38, 0, 100, 'linear', 'percent', null, 'NASA - Interesting Fact of the Month 2023', 'https://www.nasa.gov/space-science-and-astrobiology-at-ames/interesting-fact-of-the-month-current/interesting-fact-of-the-month-2023/', 'Mars has only about 38 per cent of Earth''s surface gravity, so a person weighing 80 kilograms on Earth would feel like about 30 kilograms there.', false),
  ('space-duration-mars-year', 'space', 'physics', 'duration', 'How many Earth days does one year on Mars last?', 687, 100, 5000, 'log', 'day', null, 'NASA Science - Mars Facts', 'https://science.nasa.gov/mars/facts/', 'Mars takes 687 Earth days to complete one orbit of the Sun, so its seasons last nearly twice as long as ours.', false),
  ('space-duration-jupiter-year', 'space', 'physics', 'duration', 'About how many Earth years does Jupiter take to orbit the Sun?', 12, 1, 200, 'log', 'duration-year', null, 'NASA Science - Jupiter Facts', 'https://science.nasa.gov/jupiter/jupiter-facts/', 'Jupiter completes one trip around the Sun in just under twelve Earth years.', false),
  ('space-duration-saturn-year', 'space', 'physics', 'duration', 'About how many Earth years does Saturn take to orbit the Sun?', 29, 1, 200, 'log', 'duration-year', null, 'NASA Science - Saturn Facts', 'https://science.nasa.gov/saturn/facts/', 'A Saturn year lasts about 29.4 Earth years, meaning each Saturn season continues for more than seven Earth years.', false),
  ('space-duration-new-horizons-pluto', 'space', 'physics', 'duration', 'Roughly how many years did New Horizons take to travel from Earth to Pluto?', 9, 1, 30, 'linear', 'duration-year', '2015', 'NASA Science - New Horizons', 'https://science.nasa.gov/mission/new-horizons/', 'New Horizons launched in January 2006 and reached Pluto in July 2015 after a journey of a little over nine years.', false),
  ('space-speed-parker-solar-probe', 'space', 'physics', 'speed', 'About how fast has Parker Solar Probe travelled at its closest approach to the Sun?', 700000, 10000, 2000000, 'log', 'kph', '2024', 'NASA Science - Parker Solar Probe', 'https://science.nasa.gov/mission/parker-solar-probe/', 'Parker Solar Probe reached about 700,000 kilometres per hour in 2024, making it the fastest human-made object.', false),
  ('space-speed-apollo-ten', 'space', 'physics', 'speed', 'How fast was Apollo 10 travelling when its crew set the human speed record?', 39900, 5000, 100000, 'log', 'kph', null, 'NASA - Apollo 10 Clears the Way', 'https://www.nasa.gov/history/apollo-10-clears-the-way-for-the-first-moon-landing/', 'Apollo 10 hit 24,791 miles per hour on re-entry, about 39,900 kilometres per hour, a human speed record that still stands.', false),
  ('space-speed-voyager-one', 'space', 'physics', 'speed', 'Approximately how fast is Voyager 1 moving relative to the Sun?', 61200, 5000, 500000, 'log', 'kph', '2024', 'NASA Science - Voyager 1', 'https://science.nasa.gov/mission/voyager/voyager-1/', 'NASA lists Voyager 1''s speed at about 17 kilometres per second, equivalent to roughly 61,200 kilometres per hour.', false),
  ('space-mass-apollo-lunar-samples', 'space', 'size', 'mass', 'How many kilograms of Moon rocks and soil did the Apollo missions bring back to Earth?', 382, 10, 10000, 'log', 'kilogram', null, 'NASA Science - Apollo Samples', 'https://science.nasa.gov/science-research/planetary-science/astrobiology/nasas-apollo-samples-yield-new-information-about-the-moon/', 'Six Apollo landing crews returned a combined 382 kilograms of lunar rocks, soil and core samples for scientists to study.', false),
  ('space-mass-curiosity-rover', 'space', 'size', 'mass', 'What is the mass of NASA''s Curiosity Mars rover?', 899, 100, 10000, 'log', 'kilogram', null, 'NASA Science - Curiosity Rover', 'https://science.nasa.gov/mission/msl-curiosity/', 'Curiosity has a mass of 899 kilograms, close to the weight of a small car.', false),
  ('space-mass-voyager-one', 'space', 'size', 'mass', 'What was Voyager 1''s mass at launch?', 722, 100, 10000, 'log', 'kilogram', null, 'NASA Science - Voyager 1', 'https://science.nasa.gov/mission/voyager/voyager-1/', 'Voyager 1 had a launch mass of about 722 kilograms, including its instruments and nuclear power source.', false),
  ('space-mass-iss-spacesuit', 'space', 'size', 'mass', 'About how much does a complete ISS spacesuit weigh on Earth, including its backpack?', 145, 20, 1000, 'log', 'kilogram', null, 'NASA - Extravehicular Mobility Unit', 'https://www.nasa.gov/wp-content/uploads/2015/07/2019_07_ea_emu.pdf', 'A complete Extravehicular Mobility Unit with its life-support backpack weighs about 145 kilograms on Earth, though it feels weightless in orbit.', false),
  ('space-temperature-moon-sunlight', 'space', 'physics', 'temperature', 'How hot can the Moon''s surface become in full sunlight?', 127, -200, 300, 'linear', 'celsius', null, 'NASA Science - Moon Facts', 'https://science.nasa.gov/moon/facts/', 'In full sunlight the lunar surface can reach about 127 degrees Celsius, then plunge far below freezing at night.', false);
