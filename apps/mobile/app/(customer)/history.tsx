import { useRef } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BlurTargetView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { STATUS_LABELS } from "@ezygo/contracts";
import { customerApi } from "../../lib/customer-api";
import { useResource } from "../../lib/use-resource";
import { colors } from "../../lib/theme";
import { GlassNavigation } from "../../components/customer/GlassNavigation";
import { Loading, Failure } from "../../components/customer/UI";

export default function DeliveryHistory() {
  const { data, error, loading, refresh } = useResource(customerApi.list);
  const target = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const deliveries = data?.filter(delivery => ["delivered", "cancelled", "failed"].includes(delivery.status))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return <View style={s.screen}>
    <BlurTargetView ref={target} style={s.screen}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 110 + insets.bottom }]} refreshControl={<RefreshControl tintColor={colors.primary} refreshing={loading && !!data} onRefresh={() => void refresh()} />}>
        <View style={s.heading}>
          <Text accessibilityRole="header" style={s.title}>Previous deliveries</Text>
          <Text style={s.subtitle}>Completed, cancelled and unsuccessful deliveries.</Text>
        </View>
        {loading && !data ? <Loading /> : null}
        {error ? <Failure error={error} retry={() => void refresh()} /> : null}
        {!error && deliveries?.length === 0 ? <View style={s.empty}>
          <Ionicons name="time-outline" size={36} color={colors.primary} />
          <Text style={s.emptyTitle}>No previous deliveries yet</Text>
          <Text style={s.subtitle}>Your past deliveries will appear here once their journey ends.</Text>
        </View> : null}
        {deliveries?.map(delivery => <Pressable key={delivery.id} accessibilityRole="button" accessibilityLabel={`View ${delivery.tracking_number}, ${STATUS_LABELS[delivery.status]}`} onPress={() => router.push({ pathname: "/deliveries/[id]", params: { id: delivery.id } })} style={({ pressed }) => [s.card, pressed && s.pressed]}>
          <View style={s.row}>
            <View style={s.icon}><Ionicons name="cube-outline" size={24} color={colors.primary} /></View>
            <View style={s.details}><Text style={s.tracking}>{delivery.tracking_number}</Text><Text style={s.subtitle}>{delivery.pickup_city} → {delivery.dropoff_city}</Text></View>
            <Text style={[s.badge, delivery.status !== "delivered" && s.closedBadge]}>{STATUS_LABELS[delivery.status]}</Text>
          </View>
          <Text style={s.subtitle}>Booked {new Date(delivery.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · {delivery.recipient_name}</Text>
          <View style={s.footer}><Text style={s.price}>{delivery.quote_amount === null ? "Quote pending" : `${delivery.quote_currency} ${Number(delivery.quote_amount).toFixed(2)}`}</Text><Ionicons name="arrow-forward" size={18} color={colors.primary} /></View>
        </Pressable>)}
      </ScrollView>
    </BlurTargetView>
    <GlassNavigation target={target} selected="History" onNavigate={destination => {
      if (destination === "History") return;
      if (destination === "Send") { router.push("/deliveries/new"); return; }
      router.dismissTo({ pathname: "/dashboard", params: { section: destination === "Orders" ? "orders" : "home" } });
    }} />
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, maxWidth: 760, width: "100%", alignSelf: "center" },
  heading: { gap: 8, marginBottom: 8 }, title: { fontSize: 26, fontWeight: "800", letterSpacing: -.7, color: colors.ink },
  subtitle: { fontSize: 12, lineHeight: 19, color: colors.muted },
  card: { padding: 18, gap: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }, icon: { padding: 10, borderRadius: 13, backgroundColor: colors.soft },
  details: { flex: 1, minWidth: 130, gap: 4 }, tracking: { fontSize: 13, fontWeight: "800", color: colors.ink },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: "#eaf3ed", color: colors.success, fontSize: 10, fontWeight: "700" },
  closedBadge: { backgroundColor: "#f4f5f3", color: colors.muted },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  price: { fontSize: 12, fontWeight: "600", color: colors.ink }, pressed: { opacity: .7 },
  empty: { padding: 30, alignItems: "center", gap: 12, borderRadius: 20, backgroundColor: "#f4f8f5" }, emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
});
