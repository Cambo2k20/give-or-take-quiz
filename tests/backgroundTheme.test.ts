import { beforeEach, describe, expect, it } from "vitest";
import {
  BACKGROUND_THEME_STORAGE_KEY,
  applyBackgroundTheme,
  readEquippedBackgroundTheme,
} from "@/lib/backgroundTheme";
import {
  BACKGROUND_THEMES,
  BACKGROUND_THEME_TOKEN_NAMES,
} from "@/lib/themes";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  type Theme,
} from "@/src/theme";

type Colour = readonly [number, number, number, number];

function parseColour(value: string): Colour {
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const expanded =
      hex.length === 3
        ? [...hex].map((digit) => `${digit}${digit}`).join("")
        : hex;
    return [
      Number.parseInt(expanded.slice(0, 2), 16),
      Number.parseInt(expanded.slice(2, 4), 16),
      Number.parseInt(expanded.slice(4, 6), 16),
      1,
    ];
  }

  const match = value.match(
    /^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/,
  );
  if (!match) throw new Error(`Unsupported test colour: ${value}`);
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
}

function composite(foreground: Colour, background: Colour): Colour {
  const alpha = foreground[3] + background[3] * (1 - foreground[3]);
  return [
    (foreground[0] * foreground[3] +
      background[0] * background[3] * (1 - foreground[3])) /
      alpha,
    (foreground[1] * foreground[3] +
      background[1] * background[3] * (1 - foreground[3])) /
      alpha,
    (foreground[2] * foreground[3] +
      background[2] * background[3] * (1 - foreground[3])) /
      alpha,
    alpha,
  ];
}

