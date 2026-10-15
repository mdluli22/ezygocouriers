import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { STATUS_LABELS, type DeliveryStatus } from "@ezygo/contracts";
import { colors, fonts } from "../../lib/theme";

const copy: Record<DeliveryStatus, [string, string]> = {
  pending: ["Your delivery starts here.", "Your request is in. We’re preparing the details for your delivery."],
  quoted: ["Your quote is ready.", "Your delivery has been quoted. Confirmation is the next step."],
  confirmed: ["Ready when you are.", "Complete your payment so we can assign a driver to your delivery."],
  paid: ["Let’s get you moving.", "Payment received. We’re finding a driver for your parcel."],
  assigned: ["Meet your driver.", "A driver has been assigned. Your parcel is awaiting pickup."],
  picked_up: ["In good hands.", "Your driver has collected your parcel. Next stop: your recipient."],
  in_transit: ["On the way.", "Your parcel is on its way to the drop-off address."],
  delivered: ["Delivered. Just like that.", "Your parcel has reached its destination. Thank you for choosing EzyGo."],
  cancelled: ["Delivery cancelled.", "This delivery has been cancelled. You can book a new delivery from your dashboard."],
  failed: ["Delivery unsuccessful.", "This delivery could not be completed. Check the activity below for details."],
};

export function DeliveryStatusCard({ status, updatedAt }: { status: DeliveryStatus; updatedAt: string }) {
  const terminal = status === "cancelled" || status === "failed";
  const reached = status === "delivered" ? 3 : status === "in_transit" || status === "picked_up" ? 2 : status === "assigned" ? 1 : 0;
  return <View style={s.card}>
    <View style={s.row}><Text style={[s.badge, terminal && s.terminal]}>{STATUS_LABELS[status]}</Text><Ionicons name="cube-outline" size={28} color={colors.heroText} /></View>
    <Text accessibilityRole="header" style={s.title}>{copy[status][0]}</Text>
    {status === "confirmed" || status === "failed" ? <Text style={s.description}>{copy[status][1]}</Text> : null}
    {!terminal ? <View accessibilityLabel={`Delivery progress: ${STATUS_LABELS[status]}`} style={s.progress}>{["Booked", "Driver assigned", "On the way", "Delivered"].map((label, index) => <View key={label} style={s.step}><View style={[s.bar, index <= reached && s.reached]} /><Text style={s.stepLabel}>{label}</Text></View>)}</View> : null}
    <View style={s.updated}><Ionicons name="time-outline" size={15} color={colors.heroText} /><Text style={s.updatedText}>Last updated {new Date(updatedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text></View>
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: "#153838", borderRadius: 12, padding: 24, gap: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  badge: { fontFamily: fonts.semibold, fontSize: 12, color: "#b4efd5", backgroundColor: "#245448", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  terminal: { color: "#ffd4c9", backgroundColor: "#37302e" },
  title: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -.9, color: "#f5b544", marginTop: 8 },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 23, color: "#c5dcd3" },
  progress: { flexDirection: "row", gap: 7, marginTop: 10 }, step: { flex: 1, gap: 10 },
  bar: { height: 4, backgroundColor: "#496b60", borderRadius: 2 }, reached: { backgroundColor: colors.accent },
  stepLabel: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 15, color: colors.heroText },
  updated: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 8 }, updatedText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.heroText },
});
