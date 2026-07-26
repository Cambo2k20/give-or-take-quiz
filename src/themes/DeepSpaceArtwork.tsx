type DeepSpaceArtworkProps = {
  variant: "preview" | "backdrop";
  locked?: boolean;
};

/** Deep Space's artwork piece: one component supplies its gallery preview and
 * its full-viewport backdrop, while deep-space.css owns every visual rule. */
export function DeepSpaceArtwork({
  variant,
  locked = false,
}: DeepSpaceArtworkProps) {
  if (variant === "preview") {
    return (
      <div
        className={`theme-preview${locked ? " is-locked" : ""}`}
        aria-hidden="true"
      >
        <span className="theme-preview-glow" />
        <span className="theme-preview-stars" />
        <span className="theme-preview-stars theme-preview-stars-b" />
        <span className="theme-preview-shooting-star" />
        <span className="theme-preview-vignette" />
        <span className="theme-preview-orbit" />
        {locked && (
          <span className="theme-preview-lock">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path
                d="M8 11V7a4 4 0 0 1 8 0v4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="cosmic-layer" aria-hidden="true">
      <span className="cosmic-glow" />
      <span className="cosmic-stars" />
      <span className="cosmic-stars cosmic-stars-b" />
      <span className="cosmic-shooting-star" />
      <span className="cosmic-vignette" />
      <span className="cosmic-orbit" />
    </div>
  );
}
