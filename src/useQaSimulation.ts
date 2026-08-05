import { useCallback, useEffect, useState } from "react";
import {
  fetchQaSimulation,
  saveQaSimulation,
  type QaSimulation,
} from "../lib/qaSimulation";

export function useQaSimulation(userId: string | null, enabled: boolean) {
  const [loaded, setLoaded] = useState<{
    userId: string;
    simulation: QaSimulation;
  } | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "saving" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    let cancelled = false;

    fetchQaSimulation()
      .then((simulation) => {
        if (cancelled) return;
        setLoaded({ userId, simulation });
        setStatus("ready");
      })
      .catch((cause) => {
        if (cancelled) return;
        setStatus("error");
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load QA simulation.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled, userId]);

  const save = useCallback(
    async (simulation: QaSimulation): Promise<QaSimulation> => {
      if (!enabled || !userId) {
        throw new Error("QA simulation is unavailable.");
      }
      setStatus("saving");
      setError("");
      try {
        const saved = await saveQaSimulation(simulation);
        setLoaded({ userId, simulation: saved });
        setStatus("ready");
        return saved;
      } catch (cause) {
        setStatus("error");
        const message =
          cause instanceof Error
            ? cause.message
            : "Could not save QA simulation.";
        setError(message);
        throw new Error(message);
      }
    },
    [enabled, userId],
  );

  const retry = useCallback(() => {
    setStatus("loading");
    setError("");
    setAttempt((value) => value + 1);
  }, []);
  const simulation =
    userId && loaded?.userId === userId ? loaded.simulation : null;
  const visibleStatus =
    enabled && userId && !simulation && status !== "error"
      ? "loading"
      : status;

  return {
    simulation,
    status: !enabled || !userId ? ("idle" as const) : visibleStatus,
    error: !enabled || !userId ? "" : error,
    save,
    retry,
  };
}
