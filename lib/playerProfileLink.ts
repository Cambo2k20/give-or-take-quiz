export type PlayerProfileReturnState = {
  phase: "leaderboard" | "account";
  format: "classic" | "daily" | "survival";
  category: string;
};

const RETURN_STATE_KEY = "giveOrTakeProfileReturn";

export function playerProfileReturnState(
  state: unknown = window.history.state,
): PlayerProfileReturnState | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as Record<string, unknown>)[RETURN_STATE_KEY];
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.phase !== "leaderboard" && row.phase !== "account") return null;
  if (
    row.format !== "classic" &&
    row.format !== "daily" &&
    row.format !== "survival"
  ) return null;
  if (typeof row.category !== "string") return null;
  return {
    phase: row.phase,
    format: row.format,
    category: row.category,
  };
}

export function playerIdFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("player");
  } catch {
    return null;
  }
}

export function playerProfileShareUrl(playerId: string, currentUrl: string) {
  const url = new URL(currentUrl);
  url.searchParams.delete("challenge");
  url.searchParams.set("player", playerId);
  return url.toString();
}

export function pushPlayerProfileLink(
  playerId: string | null,
  returnState?: PlayerProfileReturnState,
) {
  const url = new URL(window.location.href);
  url.searchParams.delete("challenge");
  if (playerId) url.searchParams.set("player", playerId);
  else url.searchParams.delete("player");
  const state = returnState
    ? { ...(window.history.state ?? {}), [RETURN_STATE_KEY]: returnState }
    : (window.history.state ?? {});
  if (returnState) {
    window.history.replaceState(state, "", window.location.href);
  }
  window.history.pushState(state, "", url);
}

export function replacePlayerProfileLink(playerId: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.delete("challenge");
  if (playerId) url.searchParams.set("player", playerId);
  else url.searchParams.delete("player");
  window.history.replaceState(window.history.state ?? {}, "", url);
}
