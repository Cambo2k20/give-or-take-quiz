import type { ReactElement } from "react";
import type { ThemeArtworkProps, ThemeArtworkStyle } from "./ThemeArtwork";

type SvgArtworkFrameProps = ThemeArtworkProps & {
  children: ReactElement<SVGSVGElement>;
  className: string;
  washCount?: 0 | 1 | 2 | 3;
};

const WASH_NAMES = ["one", "two", "three"] as const;

/**
 * Shared frame for viewBox-authored themes. Atmosphere stays in CSS while the
 * single inline SVG owns every structural relationship.
 */
export function SvgArtworkFrame({
  children,
  className,
  locked = false,
  tokens,
  variant,
  washCount = 3,
}: SvgArtworkFrameProps) {
  const tokenStyle = tokens as ThemeArtworkStyle;
  const washes = Array.from({ length: washCount }, (_, index) => (
    <span
      className={[
        "svg-theme-artwork__wash",
        `svg-theme-artwork__wash--${WASH_NAMES[index]}`,
      ].join(" ")}
      key={index}
    />
  ));

  return (
    <div
      className={[
        "svg-theme-artwork",
        `svg-theme-artwork--${variant}`,
        className,
        locked ? "is-locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
      style={tokenStyle}
    >
      {washes}
      {children}
      <span className="svg-theme-artwork__vignette" />
      {locked && <span className="svg-theme-artwork__lock">Locked</span>}
    </div>
  );
}
