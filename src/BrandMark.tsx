import type { CSSProperties } from "react";
import accentMaskUrl from "./assets/brand/give-or-take-mark-accent.png";
import neutralMaskUrl from "./assets/brand/give-or-take-mark-neutral.png";

type BrandMarkStyle = CSSProperties & {
  "--brand-mark-accent-mask": string;
  "--brand-mark-neutral-mask": string;
};

const brandMarkStyle: BrandMarkStyle = {
  "--brand-mark-accent-mask": `url("${accentMaskUrl}")`,
  "--brand-mark-neutral-mask": `url("${neutralMaskUrl}")`,
};

export function BrandMark() {
  return (
    <span
      className="wordmark-mark"
      style={brandMarkStyle}
      aria-hidden="true"
    />
  );
}
