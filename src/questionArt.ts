import type { QuestionCategory } from "../lib/categories";
import type { Question } from "../lib/types";
import manifest from "./assets/question-art/manifest.json";

type ManifestEntry = { slug: string; label: string | null; file: string };

const artworkModules = import.meta.glob<string>(
  "./assets/question-art/*/*.webp",
  { eager: true, import: "default", query: "?url" },
);

const QUESTION_ART_CATEGORIES = [
  "dinosaurs",
  "history",
  "geography",
  "space",
] as const;

type QuestionArtCategory = (typeof QUESTION_ART_CATEGORIES)[number];

function isQuestionArtCategory(
  category: QuestionCategory,
): category is QuestionArtCategory {
  return (QUESTION_ART_CATEGORIES as readonly string[]).includes(category);
}

type PoolEntry = { url: string; label: string | null };

function urlFor(category: string, file: string): string {
  const path = `./assets/question-art/${category}/${file}`;
  const url = artworkModules[path];
  if (!url) throw new Error(`Missing question art asset: ${path}`);
  return url;
}

const POOLS = Object.fromEntries(
  QUESTION_ART_CATEGORIES.map((category) => [
    category,
    ((manifest as Record<string, ManifestEntry[]>)[category] ?? []).map(
      (entry): PoolEntry => ({
        url: urlFor(category, entry.file),
        label: entry.label,
      }),
    ),
  ]),
) as Record<QuestionArtCategory, PoolEntry[]>;

/** Stable across renders: the same question always lands on the same art. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

export type QuestionArtPick = { primary: string; secondary: string };

/**
 * Two-image watermark pair for a question card, drawn from that category's
 * illustrated pool. When the prompt or explanation names one of the pool's
 * specific subjects (e.g. "Triceratops", "Eiffel Tower"), that piece leads;
 * a second, distinct piece fills the layered background slot. Categories
 * without an illustrated pool return null so the caller falls back to the
 * generic line-icon artwork.
 */
export function pickQuestionArt(question: Question): QuestionArtPick | null {
  if (!isQuestionArtCategory(question.category)) return null;
  const pool = POOLS[question.category];
  if (pool.length === 0) return null;

  const haystack = `${question.prompt} ${question.explanation}`.toLowerCase();
  const matchIndex = pool.findIndex(
    (entry) => entry.label && haystack.includes(entry.label.toLowerCase()),
  );

  const hash = hashString(question.id);
  const primaryIndex = matchIndex >= 0 ? matchIndex : hash % pool.length;
  const secondaryOffset = 1 + (hash % Math.max(1, pool.length - 1));
  const secondaryIndex = (primaryIndex + secondaryOffset) % pool.length;

  return {
    primary: pool[primaryIndex].url,
    secondary: pool[secondaryIndex].url,
  };
}
