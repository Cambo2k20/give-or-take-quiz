export function BrandMark() {
  return (
    <svg
      className="wordmark-mark"
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="brand-mark-outer" cx="160" cy="160" r="152" />
      <circle className="brand-mark-middle" cx="160" cy="160" r="138" />
      <circle className="brand-mark-inner" cx="160" cy="160" r="108" />
      <circle className="brand-mark-core" cx="160" cy="160" r="94" />
      <g className="brand-mark-symbol">
        <rect x="143" y="83" width="34" height="94" rx="12" />
        <rect x="113" y="113" width="94" height="34" rx="12" />
        <rect x="111" y="196" width="98" height="30" rx="12" />
      </g>
    </svg>
  );
}
