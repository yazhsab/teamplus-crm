"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <h1>Workspace unavailable</h1>
        <p>
          We couldn’t open your workspace. Retry in a moment, or contact your
          administrator.
        </p>
        <button className="primary-button" onClick={reset}>
          Try again
        </button>
        <a className="auth-link" href="/login">
          Return to sign in
        </a>
      </section>
    </main>
  );
}
