import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BACKGROUND_THEMES } from "@/lib/themes";
import {
  REGISTERED_THEME_ARTWORK_IDS,
  ThemeArtwork,
} from "@/src/themes/ThemeArtwork";

const themeStyles = readFileSync(
  resolve("src/themes/theme-styles.css"),
  "utf8",
);
const cityStyles = readFileSync(
  resolve("src/themes/city-pulse.css"),
  "utf8",
);
const frontRowStyles = readFileSync(
  resolve("src/themes/front-row.css"),
  "utf8",
);
const deepSpaceStyles = readFileSync(
  resolve("src/themes/deep-space.css"),
  "utf8",
);

describe("theme artwork registry", () => {
  it("has exactly one auto-discovered artwork component per theme", () => {
    expect(REGISTERED_THEME_ARTWORK_IDS).toEqual(
      BACKGROUND_THEMES.map((theme) => theme.id).sort(),
    );
  });

  it.each(BACKGROUND_THEMES)(
    "renders $name without injecting a per-instance style tag",
    (theme) => {
      const { container } = render(
        <ThemeArtwork
          themeId={theme.id}
          mode="dark"
          variant="preview"
        />,
      );

      expect(container.querySelector("style")).toBeNull();
    },
  );

  it("shows a real supported preview but no backdrop in an unsupported mode", () => {
    const preview = render(
      <ThemeArtwork
        themeId="deep-space"
        mode="light"
        variant="preview"
      />,
    );
    const previewRoot = preview.container.firstElementChild;
    expect(previewRoot).not.toBeNull();
    expect(previewRoot).toHaveStyle({
      "--artwork-deep-space-sky": "#050611",
    });
    preview.unmount();

    const backdrop = render(
      <ThemeArtwork
        themeId="deep-space"
        mode="light"
        variant="backdrop"
      />,
    );
    expect(backdrop.container).toBeEmptyDOMElement();
  });

  it("keeps shared preview motion generic and interaction-controlled", () => {
    expect(themeStyles).toContain("animation-play-state: paused");
    expect(themeStyles).toContain(
      ".theme-card-button:is(:hover, :focus-visible, :active)",
    );
    expect(themeStyles).toContain("animation-play-state: running");
    expect(themeStyles).not.toContain("city-pulse__");
    expect(themeStyles).not.toContain("front-row__");
  });

  it("disables every artwork animation for reduced motion", () => {
    for (const css of [themeStyles, cityStyles, frontRowStyles, deepSpaceStyles]) {
      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
      expect(css).toMatch(/animation:\s*none(?:\s*!important)?/);
    }
  });

  it("never uses backdrop-filter over moving artwork", () => {
    expect(
      [themeStyles, cityStyles, frontRowStyles, deepSpaceStyles].join("\n"),
    ).not.toContain("backdrop-filter");
  });

  it("limits will-change to backdrop animation selectors", () => {
    for (const css of [themeStyles, cityStyles, frontRowStyles]) {
      const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*will-change:/g)].map(
        (match) => match[1],
      );
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors) {
        expect(selector).toContain("--backdrop");
        expect(selector).not.toContain("--preview");
      }
    }
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

  it("clips every window to the building coordinate system", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );

    const windows = container.querySelectorAll(
      [
        'rect[fill="var(--artwork-city-window-cyan)"]',
        'rect[fill="var(--artwork-city-window-coral)"]',
      ].join(","),
    );

    expect(windows.length).toBeGreaterThan(100);
    for (const cityWindow of windows) {
      expect(cityWindow.closest("g[clip-path]")).not.toBeNull();
    }
  });

  it("keeps six grouped window cycles and one rare accent", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );

    expect(
      container.querySelectorAll(".city-pulse__window-cycle"),
    ).toHaveLength(6);
    expect(
      container.querySelectorAll(".city-pulse__rare-accent-cycle"),
    ).toHaveLength(1);
    expect(cityStyles).toContain("city-pulse-window-six");
  });

  it("keeps traffic backdrop-only and preserves subtle skyline parallax", () => {
    const backdrop = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );
    const traffic = backdrop.container.querySelectorAll(
      ".city-pulse__traffic-point",
    );
    expect(traffic).toHaveLength(2);
    for (const point of traffic) {
      expect(point.querySelector("animateMotion")).not.toBeNull();
      expect(
        point.querySelector("animate[attributeName='opacity']"),
      ).not.toBeNull();
    }
    backdrop.unmount();

    const preview = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="preview"
      />,
    );
    expect(
      preview.container.querySelector(".city-pulse__traffic-point"),
    ).toBeNull();
    expect(cityStyles).toContain("city-pulse-parallax-far");
    expect(cityStyles).toContain("city-pulse-parallax-near");
  });

  it("uses three atmospheric washes", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="city-pulse"
        mode="dark"
        variant="backdrop"
      />,
    );

    expect(
      container.querySelectorAll(".svg-theme-artwork__wash"),
    ).toHaveLength(3);
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

  it("uses three static seat rows and only one moving screen layer", () => {
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
    expect(
      container.querySelectorAll(".svg-theme-artwork__wash"),
    ).toHaveLength(3);
    expect(frontRowStyles.match(/@keyframes/g)).toHaveLength(1);
    expect(frontRowStyles).toContain(
      ".front-row .svg-theme-artwork__wash",
    );
    expect(frontRowStyles).toMatch(
      /\.front-row \.svg-theme-artwork__wash\s*\{\s*animation:\s*none;/,
    );
  });
});
