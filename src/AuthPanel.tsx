import { type FormEvent, useId, useState } from "react";
import {
  emailError,
  passwordError,
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signUp,
  updatePassword,
} from "../lib/auth";

type Mode = "sign-in" | "sign-up" | "reset";

const HEADINGS: Record<Mode, string> = {
  "sign-in": "Sign in",
  "sign-up": "Create an account",
  reset: "Reset your password",
};

const SUBMIT_LABELS: Record<Mode, string> = {
  "sign-in": "Sign in",
  "sign-up": "Create account",
  reset: "Email me a reset link",
};

/**
 * Sign in, registration and password reset in one panel. Every field is
 * labelled, errors are announced through role="alert" and tied to their input
 * with aria-describedby, and the mode buttons are a real tablist so the whole
 * thing is reachable by keyboard alone.
 */
export function AuthPanel({
  onSignedIn,
  compact = false,
}: {
  onSignedIn?: () => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const baseId = useId();
  const emailId = `${baseId}-email`;
  const passwordId = `${baseId}-password`;
  const errorId = `${baseId}-error`;
  const panelId = `${baseId}-panel`;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const invalid =
      emailError(email) ?? (mode === "reset" ? null : passwordError(password));
    if (invalid) {
      setError(invalid);
      setNotice(null);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign-up") {
        const outcome = await signUp(email, password);
        if (outcome.status === "confirmation-sent") {
          setNotice(
            `Check ${outcome.email} for a confirmation link. You can keep playing as a guest meanwhile.`,
          );
          setPassword("");
        } else {
          onSignedIn?.();
        }
      } else if (mode === "sign-in") {
        await signIn(email, password);
        setPassword("");
        onSignedIn?.();
      } else {
        await requestPasswordReset(email);
        setNotice(
          `If ${email.trim()} has an account, a reset link is on its way.`,
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`auth-panel${compact ? " is-compact" : ""}`}
      aria-labelledby={`${baseId}-heading`}
    >
      <h2 id={`${baseId}-heading`} className="auth-heading">
        {HEADINGS[mode]}
      </h2>

      <div className="auth-tabs" role="tablist" aria-label="Account options">
        {(["sign-in", "sign-up", "reset"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            id={`${baseId}-tab-${option}`}
            aria-selected={mode === option}
            aria-controls={panelId}
            className={`auth-tab${mode === option ? " is-current" : ""}`}
            onClick={() => switchMode(option)}
          >
            {option === "sign-in"
              ? "Sign in"
              : option === "sign-up"
                ? "Register"
                : "Forgot password"}
          </button>
        ))}
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${mode}`}
        noValidate
      >
        <div className="auth-field">
          <label htmlFor={emailId}>Email address</label>
          <input
            id={emailId}
            type="email"
            value={email}
            autoComplete="email"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {mode !== "reset" && (
          <div className="auth-field">
            <label htmlFor={passwordId}>Password</label>
            <input
              id={passwordId}
              type="password"
              value={password}
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              required
              minLength={8}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "sign-up" && (
              <p className="auth-hint">At least 8 characters.</p>
            )}
          </div>
        )}

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Working…" : SUBMIT_LABELS[mode]}
        </button>

        {error && (
          <p className="auth-error" id={errorId} role="alert">
            {error}
          </p>
        )}
        <p className="auth-notice" role="status">
          {notice}
        </p>
      </form>
    </section>
  );
}

/** Shown when a confirmed address is required but the account has not confirmed. */
export function ConfirmEmailNotice({ email }: { email: string | null }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    if (!email || busy) return;
    setBusy(true);
    try {
      await resendConfirmation(email);
      setStatus("Sent. Check your inbox.");
    } catch (caught) {
      setStatus(
        caught instanceof Error ? caught.message : "Could not resend it.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-callout">
      <p>
        Confirm <strong>{email ?? "your email address"}</strong> to claim a name
        on the leaderboard. Your scores still save on this device meanwhile.
      </p>
      <button
        className="secondary-button"
        type="button"
        onClick={resend}
        disabled={busy || !email}
      >
        {busy ? "Sending…" : "Resend confirmation"}
      </button>
      <p className="auth-notice" role="status">
        {status}
      </p>
    </div>
  );
}

/** Shown after following a password reset link, when a session already exists. */
export function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const baseId = useId();
  const fieldId = `${baseId}-new-password`;
  const errorId = `${baseId}-error`;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const invalid = passwordError(password);
    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      onDone();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update it.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form auth-panel" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-heading">Choose a new password</h2>
      <div className="auth-field">
        <label htmlFor={fieldId}>New password</label>
        <input
          id={fieldId}
          type="password"
          value={password}
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={busy}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="auth-hint">At least 8 characters.</p>
      </div>
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </button>
      {error && (
        <p className="auth-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
