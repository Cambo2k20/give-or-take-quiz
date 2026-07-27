import type { BackgroundThemeId } from "../../lib/themes";
import type {
  ThemeArtworkProps,
  ThemeArtworkStyle,
} from "./ThemeArtwork";
import "./aurora-drift.css";

export const themeId = "aurora-drift" satisfies BackgroundThemeId;

function LockMark() {
  return (
    <span className="aurora-drift__lock">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/**
 * Aurora Drift keeps the selected 1c composition intact: a teal-black sky,
 * violet and emerald atmosphere, two slow aurora ribbons, sparse stars and
 * two infrequent luminous meteors.
 */
export default function AuroraDriftArtwork({
  variant,
  locked = false,
  tokens,
}: ThemeArtworkProps) {
  const tokenStyle = tokens as ThemeArtworkStyle;
  const rootClassName = [
    "aurora-drift",
    `aurora-drift--${variant}`,
    locked ? "is-locked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} aria-hidden="true" style={tokenStyle}>
      <span className="aurora-drift__scene">
        <span className="aurora-drift__glow aurora-drift__glow--violet" />
        <span className="aurora-drift__glow aurora-drift__glow--emerald" />
        <span className="aurora-drift__ribbon aurora-drift__ribbon--upper" />
        <span className="aurora-drift__ribbon aurora-drift__ribbon--lower" />
        <span className="aurora-drift__stars" />
        <span className="aurora-drift__stars aurora-drift__stars--bright" />
        <span className="aurora-drift__meteor aurora-drift__meteor--one" />
        <span className="aurora-drift__meteor aurora-drift__meteor--two" />
        <span className="aurora-drift__vignette" />
      </span>
      {locked && <LockMark />}
    </div>
  );
}
