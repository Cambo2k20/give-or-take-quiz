import { generatedQuestions } from "./questions.generated";
import type { Question } from "./types";

/**
 * A local, deterministic question bank covering every category the game can
 * draw from. Postgres is the source of truth; this file re-exports the
 * committed output of `npm run generate:questions`, so dealing a round needs
 * no network and `npm run validate:data` still checks the bank at build time.
 *
 * Population figures are fixed snapshots rather than live values. Country
 * questions use the UN DESA World Population Prospects 2024 midyear series,
 * whose underlying definition is the de facto population of the whole country.
 * City questions use the 2020 U.S. decennial census count for the legally
 * incorporated city ("city proper"), not an urban area or metro.
 */
export const questions: readonly Question[] = generatedQuestions;
