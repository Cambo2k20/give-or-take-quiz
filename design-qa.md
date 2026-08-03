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

## Adaptive brand mark

### Evidence

- Source visual truth: `C:\Users\Cambo\.codex\generated_images\019f9dfa-7a75-7d93-bde2-46607ecd925e\call_gWHLEl1tZjNsgcpNSEsRMCuT.png` (selected **Opposing Brackets** concept).
- Generated production asset source: `C:\Users\Cambo\.codex\generated_images\019f9dfa-7a75-7d93-bde2-46607ecd925e\call_BOR0WCLZw0ZMbEBKwjunq8hr.png`.
- Rendered implementation captures:
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-light.png`
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-deep-space.png`
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-city-pulse.png`
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-front-row.png`
- Combined full-view comparison: `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-qa-full.png`.
- Combined focused comparison: `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-qa-focused.png`.
- Source pixels: 1536 x 1024. Implementation screenshots: 1263 x 1257 pixels from a 1278 x 1272 CSS-pixel browser viewport at device scale 1.
- Comparison images normalize the source and implementation by proportional downscaling only; neither artifact was stretched.
- State: signed-in player on the homepage plus the standard account header, in default light, Deep Space, City Pulse, and Front Row.

### Full-view comparison

- The selected bracket-and-point idea is clearly recognizable in the live header without changing the existing homepage hierarchy or header proportions.
- The mark remains subordinate to the product name and does not compete with the Daily or navigation controls.
- Existing theme artwork, palettes, typography, and page composition remain unchanged.

### Focused fidelity review

- **Fonts and typography:** The existing product wordmark type remains unchanged. Its 800 weight, 17-23px responsive sizing, and spacing preserve the current header while matching the selected concept's heavy sans-serif character.
- **Spacing and layout rhythm:** The production mark uses a compact 28 x 21px base frame and a 32 x 24px homepage frame. It stays vertically centred and does not change the header shell height.
- **Colors and tokens:** The left bracket and centre point use the active semantic `--accent`; the right bracket uses the wordmark's current text colour. This intentionally adapts the concept to every current and future palette without adding theme-specific overrides.
- **Image quality and asset fidelity:** Both visible shapes come from transparent raster masks generated from the selected ImageGen artwork. Edges remain clean at header size, with no white halo, stretched crop, CSS drawing, inline SVG, or placeholder asset.
- **Copy and content:** “Give or Take” and the accessible “Give or Take home” label are unchanged.

### Interaction, accessibility, and browser checks

- Home navigation works from both the merged homepage header and the standard application header.
- Theme switching and selecting Deep Space, City Pulse, and Front Row update the mark immediately.
- The decorative mark remains `aria-hidden`; the button retains its accessible label and keyboard focus behavior.
- Browser console check found no errors.
- The fixed in-app browser viewport was used for visual comparison. The existing sub-720px mark sizing rule was updated in place; no surrounding responsive layout rule changed.

### Findings and comparison history

- The first generated mask split allowed a thin neutral sliver to overlap the centre point. The masks were regenerated from the same source with the split moved into the clear gap between the centre point and right bracket.
- The post-fix focused comparison shows a clean centre point in all four palettes, with no overlap or transparency halo.
- No actionable P0, P1, or P2 differences remain.
- Accepted P3 adaptation: the default app uses its established warm accent instead of the concept board's fixed violet, and City Pulse uses the semantic text colour for the neutral bracket instead of introducing an extra cyan-only logo token. This is deliberate theme-system integration, not visual drift.

### Verification

- `npm run lint` — passed.
- `npm test -- --run` — 15 files and 198 tests passed.
- `npm run build` — passed, including data validation, TypeScript, and production Vite output.

## Aurora Drift theme

### Evidence

- Source visual truth: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\07-improved-1c-shooting-star.png`.
- Browser-rendered implementation: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\aurora-drift-production-640x360.png`.
- Equal-size comparison input: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\aurora-drift-source-vs-production.png` (source left, production right).
- Source and implementation pixels: 640 x 360. Implementation CSS frame: 640 x 360 at device scale 1. No scaling, stretching, density conversion or device-frame normalization was required.
- State: dark-only Aurora Drift artwork with the first meteor held at its visible keyframe for a deterministic comparison. The live preview uses the production timing and remains animated.

### Full-view comparison

- The production frame preserves the selected 1c composition: teal-black radial sky, violet atmosphere above, emerald light below, two soft horizontal aurora ribbons, a dark vignette and a top-right diagonal meteor.
- The meteor keeps the improved five-pixel luminous head, tapered blue-white trail and layered violet-blue bloom from the selected source.
- The final star field has comparable visual density without creating 150 DOM nodes. Small tiled CSS stars provide depth while the brighter hand-placed layer prevents visible repetition.

### Focused fidelity review

- **Fonts and typography:** not applicable; both the visual target and theme artwork contain no text.
- **Spacing and layout rhythm:** the source and implementation share the same 16:9 frame, ribbon band, meteor quadrant and edge vignette. The implementation is also responsive at the full portrait browser viewport without clipping or exposing a hard artwork boundary.
- **Colors and tokens:** the production tokens preserve the source values for the sky (`#0b1a1f` through `#030509`), violet, emerald, teal, purple, mint and magenta layers. The full UI palette passed the shared contrast checks.
- **Image quality and asset fidelity:** the source itself is generated CSS motion rather than a raster illustration. Production uses the same code-native layer technique, with sharper CSS stars and no stretched raster, compression, masking halo or substitute asset.
- **Copy and content:** the registry name is “Aurora Drift”; its unlock is Space rank 10, whose live rank title is “Orbit Scout.”
- A separate focused crop was not needed because the equal-size 640 x 360 comparison makes the meteor head, trail, stars, ribbons and vignette individually readable.

