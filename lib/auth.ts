import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Email and password authentication. The game itself never requires an
 * account: signing in only buys a leaderboard identity, and the database
 * refuses to record a round until the address has been confirmed.
 *
 * Only the publishable key is ever used here. Nothing in this module needs, or
 * has access to, the service role key.
 */

export type AuthUser = {
  id: string;
  email: string | null;
  /** Until this is true the account cannot claim a name or record a round. */
  emailConfirmed: boolean;
};

export type SignUpOutcome =
  | { status: "confirmation-sent"; email: string }
  | { status: "signed-in"; user: AuthUser };

const MINIMUM_PASSWORD_LENGTH = 8;

export function emailError(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed.length === 0) return "Enter your email address.";
  // Deliberately loose: the confirmation email is the real check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function passwordError(password: string): string | null {
  if (password.length === 0) return "Enter a password.";
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Use at least ${MINIMUM_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at ?? user.confirmed_at),
  };
}

function client() {
  if (!supabase) throw new Error("Accounts are not configured.");
  return supabase;
}

/**
 * Where Supabase should send someone after they click a link in an email.
 * Uses the document's own base so it works on GitHub Pages, where the app is
 * served from a subpath, without hardcoding the deployment URL.
 */
function redirectTarget(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URL(import.meta.env.BASE_URL ?? "/", window.location.origin).href;
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return toAuthUser(data.session?.user);
}

/** Returns only the signed-in caller's server-assigned QA capability. */
export async function currentQaAccountCapability(): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("get_qa_account_capability");
  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * Creates an account. With email confirmation switched on, Supabase returns a
 * user with no session, which is the signal that a confirmation mail is on its
 * way rather than that anything failed.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<SignUpOutcome> {
  const address = email.trim();
  const invalid = emailError(address) ?? passwordError(password);
  if (invalid) throw new Error(invalid);

  const { data, error } = await client().auth.signUp({
    email: address,
    password,
    options: { emailRedirectTo: redirectTarget() },
  });

  if (error) throw new Error(error.message);

  const user = toAuthUser(data.user);
  if (data.session && user?.emailConfirmed) {
    return { status: "signed-in", user };
  }
  return { status: "confirmation-sent", email: address };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthUser> {
  const address = email.trim();
  const invalid = emailError(address) ?? passwordError(password);
  if (invalid) throw new Error(invalid);

  const { data, error } = await client().auth.signInWithPassword({
    email: address,
    password,
  });

  if (error) {
    // Supabase deliberately keeps this vague so the form cannot be used to
    // discover which addresses have accounts.
    throw new Error(
      error.message === "Invalid login credentials"
        ? "That email and password do not match an account."
        : error.message,
    );
  }

  const user = toAuthUser(data.user);
  if (!user) throw new Error("Could not sign in.");
  return user;
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Always resolves, even for an address with no account: saying which is which
 * would turn the form into an account-existence oracle.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const address = email.trim();
  const invalid = emailError(address);
  if (invalid) throw new Error(invalid);

  const { error } = await client().auth.resetPasswordForEmail(address, {
    redirectTo: redirectTarget(),
  });
  if (error) throw new Error(error.message);
}

/** Used after arriving back from a reset link, where a session already exists. */
export async function updatePassword(password: string): Promise<void> {
  const invalid = passwordError(password);
  if (invalid) throw new Error(invalid);

  const { error } = await client().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function resendConfirmation(email: string): Promise<void> {
  const address = email.trim();
  const invalid = emailError(address);
  if (invalid) throw new Error(invalid);

  const { error } = await client().auth.resend({
    type: "signup",
    email: address,
    options: { emailRedirectTo: redirectTarget() },
  });
  if (error) throw new Error(error.message);
}

/**
 * Subscribes to sign in, sign out, token refresh and the recovery event that
 * fires when someone follows a reset link. Returns an unsubscribe function.
 */
export function onAuthChange(
  handler: (user: AuthUser | null, event: string) => void,
): () => void {
  if (!supabase) return () => {};

  const { data } = supabase.auth.onAuthStateChange(
    (event: string, session: Session | null) => {
      handler(toAuthUser(session?.user), event);
    },
  );

  return () => data.subscription.unsubscribe();
}
