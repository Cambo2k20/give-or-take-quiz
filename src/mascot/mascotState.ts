/**
 * The mascot's animation state, as a small typed API.
 *
 * The component runs its own physics on refs and requestAnimationFrame, so
 * nothing in here is React state during a drag. This module is the vocabulary:
 * which poses exist, which expression each pose wears, how long a reaction
 * lasts, and how a scored answer maps to a reaction.
 */

/** What the mascot is doing right now. Driven by real slider interaction. */
export type MascotPose =
  /** Nobody is touching the slider: breathing, blinking, glancing at the knob. */
  | "idle"
  /** Hovered or keyboard-focused: leans in, eyes lock onto the knob. */
  | "ready"
  /** Actively dragging: body follows the thumb, leans into the direction. */
  | "dragging"
  /** A fast flick: the planted hand pulls a weighted, startled body behind it. */
  | "rapidDrag"
  /** Dragging slowly: precision mode — tighter posture, narrowed eyes. */
  | "precision"
  /** Just released: springing back to neutral with a satisfied beat. */
  | "settling"
  /** Playing a submit reaction. */
  | "reacting";

/** The face. Poses pick one; reactions override it for their duration. */
export type MascotExpression =
  | "neutral"
  | "anticipating"
  | "focused"
  | "pleased"
  | "surprised"
  | "delighted";

/** Result states, played once when a guess is submitted. */
export type MascotReaction =
  | "closeAnswer"
  | "averageAnswer"
  | "farAnswer"
  | "perfectAnswer";

/** Read-only view of the mascot, emitted only when pose or expression changes. */
export type MascotSnapshot = {
  pose: MascotPose;
  expression: MascotExpression;
  reaction: MascotReaction | null;
  /** Normalised slider position the mascot is currently holding, 0–1. */
  position: number;
};

/** How long each reaction runs before the mascot returns to idle, in ms. */
export const MASCOT_REACTION_MS: Record<MascotReaction, number> = {
  closeAnswer: 900,
  averageAnswer: 820,
  farAnswer: 940,
  perfectAnswer: 1280,
};

/** The face each reaction wears. */
export const MASCOT_REACTION_FACE: Record<MascotReaction, MascotExpression> = {
  closeAnswer: "pleased",
  averageAnswer: "pleased",
  farAnswer: "surprised",
  perfectAnswer: "delighted",
};

/** Every deformation limit in one place, so nothing can look rubbery. */
export const MASCOT_LIMITS = {
  /** Degrees of body lean, either direction. */
  lean: 12,
  /** Degrees of head follow-through, either direction. */
  headTurn: 9,
  /** Squash/stretch, as a fraction of scale. */
  squash: 0.06,
  /**
   * How far the knob may run ahead of the body before the body is dragged
   * along, in artwork units. The arm covers the difference; its own reach is
   * artwork geometry, so it lives with the artwork.
  */
  armReach: 30,
  /** Maximum fast-drag travel needed for the thumb to cross the body. */
  rapidArmReach: 88,
  /** Idle breathing travel, in artwork units. */
  breath: 2.4,
} as const;

/** Thumb-velocity thresholds and timings shared by the simulation and tests. */
export const MASCOT_MOTION = {
  /** Exponential smoothing applied at a nominal 60fps. */
  velocitySmoothing: 0.42,
  /** Normalised slider lengths per second required to enter rapid drag. */
  rapidEnterSpeed: 1.15,
  /** Lower exit threshold prevents the rapid pose flickering at its boundary. */
  rapidExitSpeed: 0.55,
  /** Minimum shocked beat after a rapid movement drops below the exit speed. */
  rapidHoldMs: 170,
  /** Slow movement below this is stationary rather than precise. */
  precisionMinSpeed: 0.02,
  /** Maximum normalised speed that still reads as deliberate precision. */
  precisionMaxSpeed: 0.5,
  /** Delay before the tiny nervous precision detail may appear. */
  precisionNervousAfterMs: 620,
  /** Satisfied expression after mouse, touch or keyboard release. */
  releasePleasedMs: 700,
  /** Sweat fades quickly enough not to leak into idle. */
  sweatFadeMs: 420,
} as const;

