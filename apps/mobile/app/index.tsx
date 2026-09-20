import { Redirect } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../lib/auth/provider";
import { Action, AuthPage, Notice, styles } from "../components/auth/AuthUI";
import { SessionGate } from "../components/auth/AuthGate";

export default function HomeScreen() {
  const auth = useAuth();
  if (auth.phase === "signedOut") return <Redirect href="/auth/sign-in" />;
  if (auth.phase !== "authenticated" || !auth.user) return <SessionGate />;
  const role = auth.user.role === "driver" ? "Driver account" : auth.user.role === "customer" ? "Customer account" : "Administrator account";
  return <AuthPage title={`Welcome, ${auth.user.full_name.split(" ")[0]}`} subtitle={role}>
    <Text style={styles.label}>{auth.user.email}</Text>
    <Notice message={auth.user.role === "admin" ? "Use the EzyGo website to manage dispatch and administration." : "You’re securely signed in. Booking and delivery screens will be added in the next phase."} />
    <Action label="Sign out" secondary onPress={() => { void auth.signOut(); }} />
  </AuthPage>;
}
