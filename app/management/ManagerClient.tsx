"use client";

import { useState } from "react";

export function ManagerLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/management/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Wrong password.");
    } catch {
      setError("Could not reach the server.");
    }
    setBusy(false);
  }

  return (
    <div className="mgr-login">
      <div className="mgr-login__box">
        <div style={{ fontSize: "2.4rem" }}>🔐</div>
        <h1>The Rusti Shack — Back Office</h1>
        <p>Enter the manager password to view the store dashboard.</p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Manager password"
            autoFocus
            aria-label="Manager password"
          />
          <button className="btn btn--primary" disabled={busy || !password}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
        {error && <p className="mgr-login__error" role="alert">{error}</p>}
        {!configured && (
          <p className="mgr-login__error">
            Server note: MANAGER_PASSWORD isn&apos;t set yet.
          </p>
        )}
      </div>
    </div>
  );
}

export function LogoutButton() {
  async function logout() {
    await fetch("/api/management/logout", { method: "POST" });
    window.location.reload();
  }
  return (
    <button className="mgr-logout" onClick={logout}>
      Sign out
    </button>
  );
}
