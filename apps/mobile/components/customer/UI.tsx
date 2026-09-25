import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";
import { styles, Notice, Action } from "../auth/AuthUI";
export { styles, Notice, Action, Field, errorMessage } from "../auth/AuthUI";
export function Page({ children, refresh, refreshing = false }: PropsWithChildren<{ refresh?: () => void; refreshing?: boolean }>) {
  return <SafeAreaView edges={["bottom"]} style={styles.screen}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { gap: 16 }]} refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} /> : undefined}>{children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function Title({ children }: PropsWithChildren) { return <Text accessibilityRole="header" style={[styles.title, { fontSize: 26 }]}>{children}</Text>; }
export function Loading() { return <View accessibilityRole="progressbar" accessibilityLabel="Loading deliveries" accessibilityLiveRegion="polite"><ActivityIndicator /><Notice message="Loading…" /></View>; }
export function Failure({ error, retry }: { error: string; retry: () => void }) { return <><Notice message={error} error /><Action label="Try again" secondary onPress={retry} /></>; }
