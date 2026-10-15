import { ActivityIndicator, Image, Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts } from "../../lib/theme";

export function GoogleButton({ onPress, busy = false, disabled = false }: { onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [s.button, (pressed || disabled || busy) && s.dim]}>
    {busy ? <ActivityIndicator color={colors.primary} /> : <Image source={require("../../assets/google-logo.png")} style={s.logo} />}
    <Text style={s.text}>{busy ? "Connecting…" : "Continue with Google"}</Text>
  </Pressable>;
}
const s = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 56, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface },
  logo: { width: 22, height: 22 }, text: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, textAlign: "center", color: colors.text }, dim: { opacity: .6 },
});
