export const RANK_FLOORS = [5, 10, 15, 20, 25, 30] as const;

export type RankFloor = (typeof RANK_FLOORS)[number];
export type CategoryAvailability = "live" | "incubating";

/**
 * The single catalogue for every subject the client understands.
 *
 * Availability is deliberately independent from the database enum: a client
 * can understand an incubating category and its assets without offering it in
 * production games, progression, leaderboards or challenge setup.
 */
export const CATEGORY_REGISTRY = [
  {
    id: "population",
    label: "Population",
    description: "How many people live in a country, a city, or online.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "People Watcher" },
      { rank: 10, title: "Crowd Counter" },
      { rank: 15, title: "Census Scout" },
      { rank: 20, title: "Demography Detective" },
      { rank: 25, title: "Population Expert" },
      { rank: 30, title: "Sage of the Census" },
    ],
  },
  {
    id: "history",
    label: "History",
    description: "Place turning points on the timeline, and price the past.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Time Tourist" },
      { rank: 10, title: "Past Pupil" },
      { rank: 15, title: "Chronicle Keeper" },
      { rank: 20, title: "Era Expert" },
      { rank: 25, title: "Timeline Sage" },
      { rank: 30, title: "Master of Ages" },
    ],
  },
  {
    id: "geography",
    label: "Geography",
    description: "Oceans, deserts, mountains and the shape of the land.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Globe Gazer" },
      { rank: 10, title: "Terrain Tracker" },
      { rank: 15, title: "Atlas Scholar" },
      { rank: 20, title: "Meridian Master" },
      { rank: 25, title: "Famed Pathfinder" },
      { rank: 30, title: "Master of the Earth" },
    ],
  },
  {
    id: "science",
    label: "Science",
    description: "Physics, chemistry and the workings of the human body.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Curious Mind" },
      { rank: 10, title: "Lab Assistant" },
      { rank: 15, title: "Theory Tester" },
      { rank: 20, title: "Formula Finder" },
      { rank: 25, title: "Master of Matter" },
      { rank: 30, title: "Architect of Reality" },
    ],
  },
  {
    id: "animals",
    label: "Animals",
    description: "What they weigh, how fast they run, how long they carry.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Creature Curious" },
      { rank: 10, title: "Wildlife Tracker" },
      { rank: 15, title: "Species Specialist" },
      { rank: 20, title: "Creature Connoisseur" },
      { rank: 25, title: "Beast Whisperer" },
      { rank: 30, title: "Guardian of the Wild" },
    ],
  },
  {
    id: "space",
    label: "Space",
    description: "Orbits, planets and the machines we have sent up there.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Stargazer" },
      { rank: 10, title: "Orbit Scout" },
      { rank: 15, title: "Planet Pathfinder" },
      { rank: 20, title: "Cosmic Navigator" },
      { rank: 25, title: "Galactic Sage" },
      { rank: 30, title: "Oracle of the Cosmos" },
    ],
  },
  {
    id: "technology",
    label: "Technology",
    description: "The tallest, heaviest and fastest things we have built.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Tinkerer" },
      { rank: 10, title: "Gadget Scout" },
      { rank: 15, title: "Machine Maker" },
      { rank: 20, title: "Engineering Expert" },
      { rank: 25, title: "Master Inventor" },
      { rank: 30, title: "Titan of Technology" },
    ],
  },
  {
    id: "movies",
    label: "Movies",
    description: "When films landed, and what they took at the box office.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Casual Viewer" },
      { rank: 10, title: "Film Fan" },
      { rank: 15, title: "Screen Scholar" },
      { rank: 20, title: "Movie Maestro" },
      { rank: 25, title: "Cinema Savant" },
      { rank: 30, title: "Legend of the Silver Screen" },
    ],
  },
  {
    id: "dinosaurs",
    label: "Dinosaurs",
    description: "Dinosaurs, fossils, trackways and the Mesozoic world.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Fossil Finder" },
      { rank: 10, title: "Trackway Tracker" },
      { rank: 15, title: "Bone Detective" },
      { rank: 20, title: "Mesozoic Scholar" },
      { rank: 25, title: "Paleo Supreme" },
      { rank: 30, title: "Titan of Prehistory" },
    ],
  },
  {
    id: "games",
    label: "Games",
    description: "Video, board, card, tabletop and competitive games.",
    availability: "live",
    rankTitles: [
      { rank: 5, title: "Rookie Gamer" },
      { rank: 10, title: "Level Navigator" },
      { rank: 15, title: "Achievement Hunter" },
      { rank: 20, title: "Elite Player" },
      { rank: 25, title: "Ranked Royalty" },
      { rank: 30, title: "Icon of Gaming" },
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  availability: CategoryAvailability;
  rankTitles: readonly { rank: RankFloor; title: string }[];
}[];

export type QuestionCategory = (typeof CATEGORY_REGISTRY)[number]["id"];
export type CategoryDefinition = (typeof CATEGORY_REGISTRY)[number];

export const ALL_CATEGORIES = CATEGORY_REGISTRY.map(
  (category) => category.id,
) as readonly QuestionCategory[];

export const LIVE_CATEGORIES = CATEGORY_REGISTRY.filter(
  (category) => category.availability === "live",
).map((category) => category.id) as readonly QuestionCategory[];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORY_REGISTRY.map((category) => [category.id, category]),
) as Record<QuestionCategory, CategoryDefinition>;

const ALL_CATEGORY_SET: ReadonlySet<string> = new Set(ALL_CATEGORIES);
const LIVE_CATEGORY_SET: ReadonlySet<string> = new Set(LIVE_CATEGORIES);

export function isQuestionCategory(value: unknown): value is QuestionCategory {
  return typeof value === "string" && ALL_CATEGORY_SET.has(value);
}

export function isLiveCategory(value: unknown): value is QuestionCategory {
  return typeof value === "string" && LIVE_CATEGORY_SET.has(value);
}

export function isIncubatingOverrideEnabled(
  mode: string | undefined,
  flag: string | undefined,
): boolean {
  return mode === "development" && flag === "true";
}

export function getPlayableCategories(
  questionCounts: Readonly<Partial<Record<QuestionCategory, number>>>,
  options: { mode?: string; enableIncubating?: string } = {},
): readonly QuestionCategory[] {
  const includeIncubating = isIncubatingOverrideEnabled(
    options.mode,
    options.enableIncubating,
  );

  return CATEGORY_REGISTRY.filter(
    (category) =>
      category.availability === "live" ||
      (includeIncubating && (questionCounts[category.id] ?? 0) >= 5),
  ).map((category) => category.id);
}
