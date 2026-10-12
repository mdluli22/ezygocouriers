"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { requestJson } from "@/lib/api/client";

export default function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const params = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const invalid = reset && (!token || !!params.get("error"));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reset && password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      await requestJson(`/api/auth/${reset ? "reset-password" : "request-password-reset"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { token, newPassword: password } : { email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/auth/reset-password` }),
      });
      setPassword(""); setConfirm(""); setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <h1 className="text-3xl font-black">{reset ? "Choose a new password" : "Reset your password"}</h1>
    {invalid ? <p role="alert">This reset link is missing or invalid. <Link className="underline" href="/auth/forgot-password">Request a new link</Link>.</p> : done ?
      <p role="status">{reset ? "Your password has been changed and existing sessions have been signed out. You can now sign in." : "If an account exists for that email address, you will receive a reset link. Check your inbox and spam folder."}</p> :
      <form onSubmit={submit} className="space-y-4">
        {reset ? <>
          <label className="label" htmlFor="new-password">New password (at least 8 characters)</label>
          <input id="new-password" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} />
          <label className="label" htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" className="input" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
        </> : <>
          <label className="label" htmlFor="reset-email">Email address</label>
          <input id="reset-email" className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </>}
        {error && <p role="alert" className="error-text">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : reset ? "Save new password" : "Send reset link"}</button>
      </form>}
    <Link href="/auth/login" className="underline">Back to sign in</Link>
  </div>;
}
