import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  MASCOT_POSES,
  MascotPose,
} from "@/src/mascot/MascotPose";

describe("MascotPose", () => {
  it("renders every exported pose as labelled reusable artwork", () => {
    const { container } = render(
      <>
        {MASCOT_POSES.map((pose) => (
          <MascotPose key={pose} pose={pose} data-testid={pose} />
        ))}
      </>,
    );

    expect(screen.getAllByRole("img")).toHaveLength(MASCOT_POSES.length);
    MASCOT_POSES.forEach((pose) => {
      const artwork = screen.getByTestId(pose);
      expect(artwork).toHaveClass("gt-mascot-pose", `gt-mascot-pose-${pose}`);
      expect(artwork).toHaveAttribute(
        "viewBox",
        pose === "sleeping" ? "34 30 250 120" : "0 0 150 150",
      );
      expect(artwork).toHaveAccessibleName();
    });

    const gradientIds = Array.from(
      container.querySelectorAll("linearGradient"),
      (gradient) => gradient.id,
    );
    expect(new Set(gradientIds).size).toBe(MASCOT_POSES.length);
  });

  it("supports decorative, animated and cropped uses", () => {
    const { container } = render(
      <MascotPose
        pose="peeking"
        decorative
        animated
        viewBox="14 40 96 88"
        accent="#ffb020"
      />,
    );
    const artwork = container.querySelector("svg");

    expect(artwork).toHaveAttribute("aria-hidden", "true");
    expect(artwork).not.toHaveAttribute("role");
    expect(artwork).toHaveAttribute("viewBox", "14 40 96 88");
    expect(artwork).toHaveStyle("--gt-mascot-pose-accent: #ffb020");
  });

  it("uses the restrained source animation for animated sitting artwork", () => {
    const { container } = render(<MascotPose pose="sitting" animated />);

    expect(container.querySelector(".gt-pose-breathe")).not.toBeNull();
  });

  it("animates the supplied sleeping pose as separate body, head and tail layers", () => {
    const { container } = render(<MascotPose pose="sleeping" animated />);

    expect(container.querySelector(".gt-pose-sleep")).not.toBeNull();
    expect(container.querySelector(".gt-pose-sleep-head")).not.toBeNull();
    expect(container.querySelector(".gt-pose-sleep-muzzle")).not.toBeNull();
    expect(container.querySelector(".gt-pose-sleep-tail")).not.toBeNull();
    expect(container.querySelectorAll(".gt-pose-snore-mark")).toHaveLength(3);
  });
});
