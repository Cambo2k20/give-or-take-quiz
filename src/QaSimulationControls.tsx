import { useState, type ReactNode } from "react";
import { PLAYABLE_CATEGORIES } from "../lib/game";
import type {
  QaCategoryRanks,
  QaSimulation,
} from "../lib/qaSimulation";
import type { QuestionCategory } from "../lib/types";

const PRESETS = [1, 5, 10, 15, 20, 25, 30] as const;

function ranksAt(rank: number): QaCategoryRanks {
  return Object.fromEntries(
    PLAYABLE_CATEGORIES.map((category) => [category, rank]),
  ) as QaCategoryRanks;
}

export function QaSimulationControls({
  simulation,
  status,
  error,
  labels,
  onSave,
  onRetry,
}: {
  simulation: QaSimulation | null;
  status: "idle" | "loading" | "ready" | "saving" | "error";
  error: string;
  labels: Record<QuestionCategory, { title: string; icon: ReactNode }>;
  onSave: (simulation: QaSimulation) => Promise<void>;
  onRetry: () => void;
}) {
  const [edited, setEdited] = useState<QaSimulation | null>(null);
  const [message, setMessage] = useState("");
  const draft = edited ?? simulation;

  if (status === "error" && !simulation) {
    return (
      <section className="qa-simulation-panel">
        <p className="eyebrow">QA Simulation</p>
        <h2>Simulation unavailable</h2>
        <p className="is-error" role="alert">{error}</p>
        <button type="button" onClick={onRetry}>Retry</button>
      </section>
    );
  }

  if (!draft || status === "loading" || status === "idle") {
    return (
      <section className="qa-simulation-panel" aria-busy="true">
        <p className="eyebrow">QA Simulation</p>
        <h2>Loading simulated progression…</h2>
      </section>
    );
  }

  function setAll(rank: number) {
    setEdited((current) => ({
      categoryRanks: ranksAt(rank),
      simulateAllAchievements:
        current?.simulateAllAchievements ??
        draft?.simulateAllAchievements ??
        true,
    }));
    setMessage("");
  }

  function applyPresetAndSave(
    rank: number,
    simulateAllAchievements: boolean,
  ) {
    const next = {
      categoryRanks: ranksAt(rank),
      simulateAllAchievements,
    };
    setEdited(next);
    void persist(next);
  }

  async function persist(next: QaSimulation) {
    if (status === "saving") return;
    setMessage("");
    try {
      await onSave(next);
      setMessage("Simulation saved.");
    } catch {
      // The hook owns the server error shown below.
    }
  }

  async function save() {
    if (!draft) return;
    await persist(draft);
  }

  return (
    <section className="qa-simulation-panel" aria-labelledby="qa-simulation-title">
      <div className="qa-simulation-heading">
        <div>
          <p className="eyebrow">QA Simulation</p>
          <h2 id="qa-simulation-title">Progression controls</h2>
        </div>
        <span>Server-backed · scoreless</span>
      </div>
      <p>
        Change presentation-only ranks and unlocks. No rounds, scores, real XP,
        streaks, friendships or challenges are created.
      </p>

      <div className="qa-simulation-primary-actions">
        <button
          type="button"
          onClick={() => applyPresetAndSave(30, true)}
        >
          Max account
        </button>
        <button
          type="button"
          onClick={() => applyPresetAndSave(1, false)}
        >
          Reset simulation
        </button>
      </div>

      <fieldset className="qa-rank-presets">
        <legend>Set every category</legend>
        <div>
          {PRESETS.map((rank) => (
            <button key={rank} type="button" onClick={() => setAll(rank)}>
              Rank {rank}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="qa-category-ranks">
        {PLAYABLE_CATEGORIES.map((category) => (
          <label key={category}>
            <span>{labels[category].title}</span>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={draft.categoryRanks[category]}
              onChange={(event) => setEdited((current) => ({
                ...(current ?? draft),
                categoryRanks: {
                  ...(current ?? draft).categoryRanks,
                  [category]: Number(event.target.value),
                },
              }))}
              aria-label={`${labels[category].title} simulated rank`}
            />
            <output>{draft.categoryRanks[category]}</output>
          </label>
        ))}
      </div>

      <label className="qa-achievement-toggle">
        <input
          type="checkbox"
          checked={draft.simulateAllAchievements}
          onChange={(event) => setEdited((current) => ({
            ...(current ?? draft),
            simulateAllAchievements: event.target.checked,
          }))}
        />
        <span>
          <strong>Simulate all achievements</strong>
          <small>Displays all achievements as simulated, never earned.</small>
        </span>
      </label>

      <div className="qa-simulation-save-row">
        <button
          type="button"
          className="primary-button"
          disabled={status === "saving"}
          onClick={() => void save()}
        >
          {status === "saving" ? "Saving…" : "Save simulation"}
        </button>
        <p role="status" className={error ? "is-error" : ""}>
          {error || message}
        </p>
      </div>
    </section>
  );
}
