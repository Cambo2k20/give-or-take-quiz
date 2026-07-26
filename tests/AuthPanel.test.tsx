import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  resendConfirmation: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: {} },
  leaderboardEnabled: true,
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, ...mocks };
});

const { AuthPanel, ConfirmEmailNotice, NewPasswordForm } = await import(
  "@/src/AuthPanel"
);

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
});

describe("AuthPanel", () => {
  it("opens on sign in with labelled, correctly typed fields", () => {
    render(<AuthPanel />);

    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();

    const email = screen.getByLabelText("Email address");
    const password = screen.getByLabelText("Password");

    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
  });

  it("exposes the modes as a keyboard reachable tablist", async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Sign in" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "Register" }));

    expect(screen.getByRole("tab", { name: "Register" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "Create an account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("announces a validation failure and does not call Supabase", async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "longenough");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Enter a valid email address.");
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("ties the error to the fields with aria-describedby", async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);

    await user.type(screen.getByLabelText("Email address"), "player@x.com");
    await user.type(screen.getByLabelText("Password"), "tiny");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-describedby",
      alert.id,
    );
  });

  it("signs in and reports back to the page", async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();
    mocks.signIn.mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      emailConfirmed: true,
    });

    render(<AuthPanel onSignedIn={onSignedIn} />);

    await user.type(
      screen.getByLabelText("Email address"),
      "player@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "longenough");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    expect(mocks.signIn).toHaveBeenCalledWith(
      "player@example.com",
      "longenough",
    );
  });

  it("shows the failure when the credentials are wrong", async () => {
    const user = userEvent.setup();
    mocks.signIn.mockRejectedValue(
      new Error("That email and password do not match an account."),
    );

    render(<AuthPanel />);

    await user.type(
      screen.getByLabelText("Email address"),
      "player@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email and password do not match an account.",
    );
  });

  it("tells a new account to go and confirm its address", async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();
    mocks.signUp.mockResolvedValue({
      status: "confirmation-sent",
      email: "pending@example.com",
    });

    render(<AuthPanel onSignedIn={onSignedIn} />);

    await user.click(screen.getByRole("tab", { name: "Register" }));
    await user.type(
      screen.getByLabelText("Email address"),
      "pending@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "longenough");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /Check pending@example.com for a confirmation link/,
    );
    // Still unconfirmed, so the page must not treat them as signed in.
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("keeps the reset reply neutral about whether the account exists", async () => {
    const user = userEvent.setup();
    mocks.requestPasswordReset.mockResolvedValue(undefined);

    render(<AuthPanel />);

    await user.click(screen.getByRole("tab", { name: "Forgot password" }));
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Email address"),
      "someone@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "Email me a reset link" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /If someone@example.com has an account, a reset link is on its way./,
    );
  });
});

describe("ConfirmEmailNotice", () => {
  it("offers to resend the confirmation", async () => {
    const user = userEvent.setup();
    mocks.resendConfirmation.mockResolvedValue(undefined);

    render(<ConfirmEmailNotice email="pending@example.com" />);

    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Resend confirmation" }),
    );

    await waitFor(() =>
      expect(mocks.resendConfirmation).toHaveBeenCalledWith(
        "pending@example.com",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sent. Check your inbox.",
    );
  });
});

describe("NewPasswordForm", () => {
  it("rejects a short password before calling Supabase", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();

    render(<NewPasswordForm onDone={onDone} />);

    await user.type(screen.getByLabelText("New password"), "tiny");
    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Use at least 8 characters.",
    );
    expect(mocks.updatePassword).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("saves a valid password and closes the flow", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    mocks.updatePassword.mockResolvedValue(undefined);

    render(<NewPasswordForm onDone={onDone} />);

    await user.type(screen.getByLabelText("New password"), "a-long-password");
    await user.click(screen.getByRole("button", { name: "Save password" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mocks.updatePassword).toHaveBeenCalledWith("a-long-password");
  });
});
