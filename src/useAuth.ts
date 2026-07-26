import { useCallback, useEffect, useState } from "react";
import { type AuthUser, currentUser, onAuthChange } from "../lib/auth";
import { leaderboardEnabled } from "../lib/supabase";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

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
        if (!cancelled) setStatus("signed-out");
      });

    const unsubscribe = onAuthChange((next, event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
      setUser(next);
      setStatus(next ? "signed-in" : "signed-out");
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const endRecovery = useCallback(() => setRecovering(false), []);

  return {
    enabled: leaderboardEnabled,
    status,
    user,
    /** Signed in and confirmed, so allowed a leaderboard identity. */
    canUseLeaderboard: status === "signed-in" && Boolean(user?.emailConfirmed),
    recovering,
    endRecovery,
  };
}
