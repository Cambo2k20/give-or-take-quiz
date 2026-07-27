# Give or Take design QA

## Source

- Supplied handoff: `Leaderboard and profile redesign-handoff.zip`
- Implemented selection: `Leaderboard & Profile.dc.html`
- Supporting runtime reviewed: `support.js`
- Primary reference states: `1a` mobile leaderboard, `1d` mobile profile, `2a` desktop leaderboard, `3a` desktop profile, and the `4a` Front Row palette example

## Compared states

- Dark-mode leaderboard at a desktop browser size and a roughly 600 px mobile browser size
- Dark-mode profile at a desktop browser size and the same roughly 600 px mobile browser size as the supplied mobile reference
- Default light-mode leaderboard and profile with a selected dark-only background theme inactive
- Signed-in profile populated with the real local player, category, achievement, unlock, and account data
- Leaderboard populated with the real local score rows

## Acceptance notes

- The leaderboard keeps the handoff's title/format row, scope controls, standing hero, rank treatment, compact list, and open-seat ending.
- Desktop keeps a dedicated **Form** column. It currently renders a neutral unavailable slot because the backend does not expose form history; no sample metrics were invented.
- Responsive leaderboard hides secondary table columns while preserving the rank, player, and best-score hierarchy.
- The profile keeps XP as the hero, shows all eight real subject ladders, gives achievements and backgrounds their own visible sections, and finishes with real account facts.
- Existing theme artwork and mode fallback behavior remain intact. Default light mode remains clean and readable when a dark-only background is selected.
- Focus treatment, reduced-motion behavior, empty leaderboard space, long account text, and theme availability labels remain supported by the existing application systems.

## Deliberate differences from the mock data

- Weekly XP, streaks, membership dates, achievement dates, and leaderboard form histories are omitted because the current application does not provide those values.
- The profile renders all eight real subject cards instead of the handoff's abbreviated mobile subset.
- Existing app navigation and theme controls are retained rather than replaced with non-functional mock controls.

## Verification

- `npm run lint` — passed
- `npm test -- --run` — 187 tests passed
- `npm run build` — passed, including data validation, TypeScript, and production Vite build
- Visual side-by-side review of supplied reference and implementation — passed
- Dark and default-light visual review — passed

## Unified home header

### Evidence

- Source visual truth: `C:\Users\Cambo\Documents\0.1giveortake\Home page header bar redesign.zip`, rendered from `Home.dc.html#1a`.
- Focused source capture: `C:\Users\Cambo\AppData\Local\Temp\home-page-header-redesign-handoff\reference-header.jpg`.
- Focused implementation capture: `C:\Users\Cambo\AppData\Local\Temp\home-page-header-redesign-handoff\implementation-header-dark.jpg`.
- Combined comparison input: `C:\Users\Cambo\AppData\Local\Temp\home-page-header-redesign-handoff\comparison-dark.jpg`.
- Responsive captures: `desktop-dark.jpg`, `desktop-light.jpg`, `mobile-dark.jpg`, and `mobile-light.jpg` in the same temporary QA folder.
- Source capture: 1280 × 720 pixels. Implementation capture: 1265 × 712 pixels. Both were rendered at device scale 1 and normalized to equal-width columns in the focused comparison.
- Responsive implementation frames used 1200 × 700 and 390 × 844 CSS-pixel iframes inside 1265 × 712 browser captures.
- State: signed-in player, current Daily unplayed, Past available, homepage/category phase.

### Full-view comparison

- The implementation preserves the supplied three-part hierarchy: Daily status left, a genuinely centred wordmark, and account controls right.
- The single rounded shell has the same restrained border, compact height, warm surface treatment and sticky placement as the reference.
- The additional Past control is the previously agreed functional adaptation; the Daily cluster itself replaces the visible Play button.
- At 390 × 844 the shell becomes two rows without horizontal overflow: brand/navigation first, Daily/Past second.
- Default light mode falls back to the original warm palette; dark background artwork and theme tokens remain unchanged.

### Focused fidelity review

- **Fonts and typography:** Existing Nunito and Fraunces product fonts reproduce the reference hierarchy. Daily labels, date, wordmark and controls retain readable optical weights without wrapping.
- **Spacing and layout rhythm:** The balanced desktop grid keeps the wordmark centred; mobile spacing, 22px shell radius and 44px-class touch targets remain intact at 390px.
- **Colors and tokens:** The header uses only existing semantic surface, line, accent, ink and muted tokens. No theme palette or artwork token changed.
- **Image and asset fidelity:** The reference contains no raster artwork or bespoke icon asset in the header. Existing product mark and existing theme/flame icons were reused; no new placeholder asset was introduced.
- **Copy and content:** Daily, compact date, streak, Past, Leaderboard/Board, account name and theme labels match real application state. The score remains in the replay button's accessible name rather than adding visible density.

### Interaction and accessibility checks

- Daily starts the correct five-question round and switches back to the standard in-game header.
- Past opens the existing archive.
- Brand, leaderboard, account and theme controls retain their original destinations and behavior.
- Daily exposes distinct Play and Replay accessible names; Replay includes the saved score.
- Past is omitted when no archives exist, and leaderboard/account controls are omitted when that feature is disabled.
- Keyboard focus uses the existing global focus ring; reduced-motion behavior remains inherited from the existing global rule.

### Findings and comparison history

- Initial focused comparison found one P2 accessibility mismatch: the Daily, Past and navigation controls measured 40–42px rather than the planned 44px touch target.
- The controls were raised to a 44px minimum and desktop/mobile captures were refreshed in both modes. The post-fix evidence shows the larger targets still fit without wrapping or horizontal overflow.
- The final comparison found no remaining actionable P0, P1 or P2 implementation mismatch.
- The first comparison page cropped the source too high; the temporary comparison crop was normalized and captured again. This was evidence normalization only and required no product-code change.
- Accepted P3 difference: Past is visible beside the Daily action, as chosen to retain archive access.
- No additional focused crop was needed after the header-only comparison because all typography, controls, borders and spacing were readable at the captured scale.

### Verification

- `npm run lint` — passed.
- `npm test -- --run` — 14 files and 187 tests passed.
- `npm run build` — passed, including data validation, TypeScript and production Vite output.

final result: passed
