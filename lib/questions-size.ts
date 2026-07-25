import type { Question } from "./types";

/**
 * Size questions: how long, how wide, how heavy.
 *
 * Every figure is a fixed, published value rather than a live measurement.
 * Where a quantity is genuinely disputed or definition-dependent — river
 * lengths, desert boundaries, pyramid mass — the prompt names the definition
 * used and the explanation says the figure is an estimate.
 *
 * Slider bounds are chosen so the answer sits away from the midpoint; the
 * slider opens at its centre, so a midpoint answer would pay a player who
 * never touched it.
 */
export const sizeQuestions: readonly Question[] = [
  // ── Length ──────────────────────────────────────────────────────────────
  {
    id: "size-length-burj-khalifa",
    category: "size",
    subtype: "length",
    prompt: "How tall is the Burj Khalifa in Dubai, measured to its architectural tip?",
    answer: 828,
    min: 50,
    max: 2000,
    scale: "log",
    unit: "metre",
    source: {
      title: "Encyclopaedia Britannica — Burj Khalifa",
      url: "https://www.britannica.com/topic/Burj-Khalifa",
    },
    explanation:
      "At 828 metres the Burj Khalifa has been the world's tallest building since it opened in 2010, roughly twice the height of the Empire State Building.",
  },
  {
    id: "size-length-challenger-deep",
    category: "size",
    subtype: "length",
    prompt: "How deep is Challenger Deep, the deepest known point of the ocean floor?",
    answer: 10_935,
    min: 500,
    max: 20_000,
    scale: "log",
    unit: "metre",
    source: {
      title: "NOAA Ocean Exploration — How deep is the ocean?",
      url: "https://oceanexplorer.noaa.gov/facts/ocean-depth.html",
    },
    explanation:
      "Challenger Deep, in the Mariana Trench, reaches about 10,935 metres. Mount Everest would sit beneath the surface with two kilometres to spare.",
  },
  {
    id: "size-length-nile",
    category: "size",
    subtype: "length",
    prompt: "How long is the Nile, measured from its remotest headstream to the Mediterranean?",
    answer: 6_650,
    min: 500,
    max: 20_000,
    scale: "log",
    unit: "kilometre",
    source: {
      title: "Encyclopaedia Britannica — Nile River",
      url: "https://www.britannica.com/place/Nile-River",
    },
    explanation:
      "The Nile runs about 6,650 kilometres. Whether it or the Amazon is the longer river depends on where each is judged to begin.",
  },
  {
    id: "size-length-moon-distance",
    category: "size",
    subtype: "length",
    prompt: "What is the mean distance from the Earth to the Moon, centre to centre?",
    answer: 384_400,
    min: 1000,
    max: 10_000_000,
    scale: "log",
    unit: "kilometre",
    source: {
      title: "NASA Science — Earth's Moon facts",
      url: "https://science.nasa.gov/moon/facts/",
    },
    explanation:
      "The Moon averages about 384,400 kilometres away, though its elliptical orbit swings that distance by more than 40,000 kilometres.",
  },
  {
    id: "size-length-eiffel-tower",
    category: "size",
    subtype: "length",
    prompt: "How tall is the Eiffel Tower, including the antennas at its summit?",
    answer: 330,
    min: 10,
    max: 1000,
    scale: "log",
    unit: "metre",
    source: {
      title: "Encyclopaedia Britannica — Eiffel Tower",
      url: "https://www.britannica.com/topic/Eiffel-Tower-Paris-France",
    },
    explanation:
      "The tower stands about 330 metres to the tip. It was the tallest structure in the world from 1889 until the Chrysler Building overtook it in 1930.",
  },
  {
    id: "size-length-angel-falls",
    category: "size",
    subtype: "length",
    prompt: "What is the total drop of Angel Falls in Venezuela, the world's highest uninterrupted waterfall?",
    answer: 979,
    min: 50,
    max: 2000,
    scale: "log",
    unit: "metre",
    source: {
      title: "Encyclopaedia Britannica — Angel Falls",
      url: "https://www.britannica.com/place/Angel-Falls",
    },
    explanation:
      "Angel Falls drops about 979 metres, so far that much of the water disperses into mist before it reaches the bottom.",
  },
  {
    id: "size-length-panama-canal",
    category: "size",
    subtype: "length",
    prompt: "How long is the Panama Canal from deep water in the Caribbean to deep water in the Pacific?",
    answer: 82,
    min: 2,
    max: 200,
    scale: "log",
    unit: "kilometre",
    source: {
      title: "Encyclopaedia Britannica — Panama Canal",
      url: "https://www.britannica.com/topic/Panama-Canal",
    },
    explanation:
      "The canal runs about 82 kilometres. Ships are lifted 26 metres above sea level to cross, then lowered again on the far side.",
  },
  {
    id: "size-length-lake-baikal-depth",
    category: "size",
    subtype: "length",
    prompt: "What is the maximum depth of Lake Baikal, the deepest lake in the world?",
    answer: 1_642,
    min: 50,
    max: 5000,
    scale: "log",
    unit: "metre",
    source: {
      title: "Encyclopaedia Britannica — Lake Baikal",
      url: "https://www.britannica.com/place/Lake-Baikal",
    },
    explanation:
      "Baikal reaches about 1,642 metres deep and holds roughly a fifth of the world's unfrozen fresh surface water.",
  },
  {
    id: "size-length-everest",
    category: "size",
    subtype: "length",
    prompt: "What is the elevation of the summit of Mount Everest above sea level?",
    answer: 8_849,
    min: 1000,
    max: 20_000,
    scale: "log",
    unit: "metre",
    source: {
      title: "Encyclopaedia Britannica — Mount Everest",
      url: "https://www.britannica.com/place/Mount-Everest",
    },
    explanation:
      "China and Nepal jointly announced 8,848.86 metres in 2020, settling a long disagreement over whether to measure the rock or the snow cap.",
  },
  {
    id: "size-length-great-wall",
    category: "size",
    subtype: "length",
    prompt: "How long is the Great Wall of China in total, counting every branch and spur surveyed in 2012?",
    answer: 21_196,
    min: 500,
    max: 100_000,
    scale: "log",
    unit: "kilometre",
    source: {
      title: "Encyclopaedia Britannica — Great Wall of China",
      url: "https://www.britannica.com/topic/Great-Wall-of-China",
    },
    explanation:
      "A five-year government survey put the total at about 21,196 kilometres across all dynasties. The single best-known Ming stretch is far shorter.",
  },

  // ── Area ────────────────────────────────────────────────────────────────
  {
    id: "size-area-sahara",
    category: "size",
    subtype: "area",
    prompt: "How large is the Sahara, the largest hot desert in the world?",
    answer: 9_200_000,
    min: 100_000,
    max: 50_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Sahara",
      url: "https://www.britannica.com/place/Sahara-desert-Africa",
    },
    explanation:
      "About 9.2 million square kilometres, close to the area of the United States, and it spans eleven countries.",
  },
  {
    id: "size-area-greenland",
    category: "size",
    subtype: "area",
    prompt: "What is the total area of Greenland, the world's largest island?",
    answer: 2_166_086,
    min: 10_000,
    max: 20_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Greenland",
      url: "https://www.britannica.com/place/Greenland",
    },
    explanation:
      "Greenland covers about 2.17 million square kilometres, roughly 80 percent of it under ice. Mercator maps exaggerate it enormously.",
  },
  {
    id: "size-area-pacific-ocean",
    category: "size",
    subtype: "area",
    prompt: "What is the surface area of the Pacific Ocean?",
    answer: 165_250_000,
    min: 1_000_000,
    max: 500_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Pacific Ocean",
      url: "https://www.britannica.com/place/Pacific-Ocean",
    },
    explanation:
      "At about 165 million square kilometres the Pacific covers more of the planet than every landmass put together.",
  },
  {
    id: "size-area-great-barrier-reef",
    category: "size",
    subtype: "area",
    prompt: "How large an area does the Great Barrier Reef cover?",
    answer: 344_400,
    min: 1000,
    max: 5_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Great Barrier Reef",
      url: "https://www.britannica.com/place/Great-Barrier-Reef",
    },
    explanation:
      "The reef system stretches over about 344,400 square kilometres off Queensland, large enough to be visible from orbit.",
  },
  {
    id: "size-area-amazon-rainforest",
    category: "size",
    subtype: "area",
    prompt: "How large is the Amazon rainforest?",
    answer: 5_500_000,
    min: 50_000,
    max: 50_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Amazon Rainforest",
      url: "https://www.britannica.com/place/Amazon-Rainforest",
    },
    explanation:
      "About 5.5 million square kilometres across nine countries, roughly 60 percent of it inside Brazil.",
  },
  {
    id: "size-area-lake-superior",
    category: "size",
    subtype: "area",
    prompt: "What is the surface area of Lake Superior, the largest of the Great Lakes?",
    answer: 82_100,
    min: 1000,
    max: 1_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Lake Superior",
      url: "https://www.britannica.com/place/Lake-Superior-lake-North-America",
    },
    explanation:
      "About 82,100 square kilometres, the largest freshwater lake in the world by surface area.",
  },
  {
    id: "size-area-russia",
    category: "size",
    subtype: "area",
    prompt: "What is the total area of Russia, the largest country in the world?",
    answer: 17_098_246,
    min: 100_000,
    max: 100_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Russia",
      url: "https://www.britannica.com/place/Russia",
    },
    explanation:
      "About 17.1 million square kilometres, close to an eighth of all the inhabited land on Earth.",
  },
  {
    id: "size-area-caspian-sea",
    category: "size",
    subtype: "area",
    prompt: "What is the surface area of the Caspian Sea, the largest inland body of water on Earth?",
    answer: 371_000,
    min: 1000,
    max: 2_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Caspian Sea",
      url: "https://www.britannica.com/place/Caspian-Sea",
    },
    explanation:
      "About 371,000 square kilometres. Whether it counts as a lake or a sea has real consequences for how its oil is divided.",
  },
  {
    id: "size-area-antarctica",
    category: "size",
    subtype: "area",
    prompt: "What is the area of Antarctica?",
    answer: 14_200_000,
    min: 100_000,
    max: 100_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Antarctica",
      url: "https://www.britannica.com/place/Antarctica",
    },
    explanation:
      "About 14.2 million square kilometres, making it larger than Europe and nearly twice the size of Australia.",
  },
  {
    id: "size-area-mediterranean-sea",
    category: "size",
    subtype: "area",
    prompt: "What is the surface area of the Mediterranean Sea?",
    answer: 2_510_000,
    min: 10_000,
    max: 20_000_000,
    scale: "log",
    unit: "square-kilometre",
    source: {
      title: "Encyclopaedia Britannica — Mediterranean Sea",
      url: "https://www.britannica.com/place/Mediterranean-Sea",
    },
    explanation:
      "About 2.51 million square kilometres, connected to the Atlantic by the Strait of Gibraltar, which is only 13 kilometres wide.",
  },

  // ── Mass ────────────────────────────────────────────────────────────────
  {
    id: "size-mass-blue-whale",
    category: "size",
    subtype: "mass",
    prompt: "What does a large adult blue whale weigh?",
    answer: 150_000,
    min: 100,
    max: 1_000_000,
    scale: "log",
    unit: "kilogram",
    source: {
      title: "NOAA Fisheries — Blue whale",
      url: "https://www.fisheries.noaa.gov/species/blue-whale",
    },
    explanation:
      "Around 150,000 kilograms, making the blue whale the heaviest animal known to have existed, heavier than any dinosaur yet found.",
  },
  {
    id: "size-mass-eiffel-tower",
    category: "size",
    subtype: "mass",
    prompt: "How much does the iron structure of the Eiffel Tower weigh, excluding its foundations?",
    answer: 7_300,
    min: 50,
    max: 100_000,
    scale: "log",
    unit: "tonne",
    source: {
      title: "Encyclopaedia Britannica — Eiffel Tower",
      url: "https://www.britannica.com/topic/Eiffel-Tower-Paris-France",
    },
    explanation:
      "The puddled iron lattice weighs about 7,300 tonnes. Spread over its base, the tower presses down about as hard as a seated adult.",
  },
  {
    id: "size-mass-african-elephant",
    category: "size",
    subtype: "mass",
    prompt: "What does an adult male African bush elephant weigh?",
    answer: 6_000,
    min: 50,
    max: 50_000,
    scale: "log",
    unit: "kilogram",
    source: {
      title: "World Wildlife Fund — African elephant",
      url: "https://www.worldwildlife.org/species/african-elephant",
    },
    explanation:
      "About 6,000 kilograms, which makes the African bush elephant the largest land animal alive today.",
  },
  {
    id: "size-mass-saturn-v",
    category: "size",
    subtype: "mass",
    prompt: "What was the fully fuelled mass of a Saturn V rocket at launch?",
    answer: 2_970_000,
    min: 10_000,
    max: 20_000_000,
    scale: "log",
    unit: "kilogram",
    source: {
      title: "Encyclopaedia Britannica — Saturn V",
      url: "https://www.britannica.com/technology/launch-vehicle/Saturn-V",
    },
    explanation:
      "About 2.97 million kilograms on the pad, the overwhelming majority of it propellant that burned away in minutes.",
  },
  {
    id: "size-mass-iss",
    category: "size",
    subtype: "mass",
    prompt: "What is the approximate mass of the International Space Station?",
    answer: 420_000,
    min: 1000,
    max: 5_000_000,
    scale: "log",
    unit: "kilogram",
    source: {
      title: "NASA — International Space Station",
      url: "https://www.nasa.gov/international-space-station/",
    },
    explanation:
      "Roughly 420,000 kilograms, assembled piece by piece across more than thirty flights because nothing could lift it in one go.",
  },
  {
    id: "size-mass-titanic",
    category: "size",
    subtype: "mass",
    prompt: "What was the displacement of the RMS Titanic when fully loaded?",
    answer: 52_310,
    min: 500,
    max: 500_000,
    scale: "log",
    unit: "tonne",
    source: {
      title: "Encyclopaedia Britannica — Titanic",
      url: "https://www.britannica.com/topic/Titanic",
    },
    explanation:
      "About 52,310 tonnes. She was the largest ship afloat when she sailed, and modern cruise ships are several times heavier.",
  },
  {
    id: "size-mass-great-pyramid",
    category: "size",
    subtype: "mass",
    prompt: "Roughly how much stone was used to build the Great Pyramid of Giza?",
    answer: 5_750_000,
    min: 10_000,
    max: 50_000_000,
    scale: "log",
    unit: "tonne",
    source: {
      title: "Encyclopaedia Britannica — Pyramids of Giza",
      url: "https://www.britannica.com/topic/Pyramids-of-Giza",
    },
    explanation:
      "Estimates centre on about 5.75 million tonnes, made up of roughly 2.3 million blocks averaging over two tonnes each.",
  },
  {
    id: "size-mass-giraffe",
    category: "size",
    subtype: "mass",
    prompt: "What does an adult male giraffe weigh?",
    answer: 1_200,
    min: 10,
    max: 10_000,
    scale: "log",
    unit: "kilogram",
    source: {
      title: "Encyclopaedia Britannica — Giraffe",
      url: "https://www.britannica.com/animal/giraffe",
    },
    explanation:
      "About 1,200 kilograms. Its neck alone can weigh 250 kilograms, yet contains the same seven vertebrae as a human neck.",
  },
  {
    id: "size-mass-big-ben-bell",
    category: "size",
    subtype: "mass",
    prompt: "How heavy is Big Ben, the great bell in the Elizabeth Tower at Westminster?",
    answer: 13_760,
    min: 50,
    max: 200_000,
    scale: "log",
    unit: "kilogram",
    source: {
      title: "Encyclopaedia Britannica — Big Ben",
      url: "https://www.britannica.com/topic/Big-Ben-clock-London",
    },
    explanation:
      "About 13,760 kilograms. Big Ben is the bell itself, not the tower or the clock, and it cracked shortly after being installed.",
  },
  {
    id: "size-mass-boeing-747",
    category: "size",
    subtype: "mass",
    prompt: "What is the maximum take-off weight of a Boeing 747-400?",
    answer: 396_890,
    min: 5000,
    max: 2_000_000,
    scale: "log",
    unit: "kilogram",
    source: {
      title: "Encyclopaedia Britannica — Boeing 747",
      url: "https://www.britannica.com/technology/Boeing-747",
    },
    explanation:
      "About 396,890 kilograms fully loaded, of which more than a third can be fuel on the longest routes.",
  },
];
