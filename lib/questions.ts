import type { Question } from "./types";

/**
 * A local, deterministic question bank.
 *
 * Population figures are fixed snapshots rather than live values. Country
 * questions use the UN DESA World Population Prospects 2024 midyear series,
 * whose underlying definition is the de facto population of the whole country.
 * City questions use the 2020 U.S. decennial census count for the legally
 * incorporated city ("city proper"), not an urban area or metro.
 */
export const questions: readonly Question[] = [
  {
    id: "population-country-india-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was India's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 1_450_935_791,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 1.451 billion people across India as a whole.",
  },
  {
    id: "population-country-china-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was China's country-total population (the UN national series, not a city or metro) in the 2024 midyear estimate?",
    answer: 1_419_321_278,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 1.419 billion people in China's national population series.",
  },
  {
    id: "population-country-united-states-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was the United States' country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 345_426_571,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 345.4 million people for the United States as a whole.",
  },
  {
    id: "population-country-indonesia-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Indonesia's country-total population (all of the country, not a city or metro) in the 2024 midyear estimate?",
    answer: 283_487_931,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 283.5 million people across the Indonesian archipelago.",
  },
  {
    id: "population-country-pakistan-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Pakistan's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 251_269_164,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 251.3 million people across Pakistan as a whole.",
  },
  {
    id: "population-country-nigeria-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Nigeria's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 232_679_478,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 232.7 million people across Nigeria as a whole.",
  },
  {
    id: "population-country-brazil-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Brazil's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 211_998_573,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 212.0 million people across Brazil as a whole.",
  },
  {
    id: "population-country-bangladesh-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Bangladesh's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 173_562_364,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 173.6 million people across Bangladesh as a whole.",
  },
  {
    id: "population-country-russia-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Russia's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 144_820_423,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 144.8 million people across the Russian Federation.",
  },
  {
    id: "population-country-ethiopia-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Ethiopia's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 132_059_768,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 132.1 million people across Ethiopia as a whole.",
  },
  {
    id: "population-country-mexico-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Mexico's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 130_861_007,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 130.9 million people across Mexico as a whole.",
  },
  {
    id: "population-country-japan-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Japan's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 123_753_041,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 123.8 million people across Japan as a whole.",
  },
  {
    id: "population-country-egypt-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was Egypt's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 116_538_258,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 116.5 million people across Egypt as a whole.",
  },
  {
    id: "population-country-philippines-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was the Philippines' country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 115_843_670,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 115.8 million people across the Philippines as a whole.",
  },
  {
    id: "population-country-dr-congo-2024",
    category: "population",
    subtype: "country",
    prompt:
      "What was the Democratic Republic of the Congo's country-total population (the whole country, not a city or metro) in the 2024 midyear estimate?",
    answer: 109_276_265,
    min: 1_000_000,
    max: 1_600_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2024 midyear estimate",
    source: {
      title: "UN DESA — World Population Prospects 2024",
      url: "https://population.un.org/wpp/",
    },
    explanation:
      "The 2024 midyear estimate was about 109.3 million people across the DRC as a whole.",
  },
  {
    id: "population-city-new-york-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was New York City's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 8_804_190,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — New York city, New York",
      url: "https://www.census.gov/quickfacts/fact/table/newyorkcitynewyork/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 8,804,190 residents inside New York City's legal city limits.",
  },
  {
    id: "population-city-los-angeles-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Los Angeles' population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 3_898_747,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Los Angeles city, California",
      url: "https://www.census.gov/quickfacts/fact/table/losangelescitycalifornia/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 3,898,747 residents inside Los Angeles' legal city limits.",
  },
  {
    id: "population-city-chicago-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Chicago's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 2_746_388,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Chicago city, Illinois",
      url: "https://www.census.gov/quickfacts/fact/table/chicagocityillinois/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 2,746,388 residents inside Chicago's legal city limits.",
  },
  {
    id: "population-city-houston-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Houston's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 2_304_580,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Houston city, Texas",
      url: "https://www.census.gov/quickfacts/fact/table/houstoncitytexas/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 2,304,580 residents inside Houston's legal city limits.",
  },
  {
    id: "population-city-phoenix-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Phoenix's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 1_608_139,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Phoenix city, Arizona",
      url: "https://www.census.gov/quickfacts/fact/table/phoenixcityarizona/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 1,608,139 residents inside Phoenix's legal city limits.",
  },
  {
    id: "population-city-philadelphia-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Philadelphia's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 1_603_797,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Philadelphia city, Pennsylvania",
      url: "https://www.census.gov/quickfacts/fact/table/philadelphiacitypennsylvania/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 1,603,797 residents inside Philadelphia's legal city limits.",
  },
  {
    id: "population-city-san-antonio-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was San Antonio's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 1_434_625,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — San Antonio city, Texas",
      url: "https://www.census.gov/quickfacts/fact/table/sanantoniocitytexas/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 1,434,625 residents inside San Antonio's legal city limits.",
  },
  {
    id: "population-city-san-diego-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was San Diego's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 1_386_932,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — San Diego city, California",
      url: "https://www.census.gov/quickfacts/fact/table/sandiegocitycalifornia/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 1,386,932 residents inside San Diego's legal city limits.",
  },
  {
    id: "population-city-dallas-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Dallas' population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 1_304_379,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Dallas city, Texas",
      url: "https://www.census.gov/quickfacts/fact/table/dallascitytexas/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 1,304,379 residents inside Dallas' legal city limits.",
  },
  {
    id: "population-city-san-jose-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was San Jose's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 1_013_240,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — San Jose city, California",
      url: "https://www.census.gov/quickfacts/fact/table/sanjosecitycalifornia/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 1,013,240 residents inside San Jose's legal city limits.",
  },
  {
    id: "population-city-austin-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Austin's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 961_855,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Austin city, Texas",
      url: "https://www.census.gov/quickfacts/fact/table/austincitytexas/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 961,855 residents inside Austin's legal city limits.",
  },
  {
    id: "population-city-jacksonville-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Jacksonville's population in the 2020 U.S. Census, counting the consolidated city proper within its legal boundaries (not the metro area)?",
    answer: 949_611,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (consolidated city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Jacksonville city, Florida",
      url: "https://www.census.gov/quickfacts/fact/table/jacksonvillecityflorida/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 949,611 residents inside Jacksonville's consolidated city boundaries.",
  },
  {
    id: "population-city-fort-worth-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Fort Worth's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 918_915,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Fort Worth city, Texas",
      url: "https://www.census.gov/quickfacts/fact/table/fortworthcitytexas/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 918,915 residents inside Fort Worth's legal city limits.",
  },
  {
    id: "population-city-columbus-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Columbus, Ohio's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 905_748,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Columbus city, Ohio",
      url: "https://www.census.gov/quickfacts/fact/table/columbuscityohio/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 905,748 residents inside Columbus' legal city limits.",
  },
  {
    id: "population-city-charlotte-2020",
    category: "population",
    subtype: "city",
    prompt:
      "What was Charlotte's population in the 2020 U.S. Census, counting the city proper within its legal boundaries (not the metro area)?",
    answer: 874_579,
    min: 100_000,
    max: 10_000_000,
    scale: "log",
    unit: "people",
    referenceYear: "2020 decennial census (city proper)",
    source: {
      title: "U.S. Census Bureau QuickFacts — Charlotte city, North Carolina",
      url: "https://www.census.gov/quickfacts/fact/table/charlottecitynorthcarolina/PST045225",
    },
    explanation:
      "The 2020 decennial census counted 874,579 residents inside Charlotte's legal city limits.",
  },
  {
    id: "history-event-battle-of-hastings",
    category: "history",
    subtype: "event",
    prompt: "In what year was the Battle of Hastings fought?",
    answer: 1066,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "English Heritage — History of the Battle of Hastings",
      url: "https://www.english-heritage.org.uk/visit/places/1066-battle-of-hastings-abbey-and-battlefield/history-and-stories/history/",
    },
    explanation:
      "The battle was fought in 1066, when William of Normandy defeated King Harold II.",
  },
  {
    id: "history-event-magna-carta",
    category: "history",
    subtype: "event",
    prompt: "In what year was Magna Carta first sealed at Runnymede?",
    answer: 1215,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "UK Parliament — Magna Carta",
      url: "https://www.parliament.uk/magnacarta/",
    },
    explanation:
      "King John first sealed Magna Carta at Runnymede in 1215.",
  },
  {
    id: "history-event-fall-of-constantinople",
    category: "history",
    subtype: "event",
    prompt: "In what year did Constantinople fall to the Ottoman Empire?",
    answer: 1453,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Encyclopaedia Britannica — Fall of Constantinople",
      url: "https://www.britannica.com/event/Fall-of-Constantinople-1453",
    },
    explanation:
      "Ottoman forces captured Constantinople in 1453, ending the Byzantine Empire.",
  },
  {
    id: "history-event-columbus-caribbean",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did Christopher Columbus' first voyage reach the Caribbean?",
    answer: 1492,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Library of Congress — 1492: An Ongoing Voyage, Columbus",
      url: "https://www.loc.gov/exhibits/1492/columbus.html",
    },
    explanation:
      "Columbus' first Atlantic voyage reached the Caribbean in 1492.",
  },
  {
    id: "history-event-ninety-five-theses",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did Martin Luther circulate the Ninety-five Theses?",
    answer: 1517,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Encyclopaedia Britannica — Ninety-five Theses",
      url: "https://www.britannica.com/event/Ninety-five-Theses",
    },
    explanation:
      "Luther circulated the Ninety-five Theses in 1517, a landmark of the Protestant Reformation.",
  },
  {
    id: "history-event-spanish-armada",
    category: "history",
    subtype: "event",
    prompt: "In what year did the Spanish Armada campaign take place?",
    answer: 1588,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Royal Museums Greenwich — The Spanish Armada",
      url: "https://www.rmg.co.uk/stories/topics/spanish-armada-history-causes-timeline",
    },
    explanation:
      "Philip II's Spanish Armada sailed against England in 1588 and failed to achieve its invasion aims.",
  },
  {
    id: "history-event-gunpowder-plot",
    category: "history",
    subtype: "event",
    prompt: "In what year was the Gunpowder Plot uncovered?",
    answer: 1605,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "UK Parliament — The Gunpowder Plot of 1605",
      url: "https://www.parliament.uk/about/living-heritage/evolutionofparliament/parliamentaryauthority/the-gunpowder-plot-of-1605/",
    },
    explanation:
      "The plot to destroy the House of Lords was uncovered on 5 November 1605.",
  },
  {
    id: "history-event-jamestown-founded",
    category: "history",
    subtype: "event",
    prompt:
      "In what year was Jamestown, the first permanent English settlement in North America, founded?",
    answer: 1607,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "U.S. National Park Service — Jamestown and Plymouth",
      url: "https://www.nps.gov/jame/learn/historyculture/jamestown-and-plymouth-compare-and-contrast.htm",
    },
    explanation:
      "English settlers founded Jamestown in Virginia in 1607.",
  },
  {
    id: "history-event-plymouth-founded",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the Mayflower settlers establish Plymouth Colony?",
    answer: 1620,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "U.S. National Park Service — Jamestown and Plymouth",
      url: "https://www.nps.gov/jame/learn/historyculture/jamestown-and-plymouth-compare-and-contrast.htm",
    },
    explanation:
      "The Mayflower settlers landed and established Plymouth Colony in 1620.",
  },
  {
    id: "history-event-great-fire-london",
    category: "history",
    subtype: "event",
    prompt: "In what year did the Great Fire of London begin?",
    answer: 1666,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "London Museum — The Great Fire of London",
      url: "https://www.londonmuseum.org.uk/collections/london-stories/great-fire-of-london/",
    },
    explanation:
      "The Great Fire began in September 1666 and burned for four days.",
  },
  {
    id: "history-event-us-declaration-independence",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the Continental Congress adopt the U.S. Declaration of Independence?",
    answer: 1776,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "U.S. National Archives — Declaration of Independence",
      url: "https://www.archives.gov/milestone-documents/declaration-of-independence",
    },
    explanation:
      "The Continental Congress adopted the Declaration on 4 July 1776.",
  },
  {
    id: "history-event-french-revolution-begins",
    category: "history",
    subtype: "event",
    prompt: "In what year did the French Revolution begin?",
    answer: 1789,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Encyclopaedia Britannica — French Revolution",
      url: "https://www.britannica.com/event/French-Revolution",
    },
    explanation:
      "The French Revolution began in 1789 amid political, social, and financial crisis.",
  },
  {
    id: "history-event-haitian-independence",
    category: "history",
    subtype: "event",
    prompt: "In what year did Haiti declare independence from France?",
    answer: 1804,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Encyclopaedia Britannica — Haitian Revolution",
      url: "https://www.britannica.com/topic/Haitian-Revolution",
    },
    explanation:
      "Haiti declared independence in 1804 after the successful Haitian Revolution.",
  },
  {
    id: "history-event-waterloo",
    category: "history",
    subtype: "event",
    prompt: "In what year was the Battle of Waterloo fought?",
    answer: 1815,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "National Army Museum — Battle of Waterloo",
      url: "https://www.nam.ac.uk/explore/battle-waterloo",
    },
    explanation:
      "The Battle of Waterloo was fought on 18 June 1815 and ended Napoleon's return to power.",
  },
  {
    id: "history-event-stockton-darlington-railway",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the Stockton and Darlington Railway open, marking the birth of the modern public railway?",
    answer: 1825,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "National Railway Museum — Leonard Raisbeck and the Stockton & Darlington Railway",
      url: "https://www.railwaymuseum.org.uk/objects-and-stories/leonard-raisbeck",
    },
    explanation:
      "The Stockton and Darlington Railway opened on 27 September 1825.",
  },
  {
    id: "history-event-us-civil-war-begins",
    category: "history",
    subtype: "event",
    prompt: "In what year did the U.S. Civil War begin?",
    answer: 1861,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "U.S. National Park Service — Civil War Facts",
      url: "https://www.nps.gov/civilwar/facts.htm",
    },
    explanation:
      "The U.S. Civil War began in 1861 with the Confederate attack on Fort Sumter.",
  },
  {
    id: "history-event-meiji-restoration",
    category: "history",
    subtype: "event",
    prompt: "In what year did the Meiji Restoration begin in Japan?",
    answer: 1868,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Encyclopaedia Britannica — Meiji Restoration",
      url: "https://www.britannica.com/event/Meiji-Restoration",
    },
    explanation:
      "The Meiji Restoration began in 1868, restoring imperial rule and accelerating Japan's transformation.",
  },
  {
    id: "history-event-wright-first-flight",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the Wright brothers make the first successful powered, controlled airplane flight?",
    answer: 1903,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Smithsonian National Air and Space Museum — The Wright Brothers",
      url: "https://airandspace.si.edu/exhibitions/wright-brothers/online/fly/1903/",
    },
    explanation:
      "Orville and Wilbur Wright achieved powered, controlled flight at Kitty Hawk in 1903.",
  },
  {
    id: "history-event-titanic-sinks",
    category: "history",
    subtype: "event",
    prompt: "In what year did RMS Titanic sink on its maiden voyage?",
    answer: 1912,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "NOAA — RMS Titanic: History and Significance",
      url: "https://www.noaa.gov/office-of-general-counsel/gc-international-section/rms-titanic-history-and-significance",
    },
    explanation:
      "Titanic struck an iceberg and sank in the North Atlantic in April 1912.",
  },
  {
    id: "history-event-first-world-war-begins",
    category: "history",
    subtype: "event",
    prompt: "In what year did the First World War begin?",
    answer: 1914,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Imperial War Museums — How the World Went to War in 1914",
      url: "https://www.iwm.org.uk/history/how-the-world-went-to-war-in-1914",
    },
    explanation:
      "A chain of declarations of war turned the July Crisis into a global conflict in 1914.",
  },
  {
    id: "history-event-russian-revolution",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the two revolutions that ended imperial rule and brought the Bolsheviks to power occur in Russia?",
    answer: 1917,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Encyclopaedia Britannica — Russian Revolution",
      url: "https://www.britannica.com/event/Russian-Revolution",
    },
    explanation:
      "Russia's February and October Revolutions both took place in 1917.",
  },
  {
    id: "history-event-representation-people-act",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the UK Representation of the People Act give the parliamentary vote to qualifying women over 30?",
    answer: 1918,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "UK Parliament — The 1918 Representation of the People Act",
      url: "https://www.parliament.uk/about/living-heritage/transformingsociety/electionsvoting/womenvote/overview/thevote/",
    },
    explanation:
      "The 1918 Act enfranchised many women over 30; equal voting terms with men followed in 1928.",
  },
  {
    id: "history-event-penicillin-discovery",
    category: "history",
    subtype: "event",
    prompt: "In what year did Alexander Fleming discover penicillin?",
    answer: 1928,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Nobel Prize — Alexander Fleming, Facts",
      url: "https://www.nobelprize.org/prizes/medicine/1945/fleming/facts/",
    },
    explanation:
      "Fleming observed penicillin's antibacterial effect in 1928; later work made it a usable medicine.",
  },
  {
    id: "history-event-wall-street-crash",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the Wall Street stock market crash associated with Black Tuesday occur?",
    answer: 1929,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Federal Reserve History — Stock Market Crash of 1929",
      url: "https://www.federalreservehistory.org/essays/stock-market-crash-of-1929",
    },
    explanation:
      "The market collapsed across several days in October 1929, including Black Tuesday on 29 October.",
  },
  {
    id: "history-event-second-world-war-europe",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the Second World War begin in Europe with Germany's invasion of Poland?",
    answer: 1939,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "Imperial War Museums — How Europe Went to War in 1939",
      url: "https://www.iwm.org.uk/history/how-europe-went-to-war-in-1939",
    },
    explanation:
      "Germany invaded Poland on 1 September 1939; Britain and France declared war two days later.",
  },
  {
    id: "history-event-united-nations-founded",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the United Nations officially come into existence?",
    answer: 1945,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "United Nations — History of the United Nations",
      url: "https://www.un.org/en/about-us/history-of-the-un",
    },
    explanation:
      "The UN Charter came into force on 24 October 1945, officially creating the organization.",
  },
  {
    id: "history-event-sputnik-one",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did the Soviet Union launch Sputnik 1, the first artificial satellite?",
    answer: 1957,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "NASA History — From Sputnik I to Vanguard TV-3",
      url: "https://www.nasa.gov/history/sputnik/chap11.html",
    },
    explanation:
      "The Soviet Union launched Sputnik 1 into orbit on 4 October 1957.",
  },
  {
    id: "history-event-apollo-eleven",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did Apollo 11 achieve the first crewed Moon landing?",
    answer: 1969,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "NASA — Apollo 11",
      url: "https://www.nasa.gov/mission/apollo-11/",
    },
    explanation:
      "Apollo 11 landed on the Moon on 20 July 1969, and Neil Armstrong stepped onto the surface soon after.",
  },
  {
    id: "history-event-world-wide-web",
    category: "history",
    subtype: "event",
    prompt:
      "In what year did Tim Berners-Lee invent the World Wide Web while working at CERN?",
    answer: 1989,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "CERN — Where the Web Was Born",
      url: "https://home.cern/science/computing/the-birth-of-the-web/where-web-was-born/",
    },
    explanation:
      "Tim Berners-Lee proposed and invented the World Wide Web at CERN in 1989.",
  },
  {
    id: "history-event-euro-launched",
    category: "history",
    subtype: "event",
    prompt:
      "In what year was the euro launched as an accounting and electronic currency?",
    answer: 1999,
    min: 1000,
    max: 2025,
    scale: "linear",
    unit: "year",
    source: {
      title: "European Central Bank — Our Money",
      url: "https://www.ecb.europa.eu/euro/intro/html/index.en.html",
    },
    explanation:
      "The euro launched on 1 January 1999; euro banknotes and coins entered circulation in 2002.",
  },
];

export const questionBank: readonly Question[] = questions;

export const countryQuestions = questions.filter(
  (question) => question.subtype === "country",
);

export const cityQuestions = questions.filter(
  (question) => question.subtype === "city",
);

export const historyQuestions = questions.filter(
  (question) => question.subtype === "event",
);
