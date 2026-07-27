import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_THEME_STORAGE_KEY,
  applyBackgroundTheme,
  readActiveBackgroundTheme,
  readEquippedBackgroundTheme,
  resolveThemeMode,
} from "@/lib/backgroundTheme";
import {
  BACKGROUND_THEMES,
  BACKGROUND_THEME_UI_TOKEN_NAMES,
  defineBackgroundTheme,
  getThemeModeVariant,
  isThemeSupportedInMode,
  supportedModesForTheme,
  type BackgroundThemeMetadata,
  type BackgroundThemeModes,
  type BackgroundThemeUiTokenPalette,
} from "@/lib/themes";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  subscribeToSystemTheme,
} from "@/src/theme";

type Colour = readonly [number, number, number, number];
type TestTokens = Readonly<Record<string, string>>;

const globalsCss = readFileSync(resolve("src/globals.css"), "utf8");
const deepSpace = BACKGROUND_THEMES.find(
  (theme) => theme.id === "deep-space",
)!;
const deepSpaceDark = getThemeModeVariant(deepSpace, "dark")!;

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

function extractCssTokens(selector: string): TestTokens {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = globalsCss.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`Missing CSS token block: ${selector}`);

  return Object.fromEntries(
    [...block[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
}

function expectAccessiblePalette(
  label: string,
  tokens: TestTokens,
) {
  const background = parseColour(tokens["--bg"]);
  const surface = composite(parseColour(tokens["--surface"]), background);

  for (const name of ["--ink", "--muted"] as const) {
    expect.soft(
      contrast(parseColour(tokens[name]), surface),
      `${label} ${name} on surface`,
    ).toBeGreaterThanOrEqual(4.5);
  }

  for (const accent of ["--accent", "--accent-hover"] as const) {
    expect.soft(
      contrast(
        parseColour(tokens["--on-accent"]),
        parseColour(tokens[accent]),
      ),
      `${label} --on-accent on ${accent}`,
    ).toBeGreaterThanOrEqual(4.5);
  }

  expect.soft(
    contrast(parseColour(tokens["--accent"]), surface),
    `${label} focus accent on surface`,
  ).toBeGreaterThanOrEqual(3);

  for (const name of ["--good", "--warn", "--bad"] as const) {
    const wash = composite(
      parseColour(tokens[`${name}-wash`]),
      surface,
    );
    expect.soft(
      contrast(parseColour(tokens[name]), wash),
      `${label} ${name} on its wash`,
    ).toBeGreaterThanOrEqual(4.5);
  }
}

function modeFixture(
  id: string,
  modes: BackgroundThemeModes,
) {
  return defineBackgroundTheme({
    id,
    name: id,
    description: "Theme contract fixture",
    gate: { category: "geography", rank: 5 },
    modes,
  });
}

describe("background theme mode contract", () => {
  it("gates Aurora Drift at Space rank 10", () => {
    expect(
      BACKGROUND_THEMES.find((theme) => theme.id === "aurora-drift")?.gate,
    ).toEqual({ category: "space", rank: 10 });
  });

  it("defines every shipped theme as dark-only for now", () => {
    for (const theme of BACKGROUND_THEMES) {
      expect(supportedModesForTheme(theme), theme.id).toEqual(["dark"]);
      expect(isThemeSupportedInMode(theme, "light")).toBe(false);
      expect(isThemeSupportedInMode(theme, "dark")).toBe(true);
    }
  });

  it("supports light-only and dual-mode definitions without a second mode list", () => {
    const lightOnly = modeFixture("light-fixture", {
      light: deepSpaceDark,
    });
    const dual = modeFixture("dual-fixture", {
      light: deepSpaceDark,
      dark: deepSpaceDark,
    });

    expect(supportedModesForTheme(lightOnly)).toEqual(["light"]);
    expect(getThemeModeVariant(lightOnly, "dark")).toBeUndefined();
    expect(isThemeSupportedInMode(lightOnly, "light")).toBe(true);
    expect(supportedModesForTheme(dual)).toEqual(["light", "dark"]);
    expect(getThemeModeVariant(dual, "light")).toBe(deepSpaceDark);
    expect(getThemeModeVariant(dual, "dark")).toBe(deepSpaceDark);
  });

  it("rejects invalid runtime definitions with no mode or mismatched artwork keys", () => {
    expect(() =>
      defineBackgroundTheme({
        id: "empty-fixture",
        name: "Empty fixture",
        description: "Invalid runtime fixture",
        gate: { category: "geography", rank: 5 },
        modes: {},
      } as unknown as BackgroundThemeMetadata),
    ).toThrow(/must support at least one mode/i);

    expect(() =>
      modeFixture("mismatched-fixture", {
        light: deepSpaceDark,
        dark: {
          ...deepSpaceDark,
          artwork: {
            ...deepSpaceDark.artwork,
            "--artwork-dark-only": "#000",
          },
        },
      }),
    ).toThrow(
      'Background theme "mismatched-fixture" must use the same artwork tokens in light and dark modes.',
    );
  });

  it.each(BACKGROUND_THEMES)(
    "$id supplies a complete UI palette and theme-local artwork palette for every supported mode",
    (theme) => {
      for (const mode of supportedModesForTheme(theme)) {
        const variant = getThemeModeVariant(theme, mode)!;
        expect(Object.keys(variant.ui).sort()).toEqual(
          [...BACKGROUND_THEME_UI_TOKEN_NAMES].sort(),
        );
        expect(Object.keys(variant.artwork).length).toBeGreaterThan(0);
        for (const name of Object.keys(variant.artwork)) {
          expect(name).toMatch(/^--artwork-/);
        }
      }
    },
  );

  it.each(BACKGROUND_THEMES)(
    "$id uses matching artwork keys if it supports both modes",
    (theme) => {
      const light = getThemeModeVariant(theme, "light");
      const dark = getThemeModeVariant(theme, "dark");
      if (!light || !dark) return;
      expect(Object.keys(light.artwork).sort()).toEqual(
        Object.keys(dark.artwork).sort(),
      );
    },
  );
});

describe("background theme preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.bgTheme;
    delete document.documentElement.dataset.bgThemeActive;
    delete document.documentElement.dataset.theme;
    document.documentElement.removeAttribute("style");
  });

  it.each(BACKGROUND_THEMES)(
    "applies $id's complete dark UI palette without leaking artwork tokens",
    (theme) => {
      applyTheme("dark");
      applyBackgroundTheme(theme.id);
      const expected = getThemeModeVariant(theme, "dark")!;

      expect(document.documentElement.dataset.bgTheme).toBe(theme.id);
      expect(document.documentElement.dataset.bgThemeActive).toBe(theme.id);
      expect(readActiveBackgroundTheme()).toBe(theme.id);
      expect(window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY)).toBe(
        theme.id,
      );
      for (const name of BACKGROUND_THEME_UI_TOKEN_NAMES) {
        expect(
          document.documentElement.style.getPropertyValue(name),
          name,
        ).toBe(expected.ui[name]);
      }
      for (const name of Object.keys(expected.artwork)) {
        expect(document.documentElement.style.getPropertyValue(name)).toBe("");
      }
    },
  );

  it.each(BACKGROUND_THEMES)(
    "keeps $id selected but inactive in unsupported light mode",
    (theme) => {
      applyTheme("light");
      applyBackgroundTheme(theme.id);

      expect(document.documentElement.dataset.bgTheme).toBe(theme.id);
      expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();
      expect(readActiveBackgroundTheme()).toBeNull();
      expect(window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY)).toBe(
        theme.id,
      );
      for (const name of BACKGROUND_THEME_UI_TOKEN_NAMES) {
        expect(document.documentElement.style.getPropertyValue(name)).toBe("");
      }
    },
  );

  it.each(BACKGROUND_THEMES)(
    "restores $id automatically after crossing an unsupported mode",
    (theme) => {
      applyTheme("dark");
      applyBackgroundTheme(theme.id);

      applyTheme("light");
      expect(document.documentElement.dataset.bgTheme).toBe(theme.id);
      expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();
      for (const name of BACKGROUND_THEME_UI_TOKEN_NAMES) {
        expect(document.documentElement.style.getPropertyValue(name)).toBe("");
      }

      applyTheme("dark");
      expect(document.documentElement.dataset.bgTheme).toBe(theme.id);
      expect(document.documentElement.dataset.bgThemeActive).toBe(theme.id);
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      expect(window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY)).toBe(
        theme.id,
      );
    },
  );

  it.each(BACKGROUND_THEMES)(
    "restores saved $id selection without activating it in light mode",
    (theme) => {
      applyTheme("light");
      window.localStorage.setItem(BACKGROUND_THEME_STORAGE_KEY, theme.id);

      expect(readEquippedBackgroundTheme()).toBe(theme.id);
      expect(document.documentElement.dataset.bgTheme).toBe(theme.id);
      expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();

      applyTheme("dark");
      expect(document.documentElement.dataset.bgThemeActive).toBe(theme.id);
    },
  );

  it("removes a selected theme and every inline UI token", () => {
    applyTheme("dark");
    applyBackgroundTheme(deepSpace.id);

    applyBackgroundTheme(null);

    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();
    expect(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ).toBeNull();
    for (const name of BACKGROUND_THEME_UI_TOKEN_NAMES) {
      expect(document.documentElement.style.getPropertyValue(name)).toBe("");
    }
  });

  it("rejects and removes unknown theme ids", () => {
    document.documentElement.dataset.bgTheme = "invented-theme";
    document.documentElement.dataset.bgThemeActive = "invented-theme";
    window.localStorage.setItem(
      BACKGROUND_THEME_STORAGE_KEY,
      "invented-theme",
    );

    expect(readEquippedBackgroundTheme()).toBeNull();
    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();
    expect(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ).toBeNull();

    applyBackgroundTheme("still-invented");
    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
  });

  it("resolves root mode before system preference and follows unsaved system changes", () => {
    const listeners: Array<(event: { matches: boolean }) => void> = [];
    const media = {
      matches: true,
      addEventListener: vi.fn(
        (_name: string, listener: (event: { matches: boolean }) => void) => {
          listeners.push(listener);
        },
      ),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => media));

    expect(resolveThemeMode()).toBe("dark");
    document.documentElement.dataset.theme = "light";
    expect(resolveThemeMode()).toBe("light");

    const onChange = vi.fn();
    const unsubscribe = subscribeToSystemTheme(onChange);
    listeners[0]({ matches: false });
    expect(onChange).toHaveBeenCalledWith("light");

    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    listeners[0]({ matches: true });
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});

describe("theme palette contrast", () => {
  it.each([
    ["base light", extractCssTokens(":root")],
    ["base dark", extractCssTokens(':root[data-theme="dark"]')],
  ])("%s meets the shared text, action, focus and feedback bars", (label, tokens) => {
    expectAccessiblePalette(label, tokens);
  });

  it.each(
    BACKGROUND_THEMES.flatMap((theme) =>
      supportedModesForTheme(theme).map((mode) => [
        `${theme.id} ${mode}`,
        getThemeModeVariant(theme, mode)!.ui,
      ] as const),
    ),
  )("%s meets the shared text, action, focus and feedback bars", (label, tokens) => {
    expectAccessiblePalette(
      label,
      tokens as BackgroundThemeUiTokenPalette,
    );
  });
});
