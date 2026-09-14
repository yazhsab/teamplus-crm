"use client";
import { useCallback, useEffect, useState } from "react";
type Member = { user_id: string; email: string; role: string };
export function TeamAccess() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/team");
      const d = (await r.json()) as { members: Member[]; error?: string };
      if (!r.ok) throw new Error(d.error);
      setMembers(d.members);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load team accounts.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="panel" style={{ marginBottom: "1.5rem" }}>
      <div className="panel-heading">
        <div>
          <h2>Team access</h2>
          <p>
            All members can view workspace records and financial values. Only
            managers and administrators can record payments.
          </p>
        </div>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {members.map((member) => (
        <form
          key={member.user_id}
          className="team-access-row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const role = new FormData(e.currentTarget).get("role");
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/team", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Idempotency-Key": crypto.randomUUID(),
                },
                body: JSON.stringify({ userId: member.user_id, role }),
              });
              const d = (await r.json()) as { error?: string };
              if (!r.ok) throw new Error(d.error);
              await load();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not update access.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <span>{member.email}</span>
          <select
            key={member.role}
            name="role"
            defaultValue={member.role}
            aria-label={`Role for ${member.email}`}
            disabled={busy}
          >
            {["admin", "manager", "member", "viewer"].map((role) => (
              <option key={role}>{role}</option>
            ))}
            <option value="remove">Remove access</option>
          </select>
          <button className="secondary-button" disabled={busy}>
            Save access
          </button>
        </form>
      ))}
      <p className="auth-help" style={{ padding: "1rem" }}>
        New invitations are sent by your deployment administrator.
      </p>
    </section>
  );
}
