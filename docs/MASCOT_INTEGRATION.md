# Mascot animation system

The system has two artwork surfaces: **`WarmupSliderMascot`**, attached to real
game sliders, and **`MascotPose`**, a reusable set of six poses for profiles,
cards, onboarding and result states.

Files:

- `src/mascot/WarmupSliderMascot.tsx`
- `src/mascot/MascotPose.tsx` — reusable sleeping, sitting, waving, peeking,
  thinking and celebrating artwork
- `src/mascot/mascotState.ts` — the typed animation state API
- `src/mascot/mascot-animations.css` — shared artwork variables, pose
  animations and slider layout hooks

No dependency added: Framer Motion is not in `package.json`, so the mascot runs
on CSS transforms driven by one `requestAnimationFrame` loop.

## 1. `EstimatePanel`'s opt-in slot

The mascot only ever *watches* the slider — it reads the range input's value,
pointer, focus and key events. Slider logic, scoring and question behaviour are
untouched. Two additive changes carry it in `src/EstimatePanel.tsx`:

```diff
+  /** Renders inside `.slider-wrap`, behind the rail. Home warm-up only. */
+  sliderOverlay?: ReactNode;
 }: EstimatePanelProps) {
```

```diff
-    <div
-      className={`estimate-panel${revealing ? " is-revealing" : ""}${tierId ? ` tier-${tierId}` : ""}`}
+    <div
+      className={`estimate-panel${sliderOverlay ? " has-mascot" : ""}${revealing ? " is-revealing" : ""}${tierId ? ` tier-${tierId}` : ""}`}
```

```diff
       <div className="slider-wrap">
+        {sliderOverlay}
         <span className="slider-rail" aria-hidden="true" />
```

`has-mascot` is what adds the headroom above the rail and paints the rail, fill,
miss band, answer dot and thumb in front of the mascot's body — so it reads as
standing behind the track with a hand on the knob. Panels without an overlay
render exactly as they do today.

## 2. Mounted in the warm-up card

In `src/HeroDemo.tsx`:

```tsx
import { WarmupSliderMascot } from "./mascot/WarmupSliderMascot";
import { reactionForTier } from "./mascot/mascotState";

// …
const [reactionNonce, setReactionNonce] = useState(0);

function checkGuess() {
  if (locked) return;
  setLocked(true);
  setRevealing(true);
  setReactionNonce((nonce) => nonce + 1); // replays even on the same tier
}

<EstimatePanel
  question={question}
  position={position}
  onPositionChange={setPosition}
  locked={locked}
  revealing={revealing}
  tierId={tier?.id}
  sliderId="hero-demo-slider"
  sliderOverlay={
    <WarmupSliderMascot
      reaction={tier ? reactionForTier(tier.id) : null}
      reactionNonce={reactionNonce}
    />
  }
/>
```

That is the whole integration. `tryAnother()` needs no change — clearing `tier`
clears the reaction.

## 3. Props

| Prop | Default | Notes |
| --- | --- | --- |
| `position` | — | Optional. Omit it: the mascot reads the range input each frame, so its physics never depends on React state. The memoized component also skips parent renders while its props are unchanged. Pass it only if the input is not a sibling. |
| `reaction` | `null` | `closeAnswer` · `averageAnswer` · `farAnswer` · `perfectAnswer` |
| `reactionNonce` | `0` | Bump to replay the same reaction. |
| `railCenter` | `23` | Rail centre line from the top of `.slider-wrap` (`top: 18px` + half of `10px`). |
| `thumbSize` | `30` | Matches `::-webkit-slider-thumb`. |
| `scale` | auto | Derived from rail width, clamped `0.62–1`. |
| `hidden` | `false` | e.g. hide once a guess is locked. |
| `onSnapshot` | — | Fires only when pose/expression/reaction changes, never per frame. |

## 4. Behaviour

- **Idle** — gentle open-mouth panting, chest-only breathing, blink every 3–7s,
  small eye movements toward the knob and a rare 1–2.2 degree head tilt. The
  whole character does not continuously float.
- **Ready** (hover or keyboard focus) — small anticipatory lean, gaze locked on
  the knob and a restrained anticipatory mouth.
- **Dragging** — hand welded to the thumb, body follows on a spring, leans into
  the direction, head follows a beat later, squash/stretch on fast moves. Every
  deformation is clamped in `MASCOT_LIMITS`; the arm absorbs body lag up to
  30 units and the body is dragged along past that, so the grip never breaks.
- **Rapid drag** — measured from smoothed thumb velocity with enter/exit
  hysteresis. The planted hand pulls a heavier body behind it, the head briefly
  counter-rotates before following, the eyes widen and one or two sweat drops
  trail against the direction of travel.
- **Precision** — slow pointer velocity narrows the eyes, flattens the mouth and
  tightens the lean. It uses thumb velocity rather than body spring velocity,
  so a fast flick cannot become "precision" merely because the torso is
  settling. A single small nervous sweat detail appears only after sustained
  careful movement.
- **Release** — soft spring back to neutral with a ~700ms satisfied smile;
  sweat fades within 420ms.
- **Reactions** — nod (close), gentle bob (average), recoil + wide eyes (far),
  jump with gold sparks (perfect).

## 5. Accessibility, performance, theming

- `aria-hidden` throughout; it adds no semantics to the slider.
- Mouse, touch and keyboard (`Arrow*`, `Page*`, `Home`, `End`) all drive it.
- `prefers-reduced-motion: reduce` → no loop or polling timer. The mascot is
  placed statically beside the knob and updates from real slider input, resize,
  prop-render and motion-preference events.
- `IntersectionObserver` stops the loop when the card scrolls off screen.
- Only `transform` and `opacity` animate; SVG groups are written with
  `setAttribute("transform", …)` so React never re-renders during motion.
- `data-pose`, `data-expression` and `data-reaction` on the hidden layer expose
  the current coarse state for tests and browser diagnostics.
- Colours come from CSS variables on `.gt-mascot-layer` —
  `--gt-mascot-body`, `--gt-mascot-body-shade`, `--gt-mascot-ink`,
  `--gt-mascot-edge`, `--gt-mascot-accent`, `--gt-mascot-accent-deep`,
  `--gt-mascot-shadow`. The character keeps the pose sheet's white-to-`#e7edf6`
  body and solid `#16233f` outline in both colour modes.

## 6. Reusable pose library

`MascotPose` accepts `pose`, `decorative`, `label`, `animated`, `accent` and the
normal SVG props. The six values exported by `MASCOT_POSES` are `sleeping`,
`sitting`, `waving`, `peeking`, `thinking` and `celebrating`. Every pose shares
the same broad build, folded floppy ears, tall oval eyes with one glint, navy
nose, 1.6-unit `#16233f` outline and three toe lines per paw.

Use `decorative` when nearby copy already names the purpose. Otherwise the
component supplies a pose-specific accessible label, which can be replaced with
`label`. `animated` enables only the restrained motion authored in the source
sheet and is disabled by `prefers-reduced-motion`.
