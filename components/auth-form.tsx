"use client";
import { useState } from "react";
export function AuthForm({
  changePassword = false,
  message = "",
}: {
  changePassword?: boolean;
  message?: string;
}) {
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(message);
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand">
          team<span>plus</span>
          <b>+</b>
        </div>
        <h1>
          {changePassword
            ? "Set your password"
            : reset
              ? "Reset your password"
              : "Welcome back"}
        </h1>
        <p>
          {changePassword
            ? "Use at least 12 characters. A unique passphrase works well."
            : reset
              ? "We’ll email you a link to access your account."
              : "Sign in to your team’s workspace."}
        </p>
        {notice && (
          <p className="info-banner" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const f = new FormData(e.currentTarget);
            if (changePassword && f.get("password") !== f.get("confirm")) {
              setError("Passwords do not match.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              const body = changePassword
                ? { action: "password", password: f.get("password") }
                : reset
                  ? { action: "reset", email: f.get("email") }
                  : {
                      action: "login",
                      email: f.get("email"),
                      password: f.get("password"),
                    };
              const r = await fetch("/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              const data = (await r.json()) as { error?: string };
              if (!r.ok) throw new Error(data.error || "Please try again.");
              if (reset)
                setNotice(
                  "If your email has an account, a reset link is on its way. Check your inbox and spam folder.",
                );
              else window.location.assign("/");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {!changePassword && (
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                disabled={busy}
              />
            </label>
          )}
          {!reset && (
            <label>
              {changePassword ? "New password" : "Password"}
              <input
                name="password"
                type="password"
                autoComplete={
                  changePassword ? "new-password" : "current-password"
                }
                minLength={changePassword ? 12 : 1}
                maxLength={128}
                required
                disabled={busy}
              />
            </label>
          )}
          {changePassword && (
            <label>
              Confirm password
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
              />
            </label>
          )}
          <button className="primary-button" disabled={busy}>
            {busy
              ? "Please wait…"
              : changePassword
                ? "Save password"
                : reset
                  ? "Send reset link"
                  : "Sign in"}
          </button>
        </form>
        {!changePassword && (
          <button
            className="auth-link"
            disabled={busy}
            onClick={() => {
              setReset(!reset);
              setError("");
              setNotice("");
            }}
          >
            {reset ? "Back to sign in" : "Forgot your password?"}
          </button>
        )}
        <p className="auth-help">
          Team access is by invitation. Contact your administrator if you need
          an account.
        </p>
      </section>
    </main>
  );
}
