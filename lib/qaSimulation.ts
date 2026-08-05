import { PLAYABLE_CATEGORIES } from "./game";
import { supabase } from "./supabase";
import type { QuestionCategory } from "./types";

export type QaCategoryRanks = Record<QuestionCategory, number>;

export type QaSimulation = {
  categoryRanks: QaCategoryRanks;
  simulateAllAchievements: boolean;
};

function client() {
  if (!supabase) throw new Error("QA simulation is not configured.");
  return supabase;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapSimulation(value: unknown): QaSimulation {
  const row = object(value);
  const rawRanks = object(row.category_ranks);
  const categoryRanks = Object.fromEntries(
    PLAYABLE_CATEGORIES.map((category) => {
      const rank = Number(rawRanks[category]);
      if (!Number.isInteger(rank) || rank < 1 || rank > 30) {
        throw new Error(`QA simulation returned an invalid ${category} rank.`);
      }
      return [category, rank];
    }),
  ) as QaCategoryRanks;

  return {
    categoryRanks,
    simulateAllAchievements: row.simulate_all_achievements === true,
  };
}

export async function fetchQaSimulation(): Promise<QaSimulation> {
  const { data, error } = await client().rpc("get_qa_simulation");
  if (error) throw new Error(error.message);
  return mapSimulation(data);
}

export async function saveQaSimulation(
  simulation: QaSimulation,
): Promise<QaSimulation> {
  const { data, error } = await client().rpc("update_qa_simulation", {
    p_category_ranks: simulation.categoryRanks,
    p_simulate_all_achievements: simulation.simulateAllAchievements,
  });
  if (error) throw new Error(error.message);
  return mapSimulation(data);
}
