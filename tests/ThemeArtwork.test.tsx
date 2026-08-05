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
const auroraDriftStyles = readFileSync(
  resolve("src/themes/aurora-drift.css"),
  "utf8",
);
const moonlitLibraryStyles = readFileSync(
  resolve("src/themes/moonlit-library.css"),
  "utf8",
);
const firstLightStyles = readFileSync(
  resolve("src/themes/first-light.css"),
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
    for (const css of [
      themeStyles,
      cityStyles,
      frontRowStyles,
      deepSpaceStyles,
      auroraDriftStyles,
      moonlitLibraryStyles,
      firstLightStyles,
    ]) {
      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
      expect(css).toMatch(/animation:\s*none(?:\s*!important)?/);
    }
  });

  it("never uses backdrop-filter over moving artwork", () => {
    expect(
      [
        themeStyles,
        cityStyles,
        frontRowStyles,
        deepSpaceStyles,
        auroraDriftStyles,
        moonlitLibraryStyles,
        firstLightStyles,
      ].join("\n"),
    ).not.toContain("backdrop-filter");
  });

  it("limits will-change to backdrop animation selectors", () => {
    for (const css of [
      themeStyles,
      cityStyles,
      frontRowStyles,
      auroraDriftStyles,
      moonlitLibraryStyles,
      firstLightStyles,
    ]) {
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

describe("Aurora Drift artwork", () => {
  it("keeps two aurora ribbons, two star fields and two improved meteors", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="aurora-drift"
        mode="dark"
        variant="backdrop"
      />,
    );

    expect(container.querySelectorAll(".aurora-drift__ribbon")).toHaveLength(2);
    expect(container.querySelectorAll(".aurora-drift__stars")).toHaveLength(2);
    expect(container.querySelectorAll(".aurora-drift__meteor")).toHaveLength(2);
    expect(auroraDriftStyles).toContain("aurora-drift-meteor");
    expect(auroraDriftStyles).toContain("aurora-drift-wave");
  });

  it("renders a locked, motion-paused gallery preview", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="aurora-drift"
        mode="dark"
        variant="preview"
        locked
      />,
    );

    expect(container.querySelector(".aurora-drift--preview")).toHaveClass(
      "is-locked",
    );
    expect(container.querySelector(".aurora-drift__lock")).not.toBeNull();
    expect(themeStyles).toContain(".aurora-drift--preview *");
  });
});

describe("Moonlit Library artwork", () => {
  it("preserves the complete room composition", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="moonlit-library"
        mode="dark"
        variant="backdrop"
      />,
    );

    expect(
      container.querySelectorAll(".moonlit-library__bookcase"),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll(".moonlit-library__shelf"),
    ).toHaveLength(19);
    expect(
      container.querySelectorAll(
        ".moonlit-library__book, .moonlit-library__book-gap",
      ),
    ).toHaveLength(229);
    expect(
      container.querySelectorAll(".moonlit-library__beam"),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll(".moonlit-library__dust > span"),
    ).toHaveLength(58);
    expect(
      container.querySelectorAll(".moonlit-library__leaf"),
    ).toHaveLength(3);
  });

  it("keeps beam, dust and page motion with a reduced-motion fallback", () => {
    expect(moonlitLibraryStyles).toContain("moonlit-library-sway");
    expect(moonlitLibraryStyles).toContain("moonlit-library-drift");
    expect(moonlitLibraryStyles).toContain("moonlit-library-flutter");
    expect(moonlitLibraryStyles).toContain(
      "@media (prefers-reduced-motion: reduce)",
    );
    expect(moonlitLibraryStyles).toMatch(
      /\.moonlit-library \*[\s\S]*animation:\s*none !important/,
    );
  });

  it("renders a locked preview with its real artwork paused", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="moonlit-library"
        mode="dark"
        variant="preview"
        locked
      />,
    );

    expect(container.querySelector(".moonlit-library--preview")).toHaveClass(
      "is-locked",
    );
    expect(container.querySelector(".moonlit-library__lock")).not.toBeNull();
    expect(moonlitLibraryStyles).toContain(
      ".moonlit-library--preview *",
    );
    expect(moonlitLibraryStyles).toContain(
      "animation-play-state: paused",
    );
  });
});

