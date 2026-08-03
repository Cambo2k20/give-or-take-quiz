import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

Object.defineProperties(window.HTMLMediaElement.prototype, {
  pause: {
    configurable: true,
    value: () => {},
  },
  play: {
    configurable: true,
    value: () => Promise.resolve(),
  },
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.bgTheme;
  delete document.documentElement.dataset.bgThemeActive;
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute("style");
  vi.unstubAllGlobals();
});
