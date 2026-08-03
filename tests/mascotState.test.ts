import { describe, expect, it } from "vitest";

import {
  MASCOT_MOTION,
  MASCOT_REACTION_FACE,
  MASCOT_REACTION_MS,
  isPrecisionMovement,
  rapidDragReach,
  reactionForPoints,
  reactionForTier,
  resolveGripSide,
  resolveRapidDrag,
  smoothThumbVelocity,
} from "@/src/mascot/mascotState";

describe("mascot motion state", () => {
  it("enters rapid drag high, holds briefly, and exits below the lower threshold", () => {
    const entered = resolveRapidDrag(
      { active: false, holdUntil: 0 },
      MASCOT_MOTION.rapidEnterSpeed,
      100,
      true,
    );
    expect(entered).toEqual({
      active: true,
      holdUntil: 100 + MASCOT_MOTION.rapidHoldMs,
    });

    const held = resolveRapidDrag(entered, 0, 150, true);
    expect(held.active).toBe(true);

    const hysteresis = resolveRapidDrag(
      entered,
      MASCOT_MOTION.rapidExitSpeed + 0.01,
      500,
      true,
    );
    expect(hysteresis.active).toBe(true);

    const exited = resolveRapidDrag(
      entered,
      MASCOT_MOTION.rapidExitSpeed - 0.01,
      500,
      true,
    );
    expect(exited).toEqual({ active: false, holdUntil: 0 });
  });

  it("ends rapid drag immediately when interaction ends", () => {
    expect(
      resolveRapidDrag(
        { active: true, holdUntil: 1000 },
        MASCOT_MOTION.rapidEnterSpeed * 2,
        200,
        false,
      ),
    ).toEqual({ active: false, holdUntil: 0 });
  });

  it("derives precision only from real low thumb velocity", () => {
    expect(isPrecisionMovement(true, false, 0)).toBe(false);
    expect(
      isPrecisionMovement(
        true,
        false,
        MASCOT_MOTION.precisionMinSpeed + 0.01,
      ),
    ).toBe(true);
    expect(
      isPrecisionMovement(
        true,
        false,
        MASCOT_MOTION.precisionMaxSpeed + 0.01,
      ),
    ).toBe(false);
    expect(
      isPrecisionMovement(
        true,
        true,
        MASCOT_MOTION.precisionMinSpeed + 0.01,
      ),
    ).toBe(false);
    expect(
      isPrecisionMovement(
        false,
        false,
        MASCOT_MOTION.precisionMinSpeed + 0.01,
      ),
    ).toBe(false);
  });

  it("smooths thumb movement in normalised positions per second", () => {
    const velocity = smoothThumbVelocity(0, 0.1, 16.667);
    expect(velocity).toBeCloseTo(2.52, 2);
    expect(smoothThumbVelocity(velocity, 0, 16.667)).toBeLessThan(velocity);
    expect(smoothThumbVelocity(0, 0.05, 16.667)).toBeGreaterThan(
      MASCOT_MOTION.rapidEnterSpeed,
    );
  });

  it("lets a fast thumb outrun the mascot before the arm drags the body", () => {
    expect(rapidDragReach(0)).toBe(30);
    expect(rapidDragReach(MASCOT_MOTION.rapidEnterSpeed)).toBeGreaterThan(30);
    expect(rapidDragReach(MASCOT_MOTION.rapidEnterSpeed * 2)).toBe(88);
    expect(rapidDragReach(100)).toBe(88);
  });

  it("moves the grip to the far hand after the thumb passes the body", () => {
    expect(resolveGripSide("right", 60, 62, true)).toBe("right");
    expect(resolveGripSide("right", 53, 62, true)).toBe("left");
    expect(resolveGripSide("left", 70, 62, true)).toBe("left");
    expect(resolveGripSide("left", 71, 62, true)).toBe("right");
    expect(resolveGripSide("left", 100, 62, false)).toBe("left");
  });
});

describe("mascot score reactions", () => {
  it("maps each result headline to its intended dog reaction", () => {
    expect(MASCOT_REACTION_FACE.closeAnswer).toBe("howling");
    expect(MASCOT_REACTION_FACE.averageAnswer).toBe("barking");
    expect(MASCOT_REACTION_FACE.wideAnswer).toBe("growling");
    expect(MASCOT_REACTION_FACE.perfectAnswer).toBe("delighted");
    expect(MASCOT_REACTION_MS.closeAnswer).toBeGreaterThanOrEqual(1850);
    expect(MASCOT_REACTION_MS.averageAnswer).toBeGreaterThanOrEqual(1958);
    expect(MASCOT_REACTION_MS.perfectAnswer).toBeGreaterThanOrEqual(1760);
    expect(reactionForTier("wide")).toBe("wideAnswer");
  });

  it("matches the real accuracy-tier boundaries", () => {
    expect(reactionForPoints(980)).toBe("perfectAnswer");
    expect(reactionForPoints(979)).toBe("closeAnswer");
    expect(reactionForPoints(850)).toBe("closeAnswer");
    expect(reactionForPoints(849)).toBe("averageAnswer");
    expect(reactionForPoints(600)).toBe("averageAnswer");
    expect(reactionForPoints(599)).toBe("wideAnswer");
    expect(reactionForPoints(300)).toBe("wideAnswer");
    expect(reactionForPoints(299)).toBe("farAnswer");
  });
});
