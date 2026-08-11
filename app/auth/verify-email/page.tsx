"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    email ? `We sent a six-digit code to ${email}.` : ""
  );
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((current) => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!email || otp.length !== 6) return;

    setVerifying(true);
    setError("");
    const result = await authClient.emailOtp.verifyEmail({ email, otp });
    setVerifying(false);

    if (result.error) {
      setError(result.error.message || "That code is invalid or has expired.");
      return;
    }

    router.replace("/auth/login?verified=1");
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;

    setResending(true);
    setError("");
    setNotice("");
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    setResending(false);

    if (result.error) {
      setError(result.error.message || "We could not send another code.");
      return;
    }

    setNotice(`A new code was sent to ${email}.`);
    setCooldown(30);
  }

  if (!email) {
    return (
      <div className="space-y-5 text-center">
        <h1 className="text-3xl font-black" style={{ color: "var(--color-primary)" }}>
          Email address required
        </h1>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Return to signup and enter the email address you want to verify.
        </p>
        <Link href="/auth/signup" className="btn-primary inline-flex px-6 py-3">
          Back to signup
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--color-primary)" }}>
          Verify your email
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Enter the code from your email to activate your EzyGo account.
        </p>
      </div>

      {notice && (
        <div
          className="p-4 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: "rgb(34 197 94 / 0.1)",
            border: "1px solid rgb(34 197 94 / 0.25)",
            color: "var(--color-success)",
          }}
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          className="p-4 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: "rgb(239 68 68 / 0.08)",
            border: "1px solid rgb(239 68 68 / 0.2)",
            color: "var(--color-error)",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label htmlFor="otp" className="label">Six-digit verification code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            className="input text-center text-2xl font-black tracking-[0.45em]"
            maxLength={6}
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={verifying || otp.length !== 6}
          className="btn-primary w-full py-3"
        >
          {verifying ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-60"
          style={{ color: "var(--color-primary)" }}
        >
          {resending
            ? "Sending…"
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend code"}
        </button>
      </div>
    </div>
  );
}
