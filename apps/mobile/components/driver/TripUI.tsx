import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
export function TripSection({ title, subtitle, icon, children }: PropsWithChildren<{ title: string; subtitle?: string; icon: Icon }>) {
  return <View style={tripStyles.card}><View style={tripStyles.heading}><View style={tripStyles.icon}><Ionicons name={icon} size={23} color={colors.primary} /></View><View style={tripStyles.flex}><Text accessibilityRole="header" style={tripStyles.title}>{title}</Text>{subtitle ? <Text style={tripStyles.muted}>{subtitle}</Text> : null}</View></View>{children}</View>;
}
export function TripAction({ label, icon, onPress, secondary = false, busy = false, danger = false }: { label: string; icon: Icon; onPress: () => void; secondary?: boolean; busy?: boolean; danger?: boolean }) {
  const foreground = danger ? colors.error : secondary ? colors.primary : colors.surface;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onPress} style={({ pressed }) => [tripStyles.action, secondary && tripStyles.secondary, danger && tripStyles.danger, (pressed || busy) && { opacity: .6 }]}>
    {busy ? <ActivityIndicator color={foreground} /> : <Ionicons name={icon} size={20} color={foreground} />}
    <Text style={[tripStyles.actionText, { color: foreground }]}>{label}</Text>
  </Pressable>;
}
export function TripTag({ label, icon }: { label: string; icon: Icon }) {
  return <View style={tripStyles.tag}><Ionicons name={icon} size={15} color={colors.primary} /><Text style={tripStyles.tagText}>{label}</Text></View>;
}
export const tripStyles = StyleSheet.create({
  flex: { flex: 1 }, card: { padding: 20, gap: 16, borderRadius: 23, borderWidth: 1, borderColor: "#dce9e0", backgroundColor: colors.surface },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 }, icon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#e7f3eb", alignItems: "center", justifyContent: "center" }, title: { color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -.4 }, muted: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  action: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, padding: 13, backgroundColor: colors.primary, borderRadius: 14, borderWidth: 1, borderColor: colors.primary }, secondary: { backgroundColor: "#f2f8f4", borderColor: "#dce9e0" }, danger: { backgroundColor: "#fff7f5", borderColor: "#f0d9d4" }, actionText: { flexShrink: 1, fontSize: 13, lineHeight: 19, fontWeight: "700", textAlign: "center" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#edf6f0", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 }, tagText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  hero: { padding: 23, gap: 14, borderRadius: 25, backgroundColor: colors.ink }, heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }, eyebrow: { color: "#b7d6c5", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, tracking: { color: colors.surface, fontSize: 25, fontWeight: "800", letterSpacing: -.7 }, status: { color: colors.ink, backgroundColor: "#d8f0e2", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9, fontSize: 11, fontWeight: "800" }, heroRoute: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }, heroCity: { color: colors.surface, fontSize: 14, fontWeight: "600" },
  nextMove: { padding: 16, borderRadius: 17, backgroundColor: "#edf6f0", flexDirection: "row", gap: 12, alignItems: "center" }, nextTitle: { color: colors.ink, fontSize: 14, fontWeight: "800", marginBottom: 3 },
  address: { color: colors.ink, fontSize: 18, lineHeight: 25, fontWeight: "700" }, contact: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#e7efe9" }, contactName: { color: colors.ink, fontSize: 14, fontWeight: "700" }, notes: { padding: 13, borderRadius: 12, backgroundColor: "#f2f8f4", flexDirection: "row", gap: 9 }, noteText: { flex: 1, color: colors.primary, fontSize: 12, lineHeight: 19 },
  timeline: { gap: 0 }, event: { flexDirection: "row", gap: 13, minHeight: 72 }, eventRail: { width: 25, alignItems: "center" }, eventDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#e2f1e8", alignItems: "center", justifyContent: "center" }, eventLine: { width: 2, flex: 1, backgroundColor: "#dce9e0", marginVertical: 4 }, eventCopy: { flex: 1, gap: 3, paddingBottom: 18 },
});