### Interaction, accessibility and browser checks

- The theme registry auto-discovers one artwork component for Aurora Drift and renders both locked preview and equipped backdrop variants.
- Gallery animation stays paused until hover, focus or active interaction. Reduced motion stops every aurora animation and removes the meteors.
- Aurora Drift is dark-only, persists through the existing background preference flow and remains independent of the free light/dark setting.
- The live production preview loads both aurora ribbons and both meteors. Reload checks found no console event or page error in either the integrated app or the isolated artwork preview.
- The unlock contract has a regression test for `{ category: "space", rank: 10 }`.

### Findings and comparison history

- Initial P2: the first production capture had much lower star density than the selected 1c source. The base layer was expanded with small, staggered repeating fields while retaining the brighter hand-placed stars. The post-fix equal-size comparison shows comparable density with less foreground glare behind game UI.
- Accepted P3: the production stars are slightly dimmer than the source. This preserves the source's depth while reducing competition with live game copy and controls.
- No actionable P0, P1 or P2 differences remain.

### Verification

- `npm run lint` — passed.
- `npm test` — 15 files and 209 tests passed.
- `npm run build` — passed, including data validation, TypeScript and production Vite output.

## Mobile home-header annotation

### Evidence

- Source visual truth: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\home-header-before.png`.
- Browser-rendered implementation: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\home-header-after-371.png`.
- Combined comparison: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\home-header-before-vs-final-light.png` (source left, implementation right).
- Source pixels: 424 x 881. Implementation pixels and exact child CSS viewport: 371 x 877 at device scale 1. No scaling, stretching or density conversion was applied; the implementation is intentionally narrower to verify the responsive stress state.
- State: signed-in `Cambo`, light theme, homepage and Classic warm-up. The warm-up question differs because that content is selected dynamically; the header comparison is unaffected.

### Full-view comparison

- The two-row rounded header shell is now the shared site header.
- The brand now has clear top-row priority through a 42 x 32 mark and a 19 px wordmark.
- `Past` moves left into the lower controls, while the 44 x 44 theme toggle follows it on the lower row.
- At the narrower 371 px implementation width, the header has no overlap or clipping and retains the complete `Mon 27 Jul` date.

### Focused fidelity review

- **Fonts and typography:** the existing Nunito family, weight and tracking are unchanged. The mobile wordmark increases from 17 px to 19 px and does not wrap.
- **Spacing and layout rhythm:** the lower row keeps the daily controls flexible, then places `Past` and the theme toggle as fixed 44 px targets. The resulting mobile header is 124 px tall.
- **Colors and tokens:** all existing semantic header tokens are unchanged. Both the light theme and Aurora Drift dark theme were checked in-browser.
- **Image quality and asset fidelity:** the existing `BrandMark` raster masks are reused at their native aspect ratio. No new substitute asset, scaling halo or compression artifact was introduced.
- **Copy and content:** visible copy is unchanged except that, at 380 px and below, the redundant visible `No streak` label collapses to its flame icon so the full date fits. The screen-reader text remains in the DOM.

### Interaction, accessibility and browser checks

- `Past` opens the archive and the home control returns to the quiz.
- The same header remains present on Past, Leaderboard, Account and rank-detail screens.
- A 416 px account-page scroll moved the header to `y: -404px`, confirming it leaves the viewport instead of sticking.
- The theme button switches modes and updates its accessible label.
- Existing semantic buttons and labels are retained, and the moved controls remain 44 x 44 touch targets.
- The exact 371 px child viewport rendered without a console event or page error.

### Findings and comparison history

- Initial P2: the theme toggle sat in the top row, `Past` was pinned to the far right and the brand was undersized. The responsive grid and control grouping now match the annotation.
- First narrow light capture at 371 px showed the date truncating. A 380 px compact streak treatment was added; the post-fix exact-width capture shows the full `Mon 27 Jul` date while retaining the streak icon.
- No actionable P0, P1 or P2 differences remain.

### Verification

- `npm.cmd run lint` — passed.
- `npm.cmd test` — 15 files and 210 tests passed.
- `npm.cmd test -- --run tests/HomeHeader.test.tsx` — 1 file and 4 tests passed.
- `npm.cmd run build` — passed, including validation of 272 questions and 20 daily sets, TypeScript and production Vite output. The existing large-chunk advisory remains.

## Shared page width and Ranks toolbar annotations

### Browser comparison

- At the 1677 x 1272 annotated viewport, the home header and home body both measure 880 px.
- Past, Leaderboard, Account and Ranks now use the same 880 px outer width and matching horizontal position as the shared header.
- The separate Ranks hero container is absent. Its `Ranks` heading now sits inside the rank overview toolbar.
- The revised toolbar measurements are: heading 100.6 px, subject label 376 px, select 252 px and Total XP 147.4 px at the right edge. These match the annotated targets without hard-coding the select independently from its label.

### Responsive and interaction checks

- The subject label is capped at 376 px on desktop and its select fills the remaining 252 px after the existing label and gap.
- At 720 px and below, the toolbar stacks as heading, picker and Total XP; the picker returns to full available width and Total XP uses a top divider rather than forcing a cramped desktop row.
- Switching the compact picker from Space to Population updated the selected category, title and collection, then returned correctly to Space.
- The Ranks overview now uses the same accent gradient, inset highlight, soft glow, rise motion and 2.6-second one-pass sheen as the profile and leaderboard feature panels.
- The sheen is decorative and pointer-transparent; the global reduced-motion rule reduces it to a near-instant single pass.
- The shared header remains 880 px on every desktop page and retains its existing mobile width rule.
- No P0, P1 or P2 differences remain against the annotations.

### Verification

- `npm.cmd run lint` — passed.
- `npm.cmd test` — 15 files and 210 tests passed.
- `npm.cmd run build` — passed, including question and daily-set validation, TypeScript and production Vite output. The existing large-chunk advisory remains.

## Mobile profile Subjects annotations

- All four changes are scoped to the existing 720 px mobile breakpoint; the desktop profile remains unchanged.
- The Subjects-only ladder count is hidden on mobile. Achievement and other section counts remain visible.
- At the narrower 371 px QA viewport, `Rank details` measures 164.3 x 37 px with a 23.5 px font and zero vertical padding.
- The Subjects heading and Rank details button share the same vertical centre at 407 px, with no clipping or overlap.
- The profile hero has the requested 12 px mobile top margin.
- The Rank details control retains its existing button semantics and now has a visible border, pill background, inset highlight and pressed/hover treatment.
- The shared header now switches to its two-row grid at 850 px and below, while all other page-level mobile rules remain at 720 px.
- The 371 px stress check renders the expected `"brand nav" / "lower lower"` rows at 124 px tall.
- The Achievements hero keeps its gradient but no longer shimmers automatically on mount. Each pass waits a random 6–22 seconds, runs for 2.6 seconds, then schedules a new random pause.
- The browser idle-state check reports `animation-name: none` with the sheen parked off-panel; reduced-motion preferences skip the shimmer schedule entirely.

### Verification

- `npm.cmd run lint` — passed.
- `npm.cmd test` — 15 files and 210 tests passed.
- `npm.cmd run build` — passed, including question and daily-set validation, TypeScript and production Vite output. The existing large-chunk advisory remains.

## Mobile Leaderboard title spacing

- At the existing 720 px mobile breakpoint, the Leaderboard intro now receives a 26 px top inset beneath the doubled header.
- The inset is owned by the intro wrapper rather than a fixed heading height, so the title remains unclipped under text scaling and at narrower widths.
- Browser verification at 678 px confirmed the 26 px inset, a 42.7 px auto-height heading and clear separation before the format controls.
- Desktop Leaderboard spacing remains unchanged.

## Combined Classic leaderboard

- The leaderboard now has one Classic dataset and defaults to every category, with one row per player and category.
- Classic remains the default tab. Survival remains available as the second tab, and a completed Survival run links directly to that board.
- The previous Daily and per-board category controls are removed. A compact category select filters the loaded Classic rows in place, while Survival remains an all-subject run.
- Desktop rows show Rank, Player, Category, Best, Correct, Accuracy and Date without changing the surrounding title, standing card or actions.
- At the 371 px mobile QA width, each row keeps Rank, Player and Best on the first line, Category on the second, and the three game-detail metrics in a labelled lower grid with no clipping or horizontal scroll.
- Survival rows show Rank, Player, Attempts and Best. The 371 px layout measured 88 px tall and rendered without horizontal overflow.
- The live source-data fallback produced four existing rows and the Science filter reduced that list to the single Science result while reranking it first.
- A read-only query against project `zwovdyyuacuipfhtycxw` verified the migration aggregate returns the same four best-round rows and detail values.
- Correct means answers worth at least 980 points. Accuracy is the best round score as a percentage of the available 10,000 points.
- `20260727152334_classic_leaderboard_details.sql` prepares the efficient aggregate view. The current app remains functional before deployment by deriving the same fields from the already-public, RLS-protected round source tables.
- The bottom actions are centred in a two-button group. `Return to Home` is the left action, and the right action changes between the Classic and Survival calls to action.
- Both actions use theme-aware gradients and a 4.2-second travelling sheen. The existing global reduced-motion rule suppresses the repeated animation for users who request reduced motion.
- Browser checks measured the desktop action group exactly centred on the leaderboard body and confirmed both 220 px actions use the shimmer. At the 371 px viewport, both 157 px actions fit side-by-side without horizontal overflow.
- `npm.cmd run lint` passed.
- `npm.cmd test` passed: 16 files and 214 tests.
- `npm.cmd run build` passed, including data validation, TypeScript and production Vite output. The existing large-chunk advisory remains.

final result: passed
## Category selection redesign

## Comparison Target

- Source visual truth:
  - `C:\Users\Cambo\AppData\Local\Temp\codex-clipboard-8ae6aa8a-5122-43c9-bfeb-285c20791197.png` (desktop rest and hover direction)
  - `C:\Users\Cambo\AppData\Local\Temp\codex-clipboard-65db9f41-54f6-42cf-9f7b-8af9cc2005c8.png` (mobile layout)
  - `C:\Users\Cambo\Downloads\Category selection redesign.zip` (supplied icon assets and design source)
- Browser-rendered implementation: `design-qa-implementation-mobile.png`
- Normalized source: `design-qa-reference-mobile-normalized.png`
- Side-by-side evidence: `design-qa-mobile-comparison.png`
- Route: `http://127.0.0.1:4175/give-or-take-quiz/?v=idle-sway`
- State: signed-in category screen, Deep Space/dark theme, category tiles at rest.