describe("First Light SVG artwork", () => {
  it("uses the approved bottom-anchored scene and every supplied silhouette asset", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="first-light"
        mode="dark"
        variant="backdrop"
      />,
    );

    const svg = container.querySelector(".first-light__scene");
    expect(svg).toHaveAttribute("viewBox", "0 0 1600 900");
    expect(svg).toHaveAttribute(
      "preserveAspectRatio",
      "xMidYMax slice",
    );
    expect(
      container.querySelectorAll("mask[data-first-light-asset]"),
    ).toHaveLength(16);
    expect(container.querySelectorAll(".first-light__hero")).toHaveLength(3);
    expect(
      container.querySelectorAll(".first-light__foreground rect[mask]"),
    ).toHaveLength(10);
    expect(
      container.querySelectorAll(".first-light__category-foliage"),
    ).toHaveLength(2);
    expect(container.querySelectorAll(".first-light__edge-bank")).toHaveLength(
      2,
    );
    expect(container.querySelectorAll(".first-light__phone-edge")).toHaveLength(
      2,
    );
    expect(container.querySelector("[data-first-light-starfield]")).not.toBeNull();
    expect(
      container.querySelectorAll("[data-first-light-starfield] circle"),
    ).toHaveLength(210);
    expect(
      container.querySelector("[data-first-light-morning-star]"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll("[data-first-light-constellation]"),
    ).toHaveLength(3);
    expect(container.querySelectorAll(".first-light__meteor")).toHaveLength(3);

    const ridge = container.querySelector(".first-light__ridge");
    expect(ridge).toHaveAttribute("x", "-200");
    expect(ridge).toHaveAttribute("y", "205");
    expect(ridge).toHaveAttribute("width", "2000");
    expect(ridge).toHaveAttribute("height", "250");
    expect(ridge).toHaveAttribute("opacity", "1");
    expect(
      ridge?.querySelector("path[data-first-light-ridge-path]"),
    ).not.toBeNull();
    const dawn = container.querySelector(".first-light__dawn");
    expect(dawn?.nextElementSibling).toBe(ridge);
    const treeline = container.querySelector(".first-light__treeline");
    expect(treeline).toHaveAttribute("x", "0");
    expect(treeline).toHaveAttribute("y", "350");
    expect(treeline).toHaveAttribute("width", "1952");
    expect(treeline).toHaveAttribute("height", "122");
    expect(treeline).toHaveAttribute("opacity", "0.95");
    expect(
      treeline?.querySelector("path[data-first-light-treeline-path]"),
    ).not.toBeNull();
  });

  it("keeps motion transform-and-opacity-only with a complete reduced-motion frame", () => {
    expect(firstLightStyles).not.toContain("filter:");
    expect(firstLightStyles.match(/will-change:/g)).toHaveLength(1);
    expect(firstLightStyles).toContain(
      "animation: first-light-desktop-cross 110s linear infinite;",
    );
    expect(firstLightStyles).toContain(
      "animation: first-light-phone-cross 80s linear infinite;",
    );
    expect(firstLightStyles).toContain(
      "animation: first-light-meteor-cross 37s linear -9s infinite;",
    );
    expect(firstLightStyles).toContain("@keyframes first-light-star-glimmer");
    expect(firstLightStyles).toContain("@keyframes first-light-morning-star");
    expect(firstLightStyles).toContain("@keyframes first-light-meteor-cross");
    expect(firstLightStyles).not.toContain("linear -55s infinite");
    expect(firstLightStyles).not.toContain("linear -40s infinite");
    expect(firstLightStyles).toContain(
      ".first-light.svg-theme-artwork--backdrop",
    );
    expect(firstLightStyles).toContain(
      ".first-light.svg-theme-artwork--preview",
    );
    expect(firstLightStyles).not.toContain(".first-light--backdrop");
    expect(firstLightStyles).toContain(
      "@container first-light (max-aspect-ratio: 4 / 3) and (min-width: 601px)",
    );
    expect(firstLightStyles).toContain(
      "@container first-light (min-width: 721px) and (min-aspect-ratio: 3 / 4) and (max-aspect-ratio: 4 / 3)",
    );
    expect(firstLightStyles).toMatch(
      /min-width: 721px[\s\S]*\.first-light\.svg-theme-artwork--backdrop \.first-light__hero--wide[\s\S]*display:\s*none/,
    );
    expect(firstLightStyles).toContain(
      ".first-light__category-foliage--left",
    );
    expect(firstLightStyles).toContain(".first-light__phone-edge--right");
    expect(firstLightStyles).not.toContain(".first-light--preview");
    expect(firstLightStyles).toContain(
      "@media (prefers-reduced-motion: reduce)",
    );
    expect(firstLightStyles).toMatch(
      /\.first-light \*[\s\S]*animation:\s*none !important/,
    );
  });

  it("renders a locked square preview with the real scene", () => {
    const { container } = render(
      <ThemeArtwork
        themeId="first-light"
        mode="dark"
        variant="preview"
        locked
      />,
    );

    expect(container.querySelector(".first-light")).toHaveClass(
      "svg-theme-artwork--preview",
      "is-locked",
    );
    expect(container.querySelector(".svg-theme-artwork__lock")).not.toBeNull();
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