function luminance(colour: Colour): number {
  const [red, green, blue] = colour.slice(0, 3).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: Colour, second: Colour): number {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

describe("background theme preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.bgTheme;
    delete document.documentElement.dataset.theme;
    document.documentElement.removeAttribute("style");
  });

  it.each(["light", "dark"] as const)(
    "applies Deep Space's complete %s palette",
    (mode) => {
      applyTheme(mode);
      applyBackgroundTheme("deep-space");

      const expected = BACKGROUND_THEMES[0].tokens[mode];
      expect(document.documentElement.dataset.bgTheme).toBe("deep-space");
      expect(window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY)).toBe(
        "deep-space",
      );
      for (const name of BACKGROUND_THEME_TOKEN_NAMES) {
        expect(
          document.documentElement.style.getPropertyValue(name),
          name,
        ).toBe(expected[name]);
      }
    },
  );

  it.each(BACKGROUND_THEMES)(
    "defines complete light and dark token palettes for $id",
    (theme) => {
      for (const mode of ["light", "dark"] as const) {
        expect(Object.keys(theme.tokens[mode]).sort()).toEqual(
          [...BACKGROUND_THEME_TOKEN_NAMES].sort(),
        );
      }
    },
  );

  it("gives Front Row a genuinely light, readable auditorium palette", () => {
    const frontRow = BACKGROUND_THEMES.find(
      (theme) => theme.id === "front-row",
    )!;
    const lightBackground = parseColour(
      frontRow.tokens.light["--artwork-bg"],
    );
    const darkBackground = parseColour(
      frontRow.tokens.dark["--artwork-bg"],
    );

    expect(luminance(lightBackground)).toBeGreaterThan(0.65);
    expect(luminance(darkBackground)).toBeLessThan(0.01);
    expect(
      contrast(
        parseColour(frontRow.tokens.light["--ink"]),
        lightBackground,
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["light", "dark"] as const)(
    "applies City Pulse's complete %s palette",
    (mode) => {
      applyTheme(mode);
      applyBackgroundTheme("city-pulse");

      const cityPulse = BACKGROUND_THEMES.find(
        (theme) => theme.id === "city-pulse",
      )!;
      expect(document.documentElement.dataset.bgTheme).toBe("city-pulse");
      for (const name of BACKGROUND_THEME_TOKEN_NAMES) {
        expect(
          document.documentElement.style.getPropertyValue(name),
          name,
        ).toBe(cityPulse.tokens[mode][name]);
      }
    },
  );

  it("switches an equipped theme between palettes without stale tokens", () => {
    applyTheme("light");
    applyBackgroundTheme("deep-space");

    applyTheme("dark");

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.bgTheme).toBe("deep-space");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY)).toBe(
      "deep-space",
    );
    for (const name of BACKGROUND_THEME_TOKEN_NAMES) {
      expect(
        document.documentElement.style.getPropertyValue(name),
        name,
      ).toBe(BACKGROUND_THEMES[0].tokens.dark[name]);
    }
  });

  it("uses restrained, inverted artwork roles for light Deep Space", () => {
    const light = BACKGROUND_THEMES[0].tokens.light;
    const base = parseColour(light["--artwork-bg"]);

    expect(base.slice(0, 3).every((channel) => channel >= 240)).toBe(true);
    expect(light["--artwork-bg"]).not.toBe("#fff");
    expect(light["--artwork-veil"]).toBe("transparent");
    expect(light["--artwork-vignette-inner"]).toBe("transparent");
    expect(light["--artwork-vignette-middle"]).toBe("transparent");
    expect(light["--artwork-vignette-outer"]).toBe("transparent");
    expect(light["--artwork-flow-mask"]).not.toBe("none");

    for (const name of [
      "--artwork-glow-primary",
      "--artwork-glow-cool",
      "--artwork-glow-warm",
      "--artwork-glow-mint",
      "--artwork-orb",
    ] as const) {
      const alpha = parseColour(light[name])[3];
      expect(alpha, name).toBeGreaterThanOrEqual(0.04);
      expect(alpha, name).toBeLessThanOrEqual(0.15);
    }

    for (const name of [
      "--artwork-star",
      "--artwork-star-bright",
      "--artwork-shooting-star",
      "--artwork-shooting-shadow",
      "--artwork-orbit",
      "--artwork-orbit-inner",
      "--artwork-orb-shadow",
    ] as const) {
      const alpha = parseColour(light[name])[3];
      expect(alpha, name).toBeGreaterThanOrEqual(0.02);
      expect(alpha, name).toBeLessThanOrEqual(0.08);
    }
  });

  it.each(["light", "dark"] as const)(
    "keeps body and muted text above 4.5:1 over busy %s artwork",
    (mode) => {
      const tokens = BACKGROUND_THEMES[0].tokens[mode];
      // Conservatively overlap the two strongest nebula forms, then composite
      // the translucent card surface over that busiest plausible background.
      const busyArtwork = composite(
        parseColour(tokens["--artwork-glow-cool"]),
        composite(
          parseColour(tokens["--artwork-glow-primary"]),
          parseColour(tokens["--artwork-bg"]),
        ),
      );
      const surface = composite(
        parseColour(tokens["--surface"]),
        busyArtwork,
      );

      expect(contrast(parseColour(tokens["--ink"]), surface)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(parseColour(tokens["--muted"]), surface),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("removes the theme and every inline theme token", () => {
    applyTheme("dark");
    applyBackgroundTheme("deep-space");

    applyBackgroundTheme(null);

    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    expect(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ).toBeNull();
    for (const name of BACKGROUND_THEME_TOKEN_NAMES) {
      expect(
        document.documentElement.style.getPropertyValue(name),
        name,
      ).toBe("");
    }
  });

  it.each(["light", "dark"] as readonly Theme[])(
    "restores a saved theme with the saved %s preference",
    (mode) => {
      applyTheme(mode);
      window.localStorage.setItem(
        BACKGROUND_THEME_STORAGE_KEY,
        "deep-space",
      );

      expect(readEquippedBackgroundTheme()).toBe("deep-space");
      expect(document.documentElement.dataset.bgTheme).toBe("deep-space");
      expect(document.documentElement.style.getPropertyValue("--bg")).toBe(
        BACKGROUND_THEMES[0].tokens[mode]["--bg"],
      );
    },
  );

  it("rejects and removes unknown theme ids", () => {
    document.documentElement.dataset.bgTheme = "invented-theme";
    window.localStorage.setItem(
      BACKGROUND_THEME_STORAGE_KEY,
      "invented-theme",
    );

    expect(readEquippedBackgroundTheme()).toBeNull();
    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    expect(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ).toBeNull();

    applyBackgroundTheme("still-invented");
    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    expect(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ).toBeNull();
  });
});
