import { colors } from "../../lib/theme";
import { ActivityIndicator } from "react-native";
import { useAuth } from "../../lib/auth/provider";
import { Action, AuthPage, Notice } from "./AuthUI";

export function SessionGate() {
  const auth = useAuth();
  const loading = auth.phase === "loading";
  return <AuthPage title={loading ? "Welcome to EzyGo" : "Let’s reconnect"} subtitle={loading ? "Checking your secure session…" : "Verify your session to continue."}>
    {loading ? <ActivityIndicator size="large" color={colors.ink} /> : <>
      <Notice message={auth.message} error />
      <Action label="Try again" onPress={() => { void auth.controller.restore(); }} />
      <Action label="Sign out on this device" secondary onPress={() => { void auth.signOut(); }} />
    </>}
  </AuthPage>;
}
