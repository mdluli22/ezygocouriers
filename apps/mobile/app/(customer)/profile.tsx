import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { NotificationsPanel } from "../../components/operations/Notifications";
import { useAuth } from "../../lib/auth/provider";
import { Page, Card, Action } from "../../components/customer/UI";
import { colors, fonts } from "../../lib/theme";

export default function Profile() {
  const auth = useAuth();
  return <Page>
    <View style={s.hero}>
      <View style={s.avatar}><Text style={s.initial}>{auth.user?.full_name?.slice(0, 1).toUpperCase() || "E"}</Text></View>
      <Text accessibilityRole="header" style={s.name}>{auth.user?.full_name}</Text>
    </View>
    <Card>
      <View style={s.row}><View style={s.icon}><Ionicons name="mail-outline" size={21} color={colors.ink} /></View><View style={s.copy}><Text style={s.label}>Email address</Text><Text style={s.value}>{auth.user?.email}</Text></View></View>
      <View style={s.divider} />
      <View style={s.row}><View style={s.icon}><Ionicons name="call-outline" size={21} color={colors.ink} /></View><View style={s.copy}><Text style={s.label}>Phone number</Text><Text style={s.value}>{auth.user?.phone || "No phone number saved"}</Text></View></View>
    </Card>
    {([{ label: "Delivery history", icon: "time-outline", path: "/history" }, { label: "Send a parcel", icon: "cube-outline", path: "/deliveries/new" }] as const).map(item => <Pressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.path)} style={({ pressed }) => [s.menu, pressed && { opacity: .65 }]}><View style={s.icon}><Ionicons name={item.icon} size={22} color={colors.ink} /></View><Text style={s.menuLabel}>{item.label}</Text><Ionicons name="arrow-forward" size={20} color={colors.primary} /></Pressable>)}
    <NotificationsPanel />
    <Action label="Sign out" danger onPress={() => void auth.signOut()} />
  </Page>;
}
const s = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: 20, padding: 30, alignItems: "center", gap: 12 },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.soft, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  initial: { color: colors.ink, fontSize: 34, fontFamily: fonts.bold }, name: { color: colors.surface, fontSize: 24, fontFamily: fonts.bold, textAlign: "center" }, caption: { color: colors.heroText, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 }, icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, gap: 5 }, label: { color: colors.muted, fontSize: 12 }, value: { color: colors.ink, fontSize: 14, fontFamily: fonts.semibold }, divider: { height: 1, backgroundColor: colors.border },
  menu: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 12, minHeight: 72 }, menuLabel: { flex: 1, fontSize: 15, fontFamily: fonts.semibold, color: colors.ink },
});
