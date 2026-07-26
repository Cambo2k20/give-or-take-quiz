import { beforeEach, describe, expect, it } from "vitest";
import {
  BACKGROUND_THEME_STORAGE_KEY,
  applyBackgroundTheme,
  readEquippedBackgroundTheme,
} from "@/lib/backgroundTheme";

describe("background theme preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.bgTheme;
  });

  it("applies and removes a known theme in the DOM and storage", () => {
    applyBackgroundTheme("deep-space");

    expect(document.documentElement.dataset.bgTheme).toBe("deep-space");
    expect(window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY)).toBe(
      "deep-space",
    );

    applyBackgroundTheme(null);

    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    expect(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    ).toBeNull();
  });

  it("restores a saved theme onto the root when the app reloads", () => {
    window.localStorage.setItem(
      BACKGROUND_THEME_STORAGE_KEY,
      "deep-space",
    );

    expect(readEquippedBackgroundTheme()).toBe("deep-space");
    expect(document.documentElement.dataset.bgTheme).toBe("deep-space");
  });

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
