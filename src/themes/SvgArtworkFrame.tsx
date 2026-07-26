import type { ReactElement, ReactNode } from "react";
import type { ThemeArtworkProps, ThemeArtworkStyle } from "./ThemeArtwork";

type SvgArtworkFrameProps = ThemeArtworkProps & {
  children: ReactElement<SVGSVGElement>;
  className: string;
  motionStyles?: ReactNode;
};

/**
 * Shared frame for viewBox-authored themes. Atmosphere stays in CSS while the
 * single inline SVG owns every structural relationship.
 */
export function SvgArtworkFrame({
  children,
  className,
  locked = false,
  motionStyles,
  tokens,
  variant,
}: SvgArtworkFrameProps) {
  const tokenStyle = tokens as ThemeArtworkStyle;

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
      <span className="svg-theme-artwork__wash svg-theme-artwork__wash--one" />
      <span className="svg-theme-artwork__wash svg-theme-artwork__wash--two" />
      <span className="svg-theme-artwork__wash svg-theme-artwork__wash--three" />
      {children}
      <span className="svg-theme-artwork__vignette" />
      {locked && <span className="svg-theme-artwork__lock">Locked</span>}
      {motionStyles}
    </div>
  );
}
