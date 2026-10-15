import { GoogleButton } from "../../components/auth/GoogleButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts } from "../../lib/theme";
import { useRef, useState } from "react";
import { Link, Redirect, router } from "expo-router";
import { ApiError } from "@ezygo/api-client";
import { loginSchema } from "@ezygo/contracts";
import { useAuth } from "../../lib/auth/provider";
import { googleSignInAvailable, startGoogleSignIn } from "../../lib/auth/native-auth";
import { Action, AuthPage, Field, Notice, errorMessage, styles } from "../../components/auth/AuthUI";
import { SessionGate } from "../../components/auth/AuthGate";
import { Text, View, Pressable, StyleSheet } from "react-native";

export default function SignIn() {
  const auth = useAuth();
  const [role, setRole] = useState<"customer" | "driver">("customer");
  const [email, setEmail] = useState(auth.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  if (auth.phase === "authenticated") return <Redirect href="/" />;
  if (auth.phase !== "signedOut") return <SessionGate />;
  async function submit() {
    if (pending.current) return;
    setError("");
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    pending.current = true; setBusy(true);
    try { await auth.controller.signIn(parsed.data, role); setPassword(""); }
    catch (error) {
      setPassword("");
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") { auth.setEmail(email.trim()); router.push("/auth/verify"); }
      else setError(errorMessage(error));
    } finally { pending.current = false; setBusy(false); }
  }
  async function google() {
    if (pending.current) return;
    pending.current = true; setGoogleBusy(true); setError("");
    try { await startGoogleSignIn(); }
    catch (error) { setError(errorMessage(error)); }
    finally { pending.current = false; setGoogleBusy(false); }
  }
  return <AuthPage title={role === "customer" ? "Customer sign in" : "Driver sign in"}>
    <View accessibilityRole="tablist" style={s.roles}>{(["customer", "driver"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: role === value, disabled: busy || googleBusy }} disabled={busy || googleBusy} onPress={() => { setRole(value); setError(""); }} style={[s.role, role === value && s.selected]}><Ionicons name={value === "customer" ? "person-outline" : "car-outline"} size={20} color={role === value ? colors.surface : colors.primary} /><Text style={[s.roleLabel, role === value && s.selectedLabel]}>{value === "customer" ? "Customer" : "Driver"}</Text></Pressable>)}</View>
    <Notice message={auth.message} />
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" editable={!busy && !googleBusy} />
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => { void submit(); }} editable={!busy && !googleBusy} />
    <Notice message={error} error />
    <Action label="Sign in" busy={busy} disabled={googleBusy} onPress={() => { void submit(); }} />
    {role === "customer" ? <>
    <Text style={styles.divider}>or</Text>
    <GoogleButton busy={googleBusy} disabled={busy || !googleSignInAvailable} onPress={() => { void google(); }} />
    {!googleSignInAvailable ? <Notice message="Google sign-in requires an EzyGo development build. Use email sign-in in Expo Go." /> : null}
    <Link href="/auth/register" style={styles.link}>New to EzyGo? Create an account</Link>
    </> : <Notice message="Use the driver account provided by EzyGo." />}
    <Link href="/auth/verify" style={styles.link}>Have a verification code?</Link>
  </AuthPage>;
}

const s = StyleSheet.create({
  roles: { flexDirection: "row", flexWrap: "wrap", padding: 4, gap: 6, backgroundColor: colors.soft, borderRadius: 18 },
  role: { flex: 1, minWidth: 100, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 10, borderRadius: 14 }, selected: { backgroundColor: colors.primary },
  roleLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary }, selectedLabel: { color: colors.surface },
});
