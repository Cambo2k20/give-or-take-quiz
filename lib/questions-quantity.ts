import type { Question } from "./types";

/**
 * Quantity questions: how many, what share, how much it cost.
 *
 * Every money question is anchored to a historical figure in the dollars of
 * its day, and the prompt says so. Current prices and valuations were
 * deliberately avoided: they would need re-checking forever, and this bank is
 * meant to be a set of frozen, citable snapshots.
 *
 * Share questions carry a reference year for the same reason. They run on a
 * plain 0-100 slider, so an answer close to 50 percent is an easy one.
 */
export const quantityQuestions: readonly Question[] = [
  // ── Counts ──────────────────────────────────────────────────────────────
  {
    id: "quantity-count-living-languages",
    category: "quantity",
    subtype: "count",
    prompt: "Roughly how many languages are still spoken in the world today?",
    answer: 7_100,
    min: 50,
    max: 50_000,
    scale: "log",
    unit: "count",
    source: {
      title: "Ethnologue — Languages of the World",
      url: "https://www.ethnologue.com/",
    },
    explanation:
      "About 7,100, though roughly half have fewer than 10,000 speakers and a large share are expected to fall out of use this century.",
  },
  {
    id: "quantity-count-human-bones",
    category: "quantity",
    subtype: "count",
    prompt: "How many bones are there in an adult human skeleton?",
    answer: 206,
    min: 10,
    max: 1000,
    scale: "log",
    unit: "count",
    source: {
      title: "Encyclopaedia Britannica — Human skeleton",
      url: "https://www.britannica.com/science/human-skeleton",
    },
    explanation:
      "206 in a typical adult. A newborn has roughly 270; many fuse together during childhood, particularly in the skull and spine.",
  },
  {
    id: "quantity-count-chemical-elements",
    category: "quantity",
    subtype: "count",
    prompt: "How many chemical elements are named on the periodic table?",
    answer: 118,
    min: 5,
    max: 500,
    scale: "log",
    unit: "count",
    source: {
      title: "IUPAC — Periodic Table of Elements",
      url: "https://iupac.org/what-we-do/periodic-table-of-elements/",
    },
    explanation:
      "118, up to oganesson. Everything beyond uranium is made in a laboratory, and the heaviest survive for only fractions of a second.",
  },
  {
    id: "quantity-count-un-member-states",
    category: "quantity",
    subtype: "count",
    prompt: "How many member states does the United Nations have?",
    answer: 193,
    min: 5,
    max: 1000,
    scale: "log",
    unit: "count",
    source: {
      title: "United Nations — Member States",
      url: "https://www.un.org/en/about-us/member-states",
    },
    explanation:
      "193, the most recent being South Sudan in 2011. The UN began with 51 members in 1945.",
  },
  {
    id: "quantity-count-moonwalkers",
    category: "quantity",
    subtype: "count",
    prompt: "How many people have walked on the surface of the Moon?",
    answer: 12,
    min: 1,
    max: 1000,
    scale: "log",
    unit: "count",
    source: {
      title: "Encyclopaedia Britannica — Apollo program",
      url: "https://www.britannica.com/science/Apollo-space-program",
    },
    explanation:
      "Twelve, all between 1969 and 1972 across six Apollo landings. Twelve more flew to the Moon without landing on it.",
  },
  {
    id: "quantity-count-human-chromosomes",
    category: "quantity",
    subtype: "count",
    prompt: "How many chromosomes are there in a typical human body cell?",
    answer: 46,
    min: 2,
    max: 200,
    scale: "log",
    unit: "count",
    source: {
      title: "Encyclopaedia Britannica — Chromosome",
      url: "https://www.britannica.com/science/chromosome",
    },
    explanation:
      "46, arranged in 23 pairs. The correct count was only settled in 1956; textbooks had said 48 for more than thirty years.",
  },
  {
    id: "quantity-count-bird-species",
    category: "quantity",
    subtype: "count",
    prompt: "Roughly how many living species of bird have been described?",
    answer: 11_000,
    min: 100,
    max: 50_000,
    scale: "log",
    unit: "count",
    source: {
      title: "BirdLife International",
      url: "https://www.birdlife.org/",
    },
    explanation:
      "Around 11,000. The total keeps drifting as genetic work splits populations that were once counted as a single species.",
  },
  {
    id: "quantity-count-indonesia-islands",
    category: "quantity",
    subtype: "count",
    prompt: "Roughly how many islands make up Indonesia?",
    answer: 17_000,
    min: 100,
    max: 100_000,
    scale: "log",
    unit: "count",
    source: {
      title: "Encyclopaedia Britannica — Indonesia",
      url: "https://www.britannica.com/place/Indonesia",
    },
    explanation:
      "About 17,000, of which only around 6,000 are inhabited. The archipelago stretches more than 5,000 kilometres from end to end.",
  },
  {
    id: "quantity-count-ant-species",
    category: "quantity",
    subtype: "count",
    prompt: "Roughly how many species of ant have been described by science?",
    answer: 14_000,
    min: 200,
    max: 100_000,
    scale: "log",
    unit: "count",
    source: {
      title: "Encyclopaedia Britannica — Ant",
      url: "https://www.britannica.com/animal/ant",
    },
    explanation:
      "Around 14,000 described so far, and the true figure is thought to be considerably higher. Ants live on every continent except Antarctica.",
  },
  {
    id: "quantity-count-russia-time-zones",
    category: "quantity",
    subtype: "count",
    prompt: "How many time zones does Russia span?",
    answer: 11,
    min: 2,
    max: 500,
    scale: "log",
    unit: "count",
    source: {
      title: "Encyclopaedia Britannica — Russia",
      url: "https://www.britannica.com/place/Russia",
    },
    explanation:
      "Eleven. When the working day begins in Kaliningrad on the Baltic, it is already evening in Kamchatka on the Pacific.",
  },

  // ── Shares ──────────────────────────────────────────────────────────────
  {
    id: "quantity-percentage-electricity-access",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of the world's population had access to electricity in 2022?",
    answer: 91,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    referenceYear: "2022",
    source: {
      title: "World Bank — Access to electricity (% of population)",
      url: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
    },
    explanation:
      "About 91 percent, up from roughly 71 percent in 1990. Most of the remaining gap is in sub-Saharan Africa.",
  },
  {
    id: "quantity-percentage-fresh-water",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of all the water on Earth is fresh water rather than salt water?",
    answer: 2.5,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    source: {
      title: "USGS Water Science School — How much water is there on Earth?",
      url: "https://www.usgs.gov/special-topics/water-science-school/science/how-much-water-there-earth",
    },
    explanation:
      "About 2.5 percent, and most of that is locked in ice caps and glaciers. Well under one percent of Earth's water is accessible fresh water.",
  },
  {
    id: "quantity-percentage-ocean-surface",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of the Earth's surface is covered by ocean?",
    answer: 71,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    source: {
      title: "NOAA Ocean Service — How much water is in the ocean?",
      url: "https://oceanservice.noaa.gov/facts/oceanwater.html",
    },
    explanation:
      "About 71 percent. The ocean holds roughly 97 percent of the planet's water, and most of it has never been directly observed.",
  },
  {
    id: "quantity-percentage-adult-literacy",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of the world's adults could read and write, in the most recent UNESCO estimate?",
    answer: 87,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    source: {
      title: "UNESCO Institute for Statistics — Literacy",
      url: "https://uis.unesco.org/",
    },
    explanation:
      "About 87 percent of adults worldwide, compared with roughly 68 percent in 1979. Nearly two-thirds of adults who cannot read are women.",
  },
  {
    id: "quantity-percentage-agricultural-land",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of the world's land area is used for agriculture, counting both cropland and pasture?",
    answer: 38,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    source: {
      title: "World Bank — Agricultural land (% of land area)",
      url: "https://data.worldbank.org/indicator/AG.LND.AGRI.ZS",
    },
    explanation:
      "About 38 percent. Grazing land accounts for roughly two-thirds of that, far more than the land used to grow crops.",
  },
  {
    id: "quantity-percentage-atmosphere-nitrogen",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of dry air in the Earth's atmosphere is nitrogen, by volume?",
    answer: 78,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    source: {
      title: "NOAA JetStream — The atmosphere",
      url: "https://www.noaa.gov/jetstream/atmosphere",
    },
    explanation:
      "About 78 percent nitrogen and 21 percent oxygen. Everything else, carbon dioxide included, shares the remaining one percent.",
  },
  {
    id: "quantity-percentage-urban-population",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of the world's population lived in urban areas in 2023?",
    answer: 57,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    referenceYear: "2023",
    source: {
      title: "World Bank — Urban population (% of total population)",
      url: "https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS",
    },
    explanation:
      "About 57 percent. The world passed the halfway mark around 2007; in 1960 it was roughly a third.",
  },
  {
    id: "quantity-percentage-internet-users",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of the world's population was using the internet in 2023?",
    answer: 67,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    referenceYear: "2023",
    source: {
      title: "International Telecommunication Union — Statistics",
      url: "https://www.itu.int/en/ITU-D/Statistics/Pages/stat/default.aspx",
    },
    explanation:
      "About 67 percent, leaving roughly 2.6 billion people offline. The gap is widest in low-income countries and among women.",
  },
  {
    id: "quantity-percentage-body-water",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of an adult human body is water, by weight?",
    answer: 60,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    source: {
      title: "USGS Water Science School — The water in you",
      url: "https://www.usgs.gov/special-topics/water-science-school/science/water-you-water-and-human-body",
    },
    explanation:
      "Around 60 percent in an average adult, varying with age and body composition. The brain and lungs are closer to 80 percent.",
  },
  {
    id: "quantity-percentage-earth-land",
    category: "quantity",
    subtype: "percentage",
    prompt: "What share of the Earth's land surface is covered by desert?",
    answer: 33,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "percent",
    source: {
      title: "Encyclopaedia Britannica — Desert",
      url: "https://www.britannica.com/science/desert",
    },
    explanation:
      "About a third, counting both hot and cold deserts. Antarctica is the largest of them, since a desert is defined by rainfall rather than heat.",
  },

  // ── Money ───────────────────────────────────────────────────────────────
  {
    id: "quantity-money-louisiana-purchase",
    category: "quantity",
    subtype: "money",
    prompt: "What did the United States pay France for the Louisiana Purchase in 1803, in the dollars of the day?",
    answer: 15_000_000,
    min: 100_000,
    max: 100_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1803",
    source: {
      title: "Encyclopaedia Britannica — Louisiana Purchase",
      url: "https://www.britannica.com/event/Louisiana-Purchase",
    },
    explanation:
      "15 million dollars for about 2.1 million square kilometres, which roughly doubled the size of the country at around three cents an acre.",
  },
  {
    id: "quantity-money-alaska-purchase",
    category: "quantity",
    subtype: "money",
    prompt: "What did the United States pay Russia for Alaska in 1867, in the dollars of the day?",
    answer: 7_200_000,
    min: 50_000,
    max: 50_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1867",
    source: {
      title: "Encyclopaedia Britannica — Alaska Purchase",
      url: "https://www.britannica.com/topic/Alaska-Purchase",
    },
    explanation:
      "7.2 million dollars, about two cents an acre. Critics called it Seward's Folly until gold was found three decades later.",
  },
  {
    id: "quantity-money-apollo-program",
    category: "quantity",
    subtype: "money",
    prompt: "What did the Apollo programme cost in total through 1973, in the dollars of the day?",
    answer: 25_400_000_000,
    min: 100_000_000,
    max: 500_000_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1973",
    source: {
      title: "Encyclopaedia Britannica — Apollo program",
      url: "https://www.britannica.com/science/Apollo-space-program",
    },
    explanation:
      "About 25.4 billion dollars at the time. At its peak the programme took close to four percent of the entire federal budget.",
  },
  {
    id: "quantity-money-manhattan-project",
    category: "quantity",
    subtype: "money",
    prompt: "What did the Manhattan Project cost through 1945, in the dollars of the day?",
    answer: 1_900_000_000,
    min: 5_000_000,
    max: 20_000_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1945",
    source: {
      title: "Encyclopaedia Britannica — Manhattan Project",
      url: "https://www.britannica.com/event/Manhattan-Project",
    },
    explanation:
      "About 1.9 billion dollars. The great majority went on producing fissile material rather than on designing the weapons themselves.",
  },
  {
    id: "quantity-money-titanic-build",
    category: "quantity",
    subtype: "money",
    prompt: "What did it cost to build the RMS Titanic in 1912, in the dollars of the day?",
    answer: 7_500_000,
    min: 100_000,
    max: 100_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1912",
    source: {
      title: "Encyclopaedia Britannica — Titanic",
      url: "https://www.britannica.com/topic/Titanic",
    },
    explanation:
      "About 7.5 million dollars. She was insured for rather less than she cost to build, and sank on her maiden voyage.",
  },
  {
    id: "quantity-money-panama-canal",
    category: "quantity",
    subtype: "money",
    prompt: "What did the Panama Canal cost the United States to build between 1904 and 1914, in the dollars of the day?",
    answer: 375_000_000,
    min: 5_000_000,
    max: 2_000_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1914",
    source: {
      title: "Encyclopaedia Britannica — Panama Canal",
      url: "https://www.britannica.com/topic/Panama-Canal",
    },
    explanation:
      "About 375 million dollars, the most expensive construction project the United States had undertaken to that point.",
  },
  {
    id: "quantity-money-marshall-plan",
    category: "quantity",
    subtype: "money",
    prompt: "How much aid did the Marshall Plan send to western Europe between 1948 and 1952, in the dollars of the day?",
    answer: 13_300_000_000,
    min: 100_000_000,
    max: 200_000_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1952",
    source: {
      title: "Encyclopaedia Britannica — Marshall Plan",
      url: "https://www.britannica.com/event/Marshall-Plan",
    },
    explanation:
      "About 13.3 billion dollars over four years, split across sixteen countries, with Britain and France receiving the largest shares.",
  },
  {
    id: "quantity-money-empire-state-building",
    category: "quantity",
    subtype: "money",
    prompt: "What did the Empire State Building cost to build, completed in 1931, in the dollars of the day?",
    answer: 40_948_900,
    min: 500_000,
    max: 500_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1931",
    source: {
      title: "Encyclopaedia Britannica — Empire State Building",
      url: "https://www.britannica.com/topic/Empire-State-Building",
    },
    explanation:
      "About 41 million dollars, well under its budget because the Depression had driven down the cost of labour and materials.",
  },
  {
    id: "quantity-money-hubble-launch",
    category: "quantity",
    subtype: "money",
    prompt: "What had the Hubble Space Telescope cost by the time it launched in 1990, in the dollars of the day?",
    answer: 1_500_000_000,
    min: 20_000_000,
    max: 20_000_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1990",
    source: {
      title: "NASA Science — Hubble Space Telescope",
      url: "https://science.nasa.gov/mission/hubble/",
    },
    explanation:
      "About 1.5 billion dollars. Its main mirror turned out to be misground, and a shuttle crew had to fly up in 1993 to correct it.",
  },
  {
    id: "quantity-money-golden-gate-bridge",
    category: "quantity",
    subtype: "money",
    prompt: "What did the Golden Gate Bridge cost to build, completed in 1937, in the dollars of the day?",
    answer: 35_000_000,
    min: 500_000,
    max: 200_000_000,
    scale: "log",
    unit: "usd",
    referenceYear: "1937",
    source: {
      title: "Encyclopaedia Britannica — Golden Gate Bridge",
      url: "https://www.britannica.com/topic/Golden-Gate-Bridge",
    },
    explanation:
      "About 35 million dollars, and it came in under budget. A safety net strung beneath the deck saved nineteen workers who fell into it.",
  },
];
