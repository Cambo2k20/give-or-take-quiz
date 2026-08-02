export function challengeIdFromUrl(url: string): string | null {
  const value = new URL(url).searchParams.get("challenge");
  return value?.trim() || null;
}

export function challengeShareUrl(challengeId: string, baseUrl: string): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("challenge", challengeId);
  return url.toString();
}

export function replaceChallengeLink(challengeId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (challengeId) url.searchParams.set("challenge", challengeId);
  else url.searchParams.delete("challenge");
  window.history.replaceState({}, "", url);
}
