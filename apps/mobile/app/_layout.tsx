import "../lib/driver/location";
import { NotificationRuntime } from "../components/operations/Notifications";
import { DriverRuntime } from "../components/driver/DriverRuntime";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../lib/auth/provider";

export default function RootLayout() {
  return <AuthProvider><DriverRuntime /><NotificationRuntime /><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></AuthProvider>;
}
