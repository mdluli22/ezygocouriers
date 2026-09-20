import { useState } from "react";
import { Link, Redirect, router } from "expo-router";
import { ApiError } from "@ezygo/api-client";
import { loginSchema } from "@ezygo/contracts";
import { useAuth } from "../../lib/auth/provider";
import { startGoogleSignIn } from "../../lib/auth/native-auth";
import { Action, AuthPage, Field, Notice, errorMessage, styles } from "../../components/auth/AuthUI";
import { SessionGate } from "../../components/auth/AuthGate";
import { Text } from "react-native";

export default function SignIn() {
  const auth = useAuth();
  const [email, setEmail] = useState(auth.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  if (auth.phase === "authenticated") return <Redirect href="/" />;
  if (auth.phase !== "signedOut") return <SessionGate />;
  async function submit() {
    setError("");
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try { await auth.controller.signIn(parsed.data); setPassword(""); }
    catch (error) {
      setPassword("");
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") { auth.setEmail(email.trim()); router.push("/auth/verify"); }
      else setError(errorMessage(error));
    } finally { setBusy(false); }
  }
  async function google() {
    setGoogleBusy(true); setError("");
    try { await startGoogleSignIn(); }
    catch (error) { setError(errorMessage(error)); }
    finally { setGoogleBusy(false); }
  }
  return <AuthPage title="Good to see you." subtitle="Sign in to book a delivery or get on the road.">
    <Notice message={auth.message} />
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!busy && !googleBusy} />
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => { void submit(); }} editable={!busy && !googleBusy} />
    <Notice message={error} error />
    <Action label="Sign in" busy={busy} disabled={googleBusy} onPress={() => { void submit(); }} />
    <Text style={styles.divider}>or</Text>
    <Action label="Continue with Google" secondary busy={googleBusy} disabled={busy} onPress={() => { void google(); }} />
    <Link href="/auth/register" style={styles.link}>New to EzyGo? Create an account</Link>
    <Link href="/auth/verify" style={styles.link}>Have a verification code?</Link>
  </AuthPage>;
}
