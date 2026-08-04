import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCountUp } from "@/src/questionText";

function CountUpHarness({ target }: { target: number }) {
  return <span data-testid="counted-value">{useCountUp(target, true)}</span>;
}

describe("useCountUp", () => {
  it("never renders a negative value when the first frame predates the start timestamp", () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(performance, "now").mockReturnValue(1_000);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    render(<CountUpHarness target={1_000} />);

    act(() => frames.shift()?.(999));
    expect(screen.getByTestId("counted-value")).toHaveTextContent("0");

    act(() => frames.shift()?.(1_550));
    expect(screen.getByTestId("counted-value")).toHaveTextContent("1000");
  });
});
