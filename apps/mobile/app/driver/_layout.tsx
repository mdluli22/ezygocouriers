import { colors } from "../../lib/theme";
import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../lib/auth/provider";
import { SessionGate } from "../../components/auth/AuthGate";
export default function DriverLayout() {
  const auth = useAuth();
  if (auth.phase === "signedOut") return <Redirect href="/auth/sign-in" />;
  if (auth.phase !== "authenticated") return <SessionGate />;
  if (auth.user?.role !== "driver") return <Redirect href="/" />;
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink }}>
    <Stack.Screen name="index" options={{ title: "Driver dashboard", headerShown: false }} />
    <Stack.Screen name="trip/[id]" options={{ title: "Current trip" }} />
  </Stack>;
}
