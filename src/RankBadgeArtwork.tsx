import { rankBadgeArtworkUrl } from "./rankBadges";

export function RankBadgeArtwork({
  badgeKey,
  className,
  eager = false,
}: {
  badgeKey: string | null | undefined;
  className?: string;
  eager?: boolean;
}) {
  const source = badgeKey ? rankBadgeArtworkUrl(badgeKey) : null;

  if (!source) {
    return (
      <span
        className={["rank-badge-artwork", "is-placeholder", className]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" />
          <rect x="16" y="22" width="16" height="13" rx="3" />
          <path d="M19 22v-4a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
    );
  }

  return (
    <img
      className={["rank-badge-artwork", className].filter(Boolean).join(" ")}
      src={source}
      alt=""
      aria-hidden="true"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}
