import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Game from "@/src/Game";
import { readBestScores } from "@/lib/game";

function categoryButton(mode: "Geography" | "History" | "Mixed") {
  const label = screen.getByText(mode, { exact: true, selector: "strong" });
  const button = label.closest("button");

  if (!button) {
    throw new Error(`The ${mode} label is not inside a button.`);
  }
  return button;
}

async function startGame(
  user: ReturnType<typeof userEvent.setup>,
  mode: "Geography" | "History" | "Mixed",
) {
  await user.click(categoryButton(mode));
  expect(
    await screen.findByRole("button", { name: /lock in guess/i }),
  ).toBeEnabled();
}

async function completeRound(
  user: ReturnType<typeof userEvent.setup>,
  mode: "Geography" | "History" | "Mixed" = "History",
) {
  await startGame(user, mode);

  for (let questionNumber = 1; questionNumber <= 10; questionNumber += 1) {
    await user.click(
      await screen.findByRole("button", { name: /lock in guess/i }),
    );

    const advanceLabel =
      questionNumber === 10 ? /see results/i : /next question/i;
    await user.click(
      await screen.findByRole("button", { name: advanceLabel }),
    );
  }

  expect(
    await screen.findByRole("heading", { name: /final score/i }),
  ).toBeInTheDocument();
}

describe("Game", () => {
  it("starts each category from the category chooser", async () => {
    const user = userEvent.setup();
    render(<Game />);

    expect(
      screen.getByRole("heading", { name: /how close can you get\?/i }),
    ).toBeInTheDocument();
    expect(categoryButton("Geography")).toBeInTheDocument();
    expect(categoryButton("History")).toBeInTheDocument();
    expect(categoryButton("Mixed")).toBeInTheDocument();

    await startGame(user, "Geography");

    expect(
      screen.queryByRole("heading", { name: /how close can you get\?/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("locks the submitted guess before revealing the answer", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user, "History");

    const slider = screen.getByRole("slider");
    await user.click(screen.getByRole("button", { name: /lock in guess/i }));

    expect(slider).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /lock in guess/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next question/i }),
    ).toBeInTheDocument();
  });

  it("shows a complete results summary, saves the best score, and restarts", async () => {
    const user = userEvent.setup();
    render(<Game />);

    await completeRound(user, "History");

    expect(
      screen.getByRole("heading", { name: /question by question/i }),
    ).toBeInTheDocument();
    expect(readBestScores(window.localStorage).history).toEqual(
      expect.any(Number),
    );

    await user.click(screen.getByRole("button", { name: /play again/i }));

    expect(
      screen.queryByRole("heading", { name: /final score/i }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /lock in guess/i }),
    ).toBeEnabled();
  });

  it("plays the hero demo without banking a score", async () => {
    const user = userEvent.setup();
    render(<Game />);

    // The slider is on the home page itself, before any category is chosen.
    expect(screen.getByRole("slider")).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /check my guess/i }));

    expect(screen.getByRole("slider")).toBeDisabled();
    expect(screen.getByText(/^Answer$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /play a full round/i }),
    ).toBeInTheDocument();

    // A warm-up must not touch the stored best scores.
    expect(readBestScores(window.localStorage)).toEqual(
      expect.objectContaining({ mixed: 0 }),
    );
  });

  it("re-arms the hero demo when another question is requested", async () => {
    const user = userEvent.setup();
    render(<Game />);

    await user.click(screen.getByRole("button", { name: /check my guess/i }));
    await user.click(screen.getByRole("button", { name: /try another/i }));

    expect(screen.getByRole("slider")).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /check my guess/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /play a full round/i }),
    ).not.toBeInTheDocument();
  });

  it("starts a mixed round from the hero demo", async () => {
    const user = userEvent.setup();
    render(<Game />);

    await user.click(screen.getByRole("button", { name: /check my guess/i }));
    await user.click(
      screen.getByRole("button", { name: /play a full round/i }),
    );

    expect(
      await screen.findByRole("button", { name: /lock in guess/i }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("heading", { name: /how close can you get\?/i }),
    ).not.toBeInTheDocument();
  });

  it("copies the result when Web Share is unavailable, then returns to categories", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(window.navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    const mockNavigator = Object.create(window.navigator) as Navigator;
    Object.defineProperties(mockNavigator, {
      clipboard: {
        configurable: true,
        value: window.navigator.clipboard,
      },
      share: {
        configurable: true,
        value: undefined,
      },
    });
    vi.stubGlobal("navigator", mockNavigator);

    render(<Game />);
    await completeRound(user, "Mixed");

    await user.click(screen.getByRole("button", { name: /share result/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledOnce();
      expect(writeText.mock.calls[0]?.[0]).toEqual(expect.any(String));
      expect(writeText.mock.calls[0]?.[0].length).toBeGreaterThan(0);
    });

    await user.click(
      screen.getByRole("button", { name: /change category/i }),
    );
    expect(
      await screen.findByRole("heading", {
        name: /how close can you get\?/i,
      }),
    ).toBeInTheDocument();
  });
});