## Viewport And Normalization

- CSS viewport: 473 x 1237.
- Source pixels: 473 x 1237.
- Browser screenshot pixels: 458 x 1198 after the in-app browser's viewport chrome/scale.
- The source was bicubic-resampled to 458 x 1198 before the side-by-side comparison. Both comparison panels therefore use identical pixel dimensions and density.
- Desktop responsiveness was additionally checked at a 1100 x 1100 CSS viewport.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the existing Fraunces display face and Nunito UI face preserve the reference hierarchy. Subject names, one-line counts, and compact earned badges remain readable at the supplied mobile width.
- Spacing and layout rhythm: the mobile panel is 384 px wide, uses a two-column grid, keeps the Mixed card horizontal, and closely matches the supplied card heights, gaps, radii, and icon scale. Desktop uses the requested Mixed-first, three-column layout and centers the final unpaired tile.
- Colors and visual tokens: card surfaces, borders, icon tint, glow, and metadata use the existing theme variables. Light and dark theme toggles were checked; the icon masks and panel surface recolor without fixed asset colors.
- Image quality and asset fidelity: all eleven supplied PNG icons were resized to 256 x 256 with transparency preserved, then used as CSS masks. No emoji, replacement SVG, or placeholder art remains in category identity positions.
- Copy and content: the implementation intentionally retains the live question totals and earned player data. The Games count differs from the mock because the current bank contains 57 playable Games questions rather than the mock's sample value.
- Follow-up polish (P3): the existing floating music control can temporarily sit over the bottom-right tile at one scroll position. The page remains scrollable and the tile remains usable; this global control is outside the requested category-section scope.

## Comparison History

1. Initial mobile comparison found two P2 fidelity issues: subject icons were undersized and question counts wrapped onto two lines.
2. The mobile subject icon frame was increased to 102 px and the count was tightened to a single line, with a narrower fallback retained below 420 px.
3. The normalized side-by-side comparison shows the corrected icon scale, card density, count placement, Mixed layout, and earned badges with no remaining P0-P2 mismatch.

## Interaction And Runtime Checks

- Selecting Population launched a five-question Population round.
- The in-game question header rendered the new Population mask at 36 x 36 px.
- Desktop pointer hover reached the card and began the metadata cross-fade; keyboard focus uses the same `:focus-visible` reveal rule.
- Light and dark themes produced different computed icon and panel colors from the existing tokens.
- Browser console warnings/errors: none.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including data validation and TypeScript checking.

Focused-region evidence was not split into a second crop because the supplied mobile source is already a focused component view and the normalized side-by-side keeps icon edges, copy, badges, and card spacing readable at 1:1.

final result: passed
