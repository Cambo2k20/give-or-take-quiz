import { beforeEach, describe, expect, it, vi } from "vitest";

const { authApi, fromApi } = vi.hoisted(() => ({
  authApi: {
    getSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    resend: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  fromApi: { upsert: vi.fn() },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: authApi,
    from: () => ({ upsert: fromApi.upsert }),
  },
  leaderboardEnabled: true,
}));

const {
  currentUser,
  emailError,
  onAuthChange,
  passwordError,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  toAuthUser,
  updatePassword,
} = await import("@/lib/auth");
const { joinLeaderboard } = await import("@/lib/leaderboard");

const confirmedUser = {
  id: "user-1",
  email: "player@example.com",
  email_confirmed_at: "2026-07-25T10:00:00Z",
};

const unconfirmedUser = {
  id: "user-2",
  email: "pending@example.com",
  email_confirmed_at: null,
};

beforeEach(() => {
  for (const fn of Object.values(authApi)) fn.mockReset();
  fromApi.upsert.mockReset();
});

describe("credential validation", () => {
  it("rejects empty and malformed addresses", () => {
    expect(emailError("")).toBe("Enter your email address.");
    expect(emailError("   ")).toBe("Enter your email address.");
    expect(emailError("not-an-email")).toBe("Enter a valid email address.");
    expect(emailError("no@domain")).toBe("Enter a valid email address.");
  });

  it("accepts an ordinary address, ignoring surrounding space", () => {
    expect(emailError("player@example.com")).toBeNull();
    expect(emailError("  player@example.com  ")).toBeNull();
  });

  it("requires a password of at least eight characters", () => {
    expect(passwordError("")).toBe("Enter a password.");
    expect(passwordError("short")).toBe("Use at least 8 characters.");
    expect(passwordError("longenough")).toBeNull();
  });
});

describe("toAuthUser", () => {
  it("reports whether the address has been confirmed", () => {
    expect(toAuthUser(confirmedUser as never)?.emailConfirmed).toBe(true);
    expect(toAuthUser(unconfirmedUser as never)?.emailConfirmed).toBe(false);
    expect(toAuthUser(null)).toBeNull();
  });
});

describe("signUp", () => {
  it("reports that a confirmation email was sent when no session comes back", async () => {
    authApi.signUp.mockResolvedValue({
      data: { user: unconfirmedUser, session: null },
      error: null,
    });

    await expect(signUp("pending@example.com", "longenough")).resolves.toEqual({
      status: "confirmation-sent",
      email: "pending@example.com",
    });
  });

  it("signs straight in when confirmation is switched off", async () => {
    authApi.signUp.mockResolvedValue({
      data: { user: confirmedUser, session: { access_token: "t" } },
      error: null,
    });

    const outcome = await signUp("player@example.com", "longenough");

    expect(outcome.status).toBe("signed-in");
  });

  it("validates before making a request", async () => {
    await expect(signUp("nope", "longenough")).rejects.toThrow(
      "Enter a valid email address.",
    );
    await expect(signUp("player@example.com", "tiny")).rejects.toThrow(
      "Use at least 8 characters.",
    );
    expect(authApi.signUp).not.toHaveBeenCalled();
  });

  it("surfaces the failure when the address is already taken", async () => {
    authApi.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });

    await expect(signUp("player@example.com", "longenough")).rejects.toThrow(
      "User already registered",
    );
  });
});

describe("signIn", () => {
  it("returns the user on success", async () => {
    authApi.signInWithPassword.mockResolvedValue({
      data: { user: confirmedUser, session: { access_token: "t" } },
      error: null,
    });

    await expect(signIn("player@example.com", "longenough")).resolves.toEqual({
      id: "user-1",
      email: "player@example.com",
      emailConfirmed: true,
    });
  });

  it("rewrites the deliberately vague credential error", async () => {
    authApi.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    await expect(signIn("player@example.com", "longenough")).rejects.toThrow(
      "That email and password do not match an account.",
    );
  });
});

