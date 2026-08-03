import { describe, expect, it } from "vitest";

import {
  MASCOT_MOTION,
  isPrecisionMovement,
  reactionForPoints,
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
});

describe("mascot score reactions", () => {
  it("matches the real accuracy-tier boundaries", () => {
    expect(reactionForPoints(980)).toBe("perfectAnswer");
    expect(reactionForPoints(979)).toBe("closeAnswer");
    expect(reactionForPoints(850)).toBe("closeAnswer");
    expect(reactionForPoints(849)).toBe("averageAnswer");
    expect(reactionForPoints(600)).toBe("averageAnswer");
    expect(reactionForPoints(599)).toBe("farAnswer");
  });
});
