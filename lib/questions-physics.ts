import type { Question } from "./types";

/**
 * Physics questions: how long it takes, how fast it moves, how hot it gets.
 *
 * Temperature questions use records and physical constants rather than any
 * current reading, so nothing here needs re-checking against live data. Each
 * temperature slider is linear, because a logarithmic scale cannot represent
 * the negative values these questions depend on.
 */
export const physicsQuestions: readonly Question[] = [
  // ── Duration ────────────────────────────────────────────────────────────
  {
    id: "physics-duration-anglo-zanzibar-war",
    category: "physics",
    subtype: "duration",
    prompt: "How long did the Anglo-Zanzibar War of 1896, the shortest recorded war in history, last?",
    answer: 38,
    min: 5,
    max: 2000,
    scale: "log",
    unit: "minute",
    source: {
      title: "Encyclopaedia Britannica — Anglo-Zanzibar War",
      url: "https://www.britannica.com/event/Anglo-Zanzibar-War",
    },
    explanation:
      "Roughly 38 minutes on 27 August 1896. The bombardment began at about nine in the morning and the palace surrendered before ten.",
  },
  {
    id: "physics-duration-elephant-gestation",
    category: "physics",
    subtype: "duration",
    prompt: "How long is an African elephant's pregnancy?",
    answer: 645,
    min: 30,
    max: 2000,
    scale: "log",
    unit: "day",
    source: {
      title: "Encyclopaedia Britannica — Elephant",
      url: "https://www.britannica.com/animal/elephant-mammal",
    },
    explanation:
      "About 645 days, close to 22 months. It is the longest gestation of any land mammal, and calves are born able to walk.",
  },
  {
    id: "physics-duration-carbon-14-half-life",
    category: "physics",
    subtype: "duration",
    prompt: "What is the half-life of carbon-14, the isotope used in radiocarbon dating?",
    answer: 5_730,
    min: 50,
    max: 50_000,
    scale: "log",
    unit: "duration-year",
    source: {
      title: "Encyclopaedia Britannica — Carbon-14",
      url: "https://www.britannica.com/science/carbon-14",
    },
    explanation:
      "About 5,730 years. That decay rate is why radiocarbon dating becomes unreliable much beyond 50,000 years, when too little is left to measure.",
  },
  {
    id: "physics-duration-sunlight-to-earth",
    category: "physics",
    subtype: "duration",
    prompt: "How long does light from the Sun take to reach the Earth?",
    answer: 499,
    min: 5,
    max: 2000,
    scale: "log",
    unit: "second",
    source: {
      title: "NASA Science — Sun facts",
      url: "https://science.nasa.gov/sun/facts/",
    },
    explanation:
      "About 499 seconds, or 8 minutes 19 seconds. The Sun you see has always already moved on from where it appears to be.",
  },
  {
    id: "physics-duration-halleys-comet",
    category: "physics",
    subtype: "duration",
    prompt: "How long does Halley's Comet take to complete one orbit of the Sun?",
    answer: 76,
    min: 2,
    max: 500,
    scale: "log",
    unit: "duration-year",
    source: {
      title: "Encyclopaedia Britannica — Halley's Comet",
      url: "https://www.britannica.com/topic/Halleys-Comet",
    },
    explanation:
      "About 76 years. It last appeared in 1986 and is due back in 2061, so most people see it at most once.",
  },
  {
    id: "physics-duration-moon-orbit",
    category: "physics",
    subtype: "duration",
    prompt: "How long does the Moon take to complete one orbit of the Earth, measured against the stars?",
    answer: 27,
    min: 5,
    max: 2000,
    scale: "log",
    unit: "day",
    source: {
      title: "NASA Science — Earth's Moon facts",
      url: "https://science.nasa.gov/moon/facts/",
    },
    explanation:
      "About 27.3 days against the stars, but 29.5 days from one full moon to the next, because the Earth moves along its own orbit meanwhile.",
  },
  {
    id: "physics-duration-hundred-years-war",
    category: "physics",
    subtype: "duration",
    prompt: "How many years did the Hundred Years' War between England and France actually last?",
    answer: 116,
    min: 2,
    max: 500,
    scale: "log",
    unit: "duration-year",
    source: {
      title: "Encyclopaedia Britannica — Hundred Years' War",
      url: "https://www.britannica.com/event/Hundred-Years-War",
    },
    explanation:
      "116 years, from 1337 to 1453, and punctuated by long truces. The name was applied by historians long after it ended.",
  },
  {
    id: "physics-duration-neutron-half-life",
    category: "physics",
    subtype: "duration",
    prompt: "What is the half-life of a free neutron outside an atomic nucleus?",
    answer: 611,
    min: 1,
    max: 10_000,
    scale: "log",
    unit: "second",
    source: {
      title: "Encyclopaedia Britannica — Neutron",
      url: "https://www.britannica.com/science/neutron",
    },
    explanation:
      "About 611 seconds, a little over ten minutes, after which it decays into a proton, an electron and an antineutrino. Bound inside a nucleus it is stable.",
  },
  {
    id: "physics-duration-cat-gestation",
    category: "physics",
    subtype: "duration",
    prompt: "How long is a domestic cat's pregnancy?",
    answer: 64,
    min: 1,
    max: 200,
    scale: "log",
    unit: "day",
    source: {
      title: "Encyclopaedia Britannica — Cat",
      url: "https://www.britannica.com/animal/cat",
    },
    explanation:
      "About 64 days, roughly nine weeks, typically producing a litter of three to five kittens.",
  },
  {
    id: "physics-duration-apollo-11-surface",
    category: "physics",
    subtype: "duration",
    prompt: "How long did Armstrong and Aldrin spend on the lunar surface before lifting off again?",
    answer: 22,
    min: 2,
    max: 1000,
    scale: "log",
    unit: "hour",
    source: {
      title: "Encyclopaedia Britannica — Apollo 11",
      url: "https://www.britannica.com/topic/Apollo-11",
    },
    explanation:
      "About 21 hours 36 minutes in total, of which only around two and a half hours were spent outside the lunar module.",
  },

  // ── Speed ───────────────────────────────────────────────────────────────
  {
    id: "physics-speed-peregrine-falcon",
    category: "physics",
    subtype: "speed",
    prompt: "How fast can a peregrine falcon travel in a full hunting dive?",
    answer: 390,
    min: 10,
    max: 2000,
    scale: "log",
    unit: "kph",
    source: {
      title: "Encyclopaedia Britannica — Peregrine falcon",
      url: "https://www.britannica.com/animal/peregrine-falcon",
    },
    explanation:
      "Around 390 kilometres per hour in a stoop, which makes it the fastest animal on Earth. In level flight it is far slower.",
  },
  {
    id: "physics-speed-sound",
    category: "physics",
    subtype: "speed",
    prompt: "How fast does sound travel through dry air at sea level and 20°C?",
    answer: 1_235,
    min: 20,
    max: 5000,
    scale: "log",
    unit: "kph",
    source: {
      title: "Encyclopaedia Britannica — Speed of sound",
      url: "https://www.britannica.com/science/speed-of-sound-physics",
    },
    explanation:
      "About 1,235 kilometres per hour, or 343 metres per second. Sound moves faster in warmer air, and much faster again through water and steel.",
  },
  {
    id: "physics-speed-cheetah",
    category: "physics",
    subtype: "speed",
    prompt: "What is a cheetah's top running speed?",
    answer: 110,
    min: 5,
    max: 500,
    scale: "log",
    unit: "kph",
    source: {
      title: "Encyclopaedia Britannica — Cheetah",
      url: "https://www.britannica.com/animal/cheetah-mammal",
    },
    explanation:
      "About 110 kilometres per hour, but only in bursts of a few hundred metres before it has to stop and cool down.",
  },
  {
    id: "physics-speed-earth-orbit",
    category: "physics",
    subtype: "speed",
    prompt: "How fast does the Earth travel along its orbit around the Sun?",
    answer: 107_000,
    min: 1000,
    max: 1_000_000,
    scale: "log",
    unit: "kph",
    source: {
      title: "NASA Science — Earth facts",
      url: "https://science.nasa.gov/earth/facts/",
    },
    explanation:
      "About 107,000 kilometres per hour, roughly 30 kilometres every second, and you feel none of it.",
  },
  {
    id: "physics-speed-usain-bolt",
    category: "physics",
    subtype: "speed",
    prompt: "What top speed did Usain Bolt reach during his 100 metres world record in 2009?",
    answer: 44,
    min: 2,
    max: 200,
    scale: "log",
    unit: "kph",
    referenceYear: "2009",
    source: {
      title: "Encyclopaedia Britannica — Usain Bolt",
      url: "https://www.britannica.com/biography/Usain-Bolt",
    },
    explanation:
      "About 44 kilometres per hour at his fastest, over a run averaging roughly 37. The record of 9.58 seconds still stands.",
  },
  {
    id: "physics-speed-escape-velocity",
    category: "physics",
    subtype: "speed",
    prompt: "What is escape velocity at the Earth's surface, the speed needed to leave without further propulsion?",
    answer: 40_270,
    min: 500,
    max: 200_000,
    scale: "log",
    unit: "kph",
    source: {
      title: "Encyclopaedia Britannica — Escape velocity",
      url: "https://www.britannica.com/science/escape-velocity",
    },
    explanation:
      "About 40,270 kilometres per hour, or 11.2 kilometres per second. Rockets never actually travel that fast at the surface, because they keep burning fuel as they climb.",
  },
  {
    id: "physics-speed-iss",
    category: "physics",
    subtype: "speed",
    prompt: "How fast does the International Space Station travel in its orbit?",
    answer: 27_600,
    min: 500,
    max: 200_000,
    scale: "log",
    unit: "kph",
    source: {
      title: "NASA — International Space Station",
      url: "https://www.nasa.gov/international-space-station/",
    },
    explanation:
      "About 27,600 kilometres per hour, circling the Earth roughly every 90 minutes, so its crew sees sixteen sunrises a day.",
  },
  {
    id: "physics-speed-concorde",
    category: "physics",
    subtype: "speed",
    prompt: "What was Concorde's normal cruising speed?",
    answer: 2_180,
    min: 50,
    max: 10_000,
    scale: "log",
    unit: "kph",
    source: {
      title: "Encyclopaedia Britannica — Concorde",
      url: "https://www.britannica.com/technology/Concorde",
    },
    explanation:
      "About 2,180 kilometres per hour, twice the speed of sound, crossing the Atlantic in under three and a half hours.",
  },
  {
    id: "physics-speed-boeing-747",
    category: "physics",
    subtype: "speed",
    prompt: "What is the typical cruising speed of a Boeing 747?",
    answer: 917,
    min: 50,
    max: 5000,
    scale: "log",
    unit: "kph",
    source: {
      title: "Encyclopaedia Britannica — Boeing 747",
      url: "https://www.britannica.com/technology/Boeing-747",
    },
    explanation:
      "About 917 kilometres per hour, roughly 85 percent of the speed of sound, which is close to the practical limit for a subsonic airliner.",
  },
  {
    id: "physics-speed-light",
    category: "physics",
    subtype: "speed",
    prompt: "How fast does light travel in a vacuum, expressed in kilometres per hour?",
    answer: 1_079_252_849,
    min: 100_000,
    max: 100_000_000_000,
    scale: "log",
    unit: "kph",
    source: {
      title: "Encyclopaedia Britannica — Speed of light",
      url: "https://www.britannica.com/science/speed-of-light",
    },
    explanation:
      "Exactly 1,079,252,848.8 kilometres per hour. The figure is exact because the metre is now defined in terms of it.",
  },

  // ── Temperature ─────────────────────────────────────────────────────────
  {
    id: "physics-temperature-highest-recorded",
    category: "physics",
    subtype: "temperature",
    prompt: "What is the highest air temperature reliably recorded at the Earth's surface?",
    answer: 56.7,
    min: -100,
    max: 100,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "WMO Weather and Climate Extremes Archive",
      url: "https://wmo.asu.edu/",
    },
    explanation:
      "56.7°C at Furnace Creek in Death Valley on 10 July 1913. A higher 1922 reading from Libya was struck from the record in 2012.",
  },
  {
    id: "physics-temperature-lowest-recorded",
    category: "physics",
    subtype: "temperature",
    prompt: "What is the lowest natural air temperature ever recorded at a weather station?",
    answer: -89.2,
    min: -150,
    max: 60,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "WMO Weather and Climate Extremes Archive",
      url: "https://wmo.asu.edu/",
    },
    explanation:
      "−89.2°C at Vostok Station in Antarctica on 21 July 1983. Satellites have since measured colder patches of ice from orbit.",
  },
  {
    id: "physics-temperature-venus-surface",
    category: "physics",
    subtype: "temperature",
    prompt: "What is the mean surface temperature of Venus?",
    answer: 464,
    min: -100,
    max: 1_500,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "NASA Science — Venus facts",
      url: "https://science.nasa.gov/venus/facts/",
    },
    explanation:
      "About 464°C, hot enough to melt lead, and hotter than Mercury despite being further from the Sun. A runaway greenhouse effect is the reason.",
  },
  {
    id: "physics-temperature-sun-surface",
    category: "physics",
    subtype: "temperature",
    prompt: "What is the temperature of the Sun's visible surface, the photosphere?",
    answer: 5_500,
    min: 0,
    max: 30_000,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "NASA Science — Sun facts",
      url: "https://science.nasa.gov/sun/facts/",
    },
    explanation:
      "About 5,500°C. Oddly the corona above it is far hotter still, over a million degrees, and why remains an open question.",
  },
  {
    id: "physics-temperature-lightning",
    category: "physics",
    subtype: "temperature",
    prompt: "How hot does the air in a lightning channel get?",
    answer: 30_000,
    min: 1_000,
    max: 100_000,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "NOAA National Weather Service — Lightning safety",
      url: "https://www.weather.gov/safety/lightning",
    },
    explanation:
      "Around 30,000°C, roughly five times hotter than the surface of the Sun. The air expands so violently that the shock wave is heard as thunder.",
  },
  {
    id: "physics-temperature-iron-melting",
    category: "physics",
    subtype: "temperature",
    prompt: "At what temperature does pure iron melt?",
    answer: 1_538,
    min: 0,
    max: 5_000,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "Encyclopaedia Britannica — Iron",
      url: "https://www.britannica.com/science/iron-chemical-element",
    },
    explanation:
      "1,538°C. Early smiths could never reach it, so wrought iron was worked hot and soft rather than cast as a liquid.",
  },
  {
    id: "physics-temperature-nitrogen-boiling",
    category: "physics",
    subtype: "temperature",
    prompt: "At what temperature does liquid nitrogen boil at normal atmospheric pressure?",
    answer: -196,
    min: -273,
    max: 100,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "Encyclopaedia Britannica — Nitrogen",
      url: "https://www.britannica.com/science/nitrogen",
    },
    explanation:
      "−196°C. Because it boils away steadily at room temperature, liquid nitrogen has to be stored in vented containers rather than sealed ones.",
  },
  {
    id: "physics-temperature-mars-average",
    category: "physics",
    subtype: "temperature",
    prompt: "What is the average surface temperature on Mars?",
    answer: -63,
    min: -150,
    max: 100,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "NASA Science — Mars facts",
      url: "https://science.nasa.gov/mars/facts/",
    },
    explanation:
      "About −63°C on average, though a summer afternoon at the equator can reach 20°C while the night falls to −100°C.",
  },
  {
    id: "physics-temperature-cmb",
    category: "physics",
    subtype: "temperature",
    prompt: "What is the temperature of the cosmic microwave background, the leftover heat of the early universe?",
    answer: -270.4,
    min: -273,
    max: 0,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "Encyclopaedia Britannica — Cosmic microwave background",
      url: "https://www.britannica.com/science/cosmic-microwave-background",
    },
    explanation:
      "About −270.4°C, or 2.7 degrees above absolute zero. It fills all of space and is the coldest thing that occurs naturally.",
  },
  {
    id: "physics-temperature-earth-core",
    category: "physics",
    subtype: "temperature",
    prompt: "Roughly how hot is the Earth's inner core?",
    answer: 5_200,
    min: 0,
    max: 20_000,
    scale: "linear",
    unit: "celsius",
    source: {
      title: "Encyclopaedia Britannica — Earth: the interior",
      url: "https://www.britannica.com/place/Earth/The-interior",
    },
    explanation:
      "Around 5,200°C, comparable to the surface of the Sun. It stays solid despite the heat because the pressure there is immense.",
  },
];
