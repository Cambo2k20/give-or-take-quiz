/**
 * The real, full-viewport "Deep Space" background — close to the fidelity of
 * the reference it was built from, unlike the small Unlocks-screen preview,
 * which is deliberately scaled down and cannot reproduce the same soft wash
 * (see the comment on .theme-preview in globals.css for why).
 *
 * Always mounted, visibility entirely owned by CSS keyed off
 * `data-bg-theme` on <html> (see lib/backgroundTheme.ts): this component
 * never decides whether it is shown, so there is nothing here to keep in
 * sync with the equip logic living in Game.tsx.
 */
export function CosmicLayer() {
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
