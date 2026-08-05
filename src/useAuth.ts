import { useCallback, useEffect, useState } from "react";
import {
  type AuthUser,
  currentQaAccountCapability,
  currentUser,
  onAuthChange,
} from "../lib/auth";
import { leaderboardEnabled } from "../lib/supabase";

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "error";
export type QaCapabilityStatus =
  | "idle"
  | "loading"
  | "qa"
  | "not-qa"
  | "error";

/**
 * Tracks who is signed in. Supabase restores a stored session without a
 * network call, so this settles on the first render for a returning player and
 * never blocks the game: guests simply stay signed out.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    leaderboardEnabled ? "loading" : "signed-out",
  );
  // Set when someone follows a password reset link, so the UI can offer to
  // choose a new password instead of the normal sign-in form.
  const [recovering, setRecovering] = useState(false);
  const [qaCapability, setQaCapability] = useState<{
    userId: string;
    status: "qa" | "not-qa" | "error";
  } | null>(null);
  const [qaAttempt, setQaAttempt] = useState(0);

  useEffect(() => {
    if (!leaderboardEnabled) return;
    let cancelled = false;

    currentUser()
      .then((found) => {
        if (cancelled) return;
        setUser(found);
        setStatus(found ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    const unsubscribe = onAuthChange((next, event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
      if (!next) setQaCapability(null);
      setUser(next);
      setStatus(next ? "signed-in" : "signed-out");
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const qaStatus: QaCapabilityStatus =
    status !== "signed-in" || !user
      ? "idle"
      : qaCapability?.userId === user.id
        ? qaCapability.status
        : "loading";

  useEffect(() => {
    if (!leaderboardEnabled || !user) return;
    let cancelled = false;

    currentQaAccountCapability()
      .then((isQa) => {
        if (!cancelled) {
          setQaCapability({ userId: user.id, status: isQa ? "qa" : "not-qa" });
        }
      })
      .catch(() => {
        // Fail closed for competitive client features. Phase 1 remains the
        // authoritative server guard if a stale client still attempts a write.
        if (!cancelled) setQaCapability({ userId: user.id, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [user, qaAttempt]);

  const endRecovery = useCallback(() => setRecovering(false), []);
  const retryQaCapability = useCallback(() => {
    if (!user) return;
    setQaCapability((current) =>
      current?.userId === user.id ? null : current,
    );
    setQaAttempt((attempt) => attempt + 1);
  }, [user]);

  const signedIn = status === "signed-in" && Boolean(user);
  const emailConfirmed = Boolean(user?.emailConfirmed);
  const capabilityResolved = qaStatus === "qa" || qaStatus === "not-qa";
  const isOrdinary = qaStatus === "not-qa";

  return {
    enabled: leaderboardEnabled,
    status,
    user,
    qaStatus,
    isQa: qaStatus === "qa",
    /** A profile row is account identity, independent of competitive access. */
    canUseAccountIdentity:
      signedIn && emailConfirmed && capabilityResolved,
    /** Server-backed scores require a confirmed, explicitly ordinary caller. */
    canSubmitCompetitiveScores:
      signedIn && emailConfirmed && isOrdinary,
    /** Friends and challenges remain a competitive feature. */
    canUseSocialCompetition:
      signedIn && emailConfirmed && isOrdinary,
    /** Never write local results while auth or QA capability is unresolved. */
    canPersistLocalScores:
      status === "signed-out" || (signedIn && isOrdinary),
    retryQaCapability,
    recovering,
    endRecovery,
  };
}
