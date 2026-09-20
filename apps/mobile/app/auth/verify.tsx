import { useState } from "react";
import { Link, Redirect } from "expo-router";
import { mobileVerifyEmailSchema, mobileSendVerificationSchema } from "@ezygo/contracts";
import { useAuth } from "../../lib/auth/provider";
import { Action, AuthPage, Field, Notice, errorMessage, styles } from "../../components/auth/AuthUI";
import { SessionGate } from "../../components/auth/AuthGate";

export default function Verify() {
  const auth = useAuth();
  const [email, setEmail] = useState(auth.email);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (auth.phase === "authenticated") return <Redirect href="/" />;
  if (auth.phase !== "signedOut") return <SessionGate />;
  async function verify() {
    setError("");
    const parsed = mobileVerifyEmailSchema.safeParse({ email: email.trim(), otp });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try { await auth.controller.verify(parsed.data.email, parsed.data.otp); setOtp(""); }
    catch (error) { setOtp(""); setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function resend() {
    setError(""); setMessage("");
    const parsed = mobileSendVerificationSchema.safeParse({ email: email.trim() });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setResending(true);
    try { await auth.controller.resend(parsed.data.email); setMessage("If this account can be verified, a new code has been sent. Check your inbox and spam folder."); }
    catch (error) { setError(errorMessage(error)); }
    finally { setResending(false); }
  }
  return <AuthPage title="Check your inbox." subtitle="Enter the six-digit code in your email. Codes expire after 10 minutes.">
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" editable={!busy && !resending} />
    <Field label="Verification code" value={otp} onChangeText={value => setOtp(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} editable={!busy && !resending} />
    <Notice message={message} /><Notice message={error} error />
    <Action label="Verify and sign in" busy={busy} disabled={resending} onPress={() => { void verify(); }} />
    <Action label="Send a new code" secondary busy={resending} disabled={busy} onPress={() => { void resend(); }} />
    <Link href="/auth/sign-in" style={styles.link}>Back to sign in</Link>
  </AuthPage>;
}