describe("signOut", () => {
  it("throws when the sign out fails", async () => {
    authApi.signOut.mockResolvedValue({ error: { message: "network down" } });
    await expect(signOut()).rejects.toThrow("network down");

    authApi.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
  });
});

describe("password reset", () => {
  it("asks Supabase for a reset link", async () => {
    authApi.resetPasswordForEmail.mockResolvedValue({ error: null });

    await requestPasswordReset("  player@example.com  ");

    expect(authApi.resetPasswordForEmail).toHaveBeenCalledWith(
      "player@example.com",
      expect.objectContaining({ redirectTo: expect.any(String) }),
    );
  });

  it("validates the address before asking", async () => {
    await expect(requestPasswordReset("nope")).rejects.toThrow(
      "Enter a valid email address.",
    );
    expect(authApi.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("enforces the length rule when setting a new password", async () => {
    await expect(updatePassword("tiny")).rejects.toThrow(
      "Use at least 8 characters.",
    );
    expect(authApi.updateUser).not.toHaveBeenCalled();

    authApi.updateUser.mockResolvedValue({ error: null });
    await expect(updatePassword("longenough")).resolves.toBeUndefined();
  });
});

describe("currentUser", () => {
  it("reads the stored session", async () => {
    authApi.getSession.mockResolvedValue({
      data: { session: { user: confirmedUser } },
    });

    await expect(currentUser()).resolves.toMatchObject({ id: "user-1" });
  });

  it("is null when signed out", async () => {
    authApi.getSession.mockResolvedValue({ data: { session: null } });
    await expect(currentUser()).resolves.toBeNull();
  });
});

describe("onAuthChange", () => {
  it("forwards the user and event, and unsubscribes when told to", () => {
    const unsubscribe = vi.fn();
    let emit: ((event: string, session: unknown) => void) | undefined;
    authApi.onAuthStateChange.mockImplementation((handler) => {
      emit = handler;
      return { data: { subscription: { unsubscribe } } };
    });

    const seen: Array<[string | null, string]> = [];
    const stop = onAuthChange((user, event) => {
      seen.push([user?.id ?? null, event]);
    });

    emit?.("SIGNED_IN", { user: confirmedUser });
    emit?.("SIGNED_OUT", null);

    expect(seen).toEqual([
      ["user-1", "SIGNED_IN"],
      [null, "SIGNED_OUT"],
    ]);

    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("leaderboard identity requires a confirmed account", () => {
  it("refuses to claim a name while signed out", async () => {
    authApi.getSession.mockResolvedValue({ data: { session: null } });

    await expect(joinLeaderboard("Cartographer")).rejects.toThrow(
      "Sign in to claim a name on the leaderboard.",
    );
    expect(fromApi.upsert).not.toHaveBeenCalled();
  });

  it("refuses to claim a name before the address is confirmed", async () => {
    authApi.getSession.mockResolvedValue({
      data: { session: { user: unconfirmedUser } },
    });

    await expect(joinLeaderboard("Cartographer")).rejects.toThrow(
      "Confirm your email address first.",
    );
    expect(fromApi.upsert).not.toHaveBeenCalled();
  });

  it("claims the name for a confirmed account", async () => {
    authApi.getSession.mockResolvedValue({
      data: { session: { user: confirmedUser } },
    });
    fromApi.upsert.mockResolvedValue({ error: null });

    await expect(joinLeaderboard("Cartographer")).resolves.toEqual({
      id: "user-1",
      displayName: "Cartographer",
      avatarKey: "event-horizon",
    });
    expect(fromApi.upsert).toHaveBeenCalledWith(
      { id: "user-1", display_name: "Cartographer" },
      { onConflict: "id" },
    );
  });

  it("explains a display name collision", async () => {
    authApi.getSession.mockResolvedValue({
      data: { session: { user: confirmedUser } },
    });
    fromApi.upsert.mockResolvedValue({
      error: { code: "23505", message: "duplicate key" },
    });

    await expect(joinLeaderboard("Cartographer")).rejects.toThrow(
      '"Cartographer" is taken. Try another name.',
    );
  });
});