export type RapidDragState = {
  active: boolean;
  holdUntil: number;
};

export type MascotGripSide = "left" | "right";

/** Smooth a measured thumb delta into normalised slider lengths per second. */
export function smoothThumbVelocity(
  previousVelocity: number,
  deltaPosition: number,
  elapsedMs: number,
): number {
  if (elapsedMs <= 0) return previousVelocity;
  const instantVelocity = deltaPosition / (elapsedMs / 1000);
  const frameRatio = elapsedMs / 16.667;
  const blend =
    1 - Math.pow(1 - MASCOT_MOTION.velocitySmoothing, frameRatio);
  return previousVelocity + (instantVelocity - previousVelocity) * blend;
}

/** Enter high and exit low, with a short hold to make a fast flick readable. */
export function resolveRapidDrag(
  state: RapidDragState,
  speed: number,
  now: number,
  dragging: boolean,
): RapidDragState {
  if (!dragging) return { active: false, holdUntil: 0 };
  if (speed >= MASCOT_MOTION.rapidEnterSpeed) {
    return {
      active: true,
      holdUntil: now + MASCOT_MOTION.rapidHoldMs,
    };
  }
  if (
    state.active &&
    (speed >= MASCOT_MOTION.rapidExitSpeed || now < state.holdUntil)
  ) {
    return state;
  }
  return { active: false, holdUntil: 0 };
}

/** Speed-scaled reach lets a fast thumb escape before it drags the body. */
export function rapidDragReach(speed: number): number {
  const fullReachSpeed = MASCOT_MOTION.rapidEnterSpeed * 2;
  const progress = Math.max(
    0,
    Math.min(
      1,
      (speed - MASCOT_MOTION.rapidExitSpeed) /
        (fullReachSpeed - MASCOT_MOTION.rapidExitSpeed),
    ),
  );
  return (
    MASCOT_LIMITS.armReach +
    (MASCOT_LIMITS.rapidArmReach - MASCOT_LIMITS.armReach) * progress
  );
}

/** Swap hands only after a rapid thumb movement has crossed the torso. */
export function resolveGripSide(
  currentSide: MascotGripSide,
  thumbX: number,
  bodyCenterX: number,
  rapidDrag: boolean,
  hysteresis = 8,
): MascotGripSide {
  if (!rapidDrag) return currentSide;
  if (currentSide === "right" && thumbX < bodyCenterX - hysteresis) {
    return "left";
  }
  if (currentSide === "left" && thumbX > bodyCenterX + hysteresis) {
    return "right";
  }
  return currentSide;
}

/** Precision is based only on real thumb movement, never body spring velocity. */
export function isPrecisionMovement(
  dragging: boolean,
  rapidDrag: boolean,
  thumbSpeed: number,
): boolean {
  return (
    dragging &&
    !rapidDrag &&
    thumbSpeed >= MASCOT_MOTION.precisionMinSpeed &&
    thumbSpeed <= MASCOT_MOTION.precisionMaxSpeed
  );
}

/** Accuracy tier ids used by `lib/game.ts`. */
export type AccuracyTierId = "bullseye" | "close" | "fair" | "wide" | "far";

/** Preferred mapping: feed it `accuracyTier(points).id`. */
export function reactionForTier(tier: AccuracyTierId): MascotReaction {
  switch (tier) {
    case "bullseye":
      return "perfectAnswer";
    case "close":
      return "closeAnswer";
    case "fair":
      return "averageAnswer";
    default:
      return "farAnswer";
  }
}

/**
 * Fallback when only a raw score is to hand. Thresholds are fractions of the
 * per-question maximum, so this keeps working if scoring is retuned — but
 * `reactionForTier` stays the source of truth.
 */
export function reactionForPoints(points: number, max = 1000): MascotReaction {
  const share = max > 0 ? points / max : 0;
  if (share >= 0.98) return "perfectAnswer";
  if (share >= 0.85) return "closeAnswer";
  if (share >= 0.6) return "averageAnswer";
  return "farAnswer";
}
