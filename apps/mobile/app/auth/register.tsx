import { useState } from "react";
import { Link, Redirect, router } from "expo-router";
import { signupSchema } from "@ezygo/contracts";
import { useAuth } from "../../lib/auth/provider";
import { Action, AuthPage, Field, Notice, errorMessage, styles } from "../../components/auth/AuthUI";
import { SessionGate } from "../../components/auth/AuthGate";

export default function Register() {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(auth.email);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (auth.phase === "authenticated") return <Redirect href="/" />;
  if (auth.phase !== "signedOut") return <SessionGate />;
  async function submit() {
    setError("");
    const parsed = signupSchema.safeParse({ full_name: name.trim(), email: email.trim(), phone: phone.trim(), password, confirm_password: confirmation });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      await auth.controller.register(parsed.data);
      auth.setEmail(parsed.data.email); setPassword(""); setConfirmation("");
      router.replace("/auth/verify");
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <AuthPage title="Your next delivery starts here." subtitle="Create a customer account. Drivers receive an account from EzyGo.">
    <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" editable={!busy} />
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" editable={!busy} />
    <Field label="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="+27" editable={!busy} />
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" editable={!busy} />
    <Notice message="Use at least 8 characters, one capital letter and one number." />
    <Field label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" editable={!busy} />
    <Notice message={error} error />
    <Action label="Create account" busy={busy} onPress={() => { void submit(); }} />
    <Link href="/auth/sign-in" style={styles.link}>Already have an account? Sign in</Link>
  </AuthPage>;
}
