import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BACKGROUND_THEMES } from "@/lib/themes";
import {
  REGISTERED_THEME_ARTWORK_IDS,
  ThemeArtwork,
} from "@/src/themes/ThemeArtwork";

describe("theme artwork registry", () => {
  it("has exactly one auto-discovered artwork component per theme", () => {
    expect(REGISTERED_THEME_ARTWORK_IDS).toEqual(
      BACKGROUND_THEMES.map((theme) => theme.id).sort(),
    );
  });
});

describe("City Pulse SVG artwork", () => {
  it("uses one bottom-anchored sliced coordinate system", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );

    const svg = container.querySelector(".city-pulse__scene");
    expect(svg).toHaveAttribute("viewBox", "0 0 1600 900");
    expect(svg).toHaveAttribute(
      "preserveAspectRatio",
      "xMidYMax slice",
    );
  });

  it("clips every window to the same building group that draws its mass", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );

    const windows = container.querySelectorAll(
      [
        'rect[fill="var(--artwork-detail-cool)"]',
        'rect[fill="var(--artwork-detail-warm)"]',
      ].join(","),
    );

    expect(windows.length).toBeGreaterThan(100);
    for (const window of windows) {
      expect(window.closest("g[clip-path]")).not.toBeNull();
    }
  });

  it("keeps most windows static and animates six small groups", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );

    const cycles = container.querySelectorAll(
      ".city-pulse__window-cycle",
    );
    const staticWindows = container.querySelectorAll(
      ".city-pulse__windows-static rect",
    );
    const animatedWindows = container.querySelectorAll(
      ".city-pulse__window-cycle rect",
    );

    expect(cycles).toHaveLength(6);
    for (const cycle of cycles) {
      expect(cycle.querySelectorAll("rect").length).toBeGreaterThan(5);
    }
    expect(staticWindows.length).toBeGreaterThan(animatedWindows.length * 4);
    expect(
      container.querySelectorAll("rect[class*='flicker']"),
    ).toHaveLength(0);
  });

  it("keeps traffic and the rare accent on group-level animation hooks", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );

    const traffic = container.querySelectorAll(
      ".city-pulse__traffic-point",
    );
    expect(traffic).toHaveLength(2);
    for (const point of traffic) {
      expect(point.querySelector("animateMotion")).not.toBeNull();
      expect(point.querySelector("animate[attributeName='opacity']")).not
        .toBeNull();
    }
    expect(
      container.querySelectorAll(".city-pulse__rare-accent-cycle"),
    ).toHaveLength(1);
  });
});

describe("Front Row SVG artwork", () => {
  it("keeps structural artwork in one bottom-anchored coordinate system", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="front-row"
        mode="dark"
        variant="backdrop"
      />,
    );

    const svg = container.querySelector(".front-row__scene");
    expect(svg).toHaveAttribute("viewBox", "0 0 1600 900");
    expect(svg).toHaveAttribute(
      "preserveAspectRatio",
      "xMidYMax slice",
    );
    expect(svg?.querySelectorAll("animate, animateMotion, animateTransform"))
      .toHaveLength(0);
  });

  it("uses three static seat rows and animates only the screen glow", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="front-row"
        mode="dark"
        variant="backdrop"
      />,
    );

    expect(container.querySelectorAll(".front-row__seat-row")).toHaveLength(3);
    expect(
      container.querySelectorAll(".front-row__seat-row use"),
    ).toHaveLength(32);
    expect(
      container.querySelectorAll(".front-row__screen-glow"),
    ).toHaveLength(1);

    const motionCss = [...container.querySelectorAll("style")]
      .map((style) => style.textContent ?? "")
      .find((css) => css.includes("front-row-screen-shift"));
    expect(motionCss).toContain(
      ".front-row .svg-theme-artwork__wash",
    );
    expect(motionCss).toContain("animation: none");
    expect(motionCss).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
