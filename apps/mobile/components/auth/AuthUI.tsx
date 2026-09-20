import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";
import { ApiError } from "@ezygo/api-client";

export function AuthPage({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.wordmark}><Text style={styles.logo}>EzyGo<Text style={styles.dot}>.</Text></Text><Text style={styles.tag}>COURIERS</Text></View>
      <Text style={styles.eyebrow}>A LITTLE CLOSER, EVERY DELIVERY</Text>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.card}>{children}</View>
      <Text style={styles.footer}>Cape Town deliveries. Personal service.</Text>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#74817e" style={[styles.input, error ? styles.invalid : null]} autoCapitalize="none" autoCorrect={false} {...props} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>;
}
export function Action({ label, onPress, busy = false, secondary = false, disabled = false }: { label: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || busy || pressed) && styles.dim]}>
    {busy ? <ActivityIndicator color={secondary ? "#173d38" : "#ffffff"} /> : <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>}
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
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: "#f3f5ef" }, content: { flexGrow: 1, padding: 24, paddingTop: 30, maxWidth: 520, width: "100%", alignSelf: "center" },
  wordmark: { marginBottom: 38, flexDirection: "row", alignItems: "baseline", gap: 10 }, logo: { fontSize: 34, fontWeight: "900", letterSpacing: -1.5, color: "#173d38" }, dot: { color: "#d5a52c" }, tag: { color: "#51645f", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: "#61726c", fontWeight: "700", marginBottom: 12 }, title: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: "#173d38", letterSpacing: -1 }, subtitle: { fontSize: 16, lineHeight: 24, color: "#52665e", marginTop: 12, marginBottom: 26 },
  card: { backgroundColor: "#ffffff", borderRadius: 22, borderWidth: 1, borderColor: "#e2e8de", padding: 22, gap: 16 }, field: { gap: 8 }, label: { fontSize: 13, color: "#253e35", fontWeight: "600" }, input: { minHeight: 52, backgroundColor: "#f8faf6", borderWidth: 1, borderColor: "#ced9d0", borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: "#173d38" }, invalid: { borderColor: "#ab3333" },
  button: { minHeight: 52, backgroundColor: "#173d38", borderRadius: 12, justifyContent: "center", alignItems: "center", padding: 12 }, secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ced9d0" }, buttonText: { fontSize: 15, fontWeight: "700", color: "#fff", textAlign: "center" }, secondaryText: { color: "#173d38" }, dim: { opacity: 0.6 }, notice: { fontSize: 14, lineHeight: 21, color: "#52665e" }, error: { color: "#a12626", fontSize: 13, lineHeight: 20 }, footer: { textAlign: "center", color: "#687970", fontSize: 12, marginTop: 26 }, link: { color: "#173d38", fontWeight: "700", textAlign: "center", paddingVertical: 10 }, divider: { color: "#718279", textAlign: "center", fontSize: 12 },
});
