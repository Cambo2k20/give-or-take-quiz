import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WarmupSliderMascot } from "@/src/mascot/WarmupSliderMascot";
import type { MascotReaction } from "@/src/mascot/mascotState";

function installMotionPreference(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(
      (_name: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
    ),
    removeEventListener: vi.fn(
      (_name: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return {
    setMatches(next: boolean) {
      matches = next;
      const event = { matches: next, media: media.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function renderMascot({
  reaction = null,
  reactionNonce = 0,
  initialPosition = 0.5,
}: {
  reaction?: MascotReaction | null;
  reactionNonce?: number;
  initialPosition?: number;
} = {}) {
  return render(
    <div className="slider-wrap">
      <WarmupSliderMascot
        reaction={reaction}
        reactionNonce={reactionNonce}
      />
      <input
        aria-label="Your estimate"
        type="range"
        min="0"
        max="1"
        step="0.0001"
        defaultValue={initialPosition}
      />
    </div>,
  );
}

function readProjectedGripX() {
  const art = document.querySelector<HTMLElement>(
    ".gt-mascot-front .gt-mascot-art",
  );
  const grip = document.querySelector<SVGGElement>(
    '[data-mascot-part="grip-fingers"]',
  );
  if (!art || !grip) throw new Error("Mascot grip geometry is missing");

  const artMatch = art.style.transform.match(
    /translate3d\(([-\d.]+)px,\s*[-\d.]+px,\s*0\)\s*scale\(([-\d.]+)\)/,
  );
  const gripMatch = grip
    .getAttribute("transform")
    ?.match(/translate\(([-\d.]+)\s+[-\d.]+\)/);
  if (!artMatch || !gripMatch) {
    throw new Error("Mascot grip transforms are malformed");
  }

  return Number(artMatch[1]) + Number(gripMatch[1]) * Number(artMatch[2]);
}

describe("WarmupSliderMascot", () => {
  it("uses the broad floppy-eared dog anatomy from the pose sheet", () => {
    installMotionPreference(true);
    renderMascot();
    const layer = document.querySelector<HTMLElement>(".gt-mascot-layer");

    expect(
      document.querySelectorAll('[data-mascot-part="floppy-ear"]'),
    ).toHaveLength(2);
    expect(
      document.querySelector('[data-mascot-part="nose"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-mascot-part="belly-patch"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-mascot-part="tail"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-mascot-part="left-leg"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-mascot-part="right-leg"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-mascot-part="grip-fingers"]'),
    ).not.toBeNull();
    expect(layer).toHaveAttribute("data-pose", "idle");
    expect(layer).toHaveAttribute("data-expression", "panting");
    expect(
      document.querySelector('[data-mascot-part="panting-mouth"]'),
    ).toHaveStyle({ opacity: "1" });
  });

  it("keeps the visible grip welded to both slider endpoints", () => {
    installMotionPreference(true);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function clientWidth(this: HTMLElement) {
        return this.classList.contains("slider-wrap") ? 300 : 0;
      },
    );
    renderMascot({ initialPosition: 0 });

    const slider = document.querySelector<HTMLInputElement>(
      'input[type="range"]',
    );
    expect(slider).not.toBeNull();
    expect(readProjectedGripX()).toBeCloseTo(15, 1);

    fireEvent.input(slider as HTMLInputElement, { target: { value: "1" } });
    expect(readProjectedGripX()).toBeCloseTo(285, 1);
  });

  it("coordinates body sway, tail wag, and dangling legs while idle", () => {
    installMotionPreference(false);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function clientWidth(this: HTMLElement) {
        return this.classList.contains("slider-wrap") ? 300 : 0;
      },
    );
    let scheduledFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      scheduledFrame = callback;
      return 1;
    });
    renderMascot();

    expect(scheduledFrame).toBeDefined();
    scheduledFrame?.(1100);

    const root = document.querySelector('[data-mascot-part="body-root"]');
    const tail = document.querySelector('[data-mascot-part="tail"]');
    const leftLeg = document.querySelector('[data-mascot-part="left-leg"]');
    const rightLeg = document.querySelector('[data-mascot-part="right-leg"]');
    const firstFrame = {
      root: root?.getAttribute("transform"),
      tail: tail?.getAttribute("transform"),
      leftLeg: leftLeg?.getAttribute("transform"),
      rightLeg: rightLeg?.getAttribute("transform"),
    };

    expect(firstFrame.root).toContain("rotate(");
    expect(firstFrame.tail).toContain("rotate(");
    expect(firstFrame.leftLeg).toContain("rotate(");
    expect(firstFrame.rightLeg).toContain("rotate(");

    scheduledFrame?.(1800);
    expect(root?.getAttribute("transform")).not.toBe(firstFrame.root);
    expect(tail?.getAttribute("transform")).not.toBe(firstFrame.tail);
    expect(leftLeg?.getAttribute("transform")).not.toBe(firstFrame.leftLeg);
    expect(rightLeg?.getAttribute("transform")).not.toBe(firstFrame.rightLeg);
  });

  it.each([
    {
      expression: "howling",
      mouthPart: "howling-mouth",
      reaction: "closeAnswer" as const,
      sampleAt: 1400,
    },
    {
      expression: "barking",
      mouthPart: "barking-mouth",
      reaction: "averageAnswer" as const,
      sampleAt: 1220,
    },
    {
      expression: "growling",
      mouthPart: "growling-mouth",
      reaction: "wideAnswer" as const,
      sampleAt: 1260,
    },
  ])(
    "uses the $expression vocal pose for $reaction",
    ({ expression, mouthPart, reaction, sampleAt }) => {
      installMotionPreference(false);
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
        function clientWidth(this: HTMLElement) {
          return this.classList.contains("slider-wrap") ? 300 : 0;
        },
      );
      vi.spyOn(performance, "now").mockReturnValue(1000);
      let scheduledFrame: FrameRequestCallback | undefined;
      vi.spyOn(window, "requestAnimationFrame").mockImplementation(
        (callback) => {
          scheduledFrame = callback;
          return 1;
        },
      );
      renderMascot({ reaction, reactionNonce: 1 });

      scheduledFrame?.(sampleAt);

      const layer = document.querySelector(".gt-mascot-layer");
      const mouth = document.querySelector(
        `[data-mascot-part="${mouthPart}"]`,
      );
      expect(layer).toHaveAttribute("data-expression", expression);
      expect(mouth).toHaveStyle({ opacity: "1" });
      expect(mouth?.getAttribute("transform")).toContain("scale(");
    },
  );

  it("clears an interrupted answer reaction when the prop returns to null", () => {
    installMotionPreference(true);
    const view = renderMascot({ reaction: "farAnswer", reactionNonce: 1 });
    const layer = document.querySelector<HTMLElement>(".gt-mascot-layer");
    expect(layer).toHaveAttribute("data-reaction", "farAnswer");

    view.rerender(
      <div className="slider-wrap">
        <WarmupSliderMascot reaction={null} reactionNonce={1} />
        <input
          aria-label="Your estimate"
          type="range"
          min="0"
          max="1"
          defaultValue="0.5"
        />
      </div>,
    );
    expect(layer).toHaveAttribute("data-reaction", "");
  });

  it("tracks reduced-motion input without polling and follows runtime changes", () => {
    const preference = installMotionPreference(false);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function clientWidth(this: HTMLElement) {
        return this.classList.contains("slider-wrap") ? 300 : 0;
      },
    );
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(1);
    const cancelFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});
    const interval = vi.spyOn(window, "setInterval");
    renderMascot({ initialPosition: 0.25 });

    expect(requestFrame).toHaveBeenCalled();
    preference.setMatches(true);
    expect(cancelFrame).toHaveBeenCalledWith(1);
    expect(
      document
        .querySelector('[data-mascot-part="tail"]')
        ?.getAttribute("transform"),
    ).toBe("");

    const slider = document.querySelector<HTMLInputElement>(
      'input[type="range"]',
    );
    const art = document.querySelector<HTMLElement>(
      ".gt-mascot-front .gt-mascot-art",
    );
    const before = art?.style.transform;
    fireEvent.input(slider as HTMLInputElement, { target: { value: "0.75" } });
    expect(art?.style.transform).not.toBe(before);
    expect(interval).not.toHaveBeenCalled();

    preference.setMatches(false);
    expect(requestFrame.mock.calls.length).toBeGreaterThan(1);
  });
});
