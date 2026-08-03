import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "@/src/BrandMark";

describe("BrandMark", () => {
  it("renders inline theme-aware logo layers", () => {
    const { container } = render(<BrandMark />);
    const logo = container.querySelector("svg.wordmark-mark");

    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute("aria-hidden", "true");
    expect(logo?.querySelector(".brand-mark-outer")).not.toBeNull();
    expect(logo?.querySelector(".brand-mark-middle")).not.toBeNull();
    expect(logo?.querySelector(".brand-mark-inner")).not.toBeNull();
    expect(logo?.querySelector(".brand-mark-core")).not.toBeNull();
    expect(logo?.querySelector(".brand-mark-symbol")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
