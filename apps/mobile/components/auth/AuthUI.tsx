import { BrandLogo } from "../BrandLogo";
import { colors, fonts } from "../../lib/theme";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren, RefObject } from "react";
import { ApiError } from "@ezygo/api-client";

export function AuthPage({ title, subtitle, children, scrollRef }: PropsWithChildren<{ title: string; subtitle?: string; scrollRef?: RefObject<ScrollView | null> }>) {
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.wordmark}><BrandLogo /></View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : <View style={{ height: 20 }} />}
      <View style={styles.card}>{children}</View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput secureTextEntry={false} accessibilityLabel={label} placeholderTextColor={colors.muted} style={[styles.input, error ? styles.invalid : null]} autoCapitalize="none" autoCorrect={false} {...props} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>;
}
export function Action({ label, onPress, busy = false, secondary = false, danger = false, disabled = false }: { label: string; onPress: () => void; busy?: boolean; secondary?: boolean; danger?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, (disabled || busy || pressed) && styles.dim]}>
    {busy ? <ActivityIndicator color={secondary && !danger ? colors.ink : colors.surface} /> : <Text style={[styles.buttonText, secondary && styles.secondaryText, danger && styles.dangerText]}>{label}</Text>}
  </Pressable>;
}
export function Notice({ message, error = false }: { message?: string | null; error?: boolean }) {
  return message ? <Text accessibilityRole={error ? "alert" : undefined} accessibilityLiveRegion="polite" style={[styles.notice, error && styles.error]}>{message}</Text> : null;
}
export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 429) return `Too many attempts. Try again${error.retryAfter ? ` in ${error.retryAfter} seconds` : " shortly"}.`;
    return error.message;
  }
  return error instanceof Error && !/network|fetch|abort/i.test(error.message) ? error.message : "We couldn’t connect. Check your connection and try again.";
}
export const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 24, paddingTop: 30, maxWidth: 520, width: "100%", alignSelf: "center" },
  wordmark: { marginBottom: 28, flexDirection: "row", alignItems: "baseline", gap: 10 }, logo: { fontSize: 34, fontFamily: fonts.bold, letterSpacing: -1.5, color: colors.text }, dot: { color: colors.accent }, tag: { color: colors.muted, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.muted, fontFamily: fonts.bold, marginBottom: 12 }, title: { fontSize: 30, lineHeight: 38, fontFamily: fonts.bold, color: colors.text, letterSpacing: -1 }, subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: 12, marginBottom: 26 },
  card: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 16 }, field: { gap: 8 }, label: { fontSize: 13, color: colors.text, fontFamily: fonts.semibold }, input: { minHeight: 56, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 18, fontSize: 16, fontFamily: fonts.regular, color: colors.text }, invalid: { borderColor: colors.error },
  button: { alignSelf: "stretch", minHeight: 56, backgroundColor: colors.primary, borderRadius: 10, justifyContent: "center", alignItems: "center", padding: 12 }, secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, danger: { backgroundColor: colors.danger, borderColor: colors.danger }, dangerText: { color: colors.surface }, buttonText: { flexShrink: 1, fontSize: 15, fontFamily: fonts.bold, color: colors.surface, textAlign: "center" }, secondaryText: { color: colors.text }, dim: { opacity: 0.6 }, notice: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted }, error: { color: colors.error, fontSize: 13, lineHeight: 20 }, footer: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 26 }, link: { color: colors.text, fontFamily: fonts.bold, textAlign: "center", paddingVertical: 10 }, divider: { color: colors.muted, textAlign: "center", fontSize: 12 },
});
