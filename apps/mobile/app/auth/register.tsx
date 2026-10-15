import { useRef, useState } from "react";
import { Link, Redirect, router } from "expo-router";
import { Keyboard, ScrollView, Text } from "react-native";
import { signupSchema } from "@ezygo/contracts";
import { useAuth } from "../../lib/auth/provider";
import { googleSignInAvailable, startGoogleSignIn } from "../../lib/auth/native-auth";
import { signupStageErrors } from "../../lib/signup";
import { Action, AuthPage, Field, Notice, errorMessage, styles } from "../../components/auth/AuthUI";
import { GoogleButton } from "../../components/auth/GoogleButton";
import { SignupProgress } from "../../components/auth/SignupProgress";
import { SessionGate } from "../../components/auth/AuthGate";

export default function Register() {
  const auth = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(auth.email);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scroll = useRef<ScrollView>(null);
  const submitting = useRef(false);
  const locked = busy || googleBusy;
  if (auth.phase === "authenticated") return <Redirect href="/" />;
  if (auth.phase !== "signedOut") return <SessionGate />;
  const form = () => ({ full_name: name.trim(), email: email.trim(), phone: phone.trim(), password, confirm_password: confirmation });
  function changeStep(next: 1 | 2) {
    Keyboard.dismiss(); setStep(next); setError(""); setErrors({}); scroll.current?.scrollTo({ y: 0, animated: true });
  }
  function advance() {
    const nextErrors = signupStageErrors(form(), 1);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) changeStep(2);
  }
  async function submit() {
    if (submitting.current) return;
    setError("");
    const parsed = signupSchema.safeParse(form());
    if (!parsed.success) {
      const firstErrors = signupStageErrors(form(), 1);
      if (Object.keys(firstErrors).length) { changeStep(1); setErrors(firstErrors); }
      else setErrors(signupStageErrors(form(), 2));
      return;
    }
    submitting.current = true; setBusy(true);
    try {
      await auth.controller.register(parsed.data);
      auth.setEmail(parsed.data.email); setPassword(""); setConfirmation("");
      router.replace("/auth/verify");
    } catch (error) { setError(errorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function google() {
    if (submitting.current) return;
    submitting.current = true; setGoogleBusy(true); setError("");
    try { await startGoogleSignIn(); }
    catch (error) { setError(errorMessage(error)); }
    finally { submitting.current = false; setGoogleBusy(false); }
  }
  return <AuthPage title={step === 1 ? "Create your account" : "Secure your account"} scrollRef={scroll}>
    <SignupProgress step={step} />
    {step === 1 ? <>
      <GoogleButton busy={googleBusy} disabled={busy || !googleSignInAvailable} onPress={() => void google()} />
      {!googleSignInAvailable ? <Notice message="Use an EzyGo development build for Google sign-in." /> : null}
      <Text style={styles.divider}>or sign up with email</Text>
      <Field key="name" label="Full name" value={name} error={errors.full_name} onChangeText={setName} autoCapitalize="words" autoComplete="name" editable={!locked} />
      <Field key="email" label="Email address" value={email} error={errors.email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!locked} />
      <Field key="phone" label="Phone number" value={phone} error={errors.phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="e.g. +27 82 123 4567" editable={!locked} />
      <Notice message="All three fields are required." />
    </> : <>
      <Field key="password" label="Password" value={password} error={errors.password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" editable={!locked} />
      <Notice message="Use at least 8 characters, one capital letter and one number." />
      <Field key="confirmation" label="Confirm password" value={confirmation} error={errors.confirm_password} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" editable={!locked} onSubmitEditing={() => void submit()} />
    </>}
    <Notice message={error} error />
    <Action label={step === 1 ? "Continue" : "Create account"} busy={busy} disabled={googleBusy} onPress={() => step === 1 ? advance() : void submit()} />
    {step === 2 ? <Action label="Back to your details" secondary disabled={locked} onPress={() => changeStep(1)} /> : null}
    <Link href="/auth/sign-in" style={styles.link}>Already have an account? Sign in</Link>
  </AuthPage>;
}
