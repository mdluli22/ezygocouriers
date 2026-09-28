import { colors } from "../../lib/theme";
import { useRef } from "react";
import { View } from "react-native";
import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../lib/auth/provider";
import { SessionGate } from "../../components/auth/AuthGate";
export default function CustomerLayout() {
  const auth = useAuth();
  const hasCustomer = useRef(false);
  if (auth.phase === "authenticated") hasCustomer.current = auth.user?.role === "customer";
  if (auth.phase === "signedOut") hasCustomer.current = false;
  if (auth.phase === "signedOut") return <Redirect href="/auth/sign-in" />;
  if (!hasCustomer.current && auth.phase !== "authenticated") return <SessionGate />;
  if (auth.phase === "authenticated" && auth.user?.role !== "customer") return <Redirect href="/" />;
  const locked = auth.phase !== "authenticated";
  return <View style={{ flex: 1 }}>{locked ? <SessionGate /> : null}<View style={{ flex: 1, display: locked ? "none" : "flex" }} accessibilityElementsHidden={locked} importantForAccessibility={locked ? "no-hide-descendants" : "auto"}><Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink, headerBackButtonDisplayMode: "minimal" }}>
    <Stack.Screen name="dashboard" options={{ title: "EzyGo Couriers" }} />
    <Stack.Screen name="history" options={{ title: "Delivery history" }} />
    <Stack.Screen name="deliveries/new" options={{ title: "New delivery" }} />
    <Stack.Screen name="deliveries/[id]" options={{ title: "Delivery detail" }} />
    <Stack.Screen name="payment" options={{ title: "Payment" }} />
    <Stack.Screen name="profile" options={{ title: "Your profile" }} />
  </Stack></View></View>;
}
