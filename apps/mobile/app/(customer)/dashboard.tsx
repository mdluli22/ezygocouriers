import { BlurTargetView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { GlassNavigation } from "../../components/customer/GlassNavigation";
import { colors } from "../../lib/theme";
import { useCallback, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { STATUS_LABELS } from "@ezygo/contracts";
import { customerApi } from "../../lib/customer-api";
import { useResource } from "../../lib/use-resource";
import { useAuth } from "../../lib/auth/provider";
import { Loading, Failure } from "../../components/customer/UI";

const past = ["delivered", "failed", "cancelled"];
export default function Dashboard() {
  const { data, error, loading, refresh } = useResource(customerApi.list);
  const { user } = useAuth();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [query, setQuery] = useState("");
  const search = useRef<TextInput>(null);
  const blurTarget = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const [destination, setDestination] = useState<"Home" | "Orders" | "Send" | "History">("Home");
  const scroll = useRef<ScrollView>(null);
  const [shipmentY, setShipmentY] = useState(0);
  const deliveries = data?.filter(d => !past.includes(d.status) && `${d.tracking_number} ${d.pickup_city} ${d.dropoff_city}`.toLowerCase().includes(query.trim().toLowerCase()));
  const book = () => router.push("/deliveries/new");
  const showOrders = () => { setDestination("Orders"); setQuery(""); scroll.current?.scrollTo({ y: shipmentY, animated: true }); };
  useFocusEffect(useCallback(() => {
    if (!section) return;
    setDestination(section === "orders" ? "Orders" : "Home");
    setQuery("");
    scroll.current?.scrollTo({ y: section === "orders" ? shipmentY : 0, animated: true });
  }, [section, shipmentY]));
  return <SafeAreaView edges={[]} style={s.screen}>
    <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: 110 + insets.bottom }]} refreshControl={<RefreshControl tintColor={colors.primary} refreshing={loading && !!data} onRefresh={() => void refresh()} />}>
      <View style={s.heading}><View><Text style={s.eyebrow}>COURIERS</Text><Text style={s.brand}>EzyGo.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push("/profile")} style={s.avatar}><Text style={s.avatarText}>{user?.full_name?.slice(0, 1).toUpperCase() || "E"}</Text></Pressable></View>
      <View style={s.hero}>
        <View style={s.heroTop}><View style={s.heroCopy}><Text style={s.heroEyebrow}>DELIVER ANYWHERE IN CAPE TOWN</Text><Text style={s.greeting}>Hello, {user?.full_name?.split(" ")[0] || "sender"}.</Text><Text style={s.heroDescription}>Send, track and receive.{"\n"}A little less effort. A lot more EzyGo.</Text></View><View style={s.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={s.orbit} /><View style={s.boxBack}><View style={s.tape} /><Text style={s.boxMark}>↑ ↑</Text></View><View style={s.boxFront}><View style={s.tape} /><Text style={s.boxMark}>EzyGo</Text></View></View></View>
        <View style={s.search}><Ionicons name="search-outline" size={21} color={colors.primary} /><TextInput ref={search} style={s.input} value={query} onChangeText={setQuery} placeholder="Tracking number or city" placeholderTextColor={colors.muted} accessibilityLabel="Search by tracking number or city" autoCapitalize="none" autoCorrect={false} returnKeyType="search" /></View>
      </View>
      <View style={s.shortcuts}>{[{ label: "Send parcel", icon: "paper-plane-outline" as const, action: book }, { label: "Track order", icon: "search-outline" as const, action: () => search.current?.focus() }, { label: "Active shipments", icon: "cube-outline" as const, action: () => showOrders() }, { label: "History", icon: "time-outline" as const, action: () => router.push("/history") }].map((item, i) => <Pressable key={item.label} accessibilityRole="button" onPress={item.action} style={s.shortcut}><View style={[s.shortcutIcon, i === 0 && s.featured]}><Ionicons name={item.icon} size={24} color={colors.primary} /></View><Text style={s.shortcutLabel}>{item.label}</Text></Pressable>)}</View>
      <View onLayout={event => setShipmentY(event.nativeEvent.layout.y)} style={s.sectionHeading}>
        <Text accessibilityRole="header" style={s.sectionTitle}>Your shipments</Text>
        <View style={s.tabs}><View style={[s.tab, s.selectedTab]}><Text style={s.tabLabel}>Active ({data?.filter(d => !past.includes(d.status)).length ?? 0})</Text></View><Pressable accessibilityRole="button" onPress={() => router.push("/history")} style={s.tab}><Text style={s.tabLabel}>History →</Text></Pressable></View>
      </View>
      <View style={s.listIntro}><Text style={s.tracking}>{query.trim() ? "Search results" : "Active shipments"}</Text><Text style={s.muted}>{query.trim() ? "Matching active parcels." : "Follow every step, from collection to their door."}</Text></View>
      {loading && !data ? <Loading /> : null}
      {error ? <Failure error={error} retry={() => void refresh()} /> : null}
      {!error && deliveries?.length === 0 ? <View style={s.empty}><Text style={s.sectionTitle}>{query.trim() ? "No matching parcels" : "Ready when you are."}</Text><Text style={s.muted}>{query.trim() ? "Try another tracking number or city." : "Book a pickup and follow your parcel right here."}</Text>{!query.trim() ? <Pressable accessibilityRole="button" onPress={book} style={s.emptyAction}><Text style={s.avatarText}>Send your first parcel ↗</Text></Pressable> : null}</View> : null}
      {deliveries?.map(d => {
        const current = d.status === "delivered" ? 3 : d.status === "in_transit" ? 2 : d.status === "picked_up" ? 1 : 0;
        return <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={`View ${d.tracking_number}, ${STATUS_LABELS[d.status]}`} style={s.card} onPress={() => router.push({ pathname: "/deliveries/[id]", params: { id: d.id } })}>
          <View style={s.cardTop}><View style={s.parcelIcon}><Ionicons name="cube-outline" size={25} color={colors.primary} /></View><View style={s.cardCopy}><Text style={s.tracking}>{d.tracking_number}</Text><Text style={s.route}>{d.pickup_city} → {d.dropoff_city}</Text></View><Text style={s.badge}>{STATUS_LABELS[d.status]}</Text></View>
          {!['failed', 'cancelled'].includes(d.status) ? <View style={s.progress}>{["Booked", "Picked up", "In transit", "Delivered"].map((label, index) => <View key={label} style={s.step}>{index < 3 ? <View style={[s.line, index < current && s.lineComplete]} /> : null}<View style={[s.dot, index <= current && s.dotComplete]}><Text style={s.check}>{index <= current ? "✓" : ""}</Text></View><Text style={s.stepLabel}>{label}</Text></View>)}</View> : null}
          <View style={s.cardFooter}><Text style={s.muted}>{d.quote_amount === null ? "Quote pending" : `${d.quote_currency} ${Number(d.quote_amount).toFixed(2)}`}</Text><Text style={s.detailLink}>View shipment →</Text></View>
        </Pressable>;
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Book a pickup" onPress={book} style={s.pickup}><Text style={s.eyebrow}>BUSINESS OR PERSONAL</Text><Text style={s.pickupTitle}>Need a pickup?</Text><Text style={s.muted}>We’ll come to you.</Text><View style={s.pickupArrow}><Ionicons name="arrow-forward" size={23} color={colors.ink} /></View><Text style={s.pickupNote}>From your door. To theirs.</Text></Pressable>
      <View style={s.card}><Text style={s.eyebrow}>EZYGO PROMISE</Text><Text style={s.sectionTitle}>Simple from start to finish.</Text>{["One transparent flat fee", "Live status updates", "Secure online payment"].map(label => <Text key={label} style={s.muted}>✓  {label}</Text>)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Start a booking" onPress={book} style={[s.card, s.feeCard]}><Text style={s.eyebrow}>FLAT DELIVERY FEE</Text><Text style={s.fee}>R99</Text><Text style={s.muted}>One clear price for every standard Cape Town delivery.</Text><Text style={s.detailLink}>Start a booking →</Text></Pressable>
    </ScrollView>
    </BlurTargetView>
    <GlassNavigation target={blurTarget} selected={destination} onNavigate={next => {
      if (next === "Send") { book(); return; }
      if (next === "History") { router.push("/history"); return; }
      setDestination(next);
      if (next === "Home") scroll.current?.scrollTo({ y: 0, animated: true });
      else showOrders();
    }} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  tabs: { flexDirection: "row", padding: 4, gap: 4, borderRadius: 12, backgroundColor: colors.soft },
  tab: { minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderRadius: 9 },
  selectedTab: { backgroundColor: colors.surface }, tabLabel: { fontSize: 11, fontWeight: "600", color: colors.ink },
  listIntro: { gap: 5 }, feeCard: { backgroundColor: colors.cream }, fee: { fontSize: 48, fontWeight: "900", letterSpacing: -2, color: colors.ink },
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, gap: 20, paddingBottom: 30, maxWidth: 760, width: "100%", alignSelf: "center" },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, eyebrow: { fontSize: 8, fontWeight: "800", letterSpacing: 1.4, color: colors.muted }, brand: { fontSize: 23, fontWeight: "800", letterSpacing: -.8, color: colors.ink, marginTop: 7 }, avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.surface, fontWeight: "700" },
  hero: { backgroundColor: colors.ink, borderRadius: 24, padding: 20, overflow: "hidden", gap: 22 }, heroTop: { flexDirection: "row", alignItems: "center", minHeight: 140 }, heroCopy: { flex: 1, zIndex: 1 }, heroEyebrow: { color: colors.heroLabel, fontSize: 8, fontWeight: "800", letterSpacing: 1 }, greeting: { color: colors.surface, fontSize: 29, fontWeight: "800", letterSpacing: -1, marginTop: 14, marginBottom: 10 }, heroDescription: { color: colors.heroText, fontSize: 12, lineHeight: 19 }, art: { width: 100, height: 130 }, orbit: { position: "absolute", width: 140, height: 100, borderRadius: 70, borderWidth: 1, borderStyle: "dashed", borderColor: "#779f8d", transform: [{ rotate: "-25deg" }], left: -28, top: 12 }, boxBack: { position: "absolute", right: 0, top: 23, width: 67, height: 76, backgroundColor: "#eacb92", borderRadius: 6, transform: [{ rotate: "8deg" }], overflow: "hidden" }, boxFront: { position: "absolute", left: -12, bottom: 0, width: 65, height: 58, borderRadius: 5, backgroundColor: "#f4d9ac", transform: [{ rotate: "-8deg" }], overflow: "hidden" }, tape: { height: 25, width: 14, backgroundColor: "#ba9564", alignSelf: "center" }, boxMark: { fontSize: 12, fontWeight: "800", color: "#78592d", margin: 8 },
  search: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, minHeight: 49 }, searchIcon: { fontSize: 25, color: colors.primary }, input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13, paddingVertical: 13 }, shortcuts: { flexDirection: "row", justifyContent: "space-between" }, shortcut: { alignItems: "center", flex: 1, gap: 9, paddingVertical: 3 }, shortcutIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, featured: { backgroundColor: colors.accent }, icon: { fontSize: 27, color: colors.primary }, shortcutLabel: { fontSize: 10, fontWeight: "700", color: colors.ink },
  sectionHeading: { flexWrap: "wrap", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }, sectionTitle: { fontSize: 19, fontWeight: "800", color: colors.ink, letterSpacing: -.5 }, switch: { color: colors.primary, fontSize: 12, fontWeight: "600", paddingVertical: 12 }, card: { backgroundColor: colors.surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, gap: 20 }, cardTop: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" }, parcelIcon: { width: 42, height: 45, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, cardCopy: { flex: 1, minWidth: 110 }, tracking: { fontSize: 13, color: colors.ink, fontWeight: "800" }, route: { color: colors.muted, fontSize: 11, marginTop: 6 }, badge: { fontSize: 9, fontWeight: "700", color: colors.primary, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: "#eaf3ed", borderRadius: 8 }, progress: { flexDirection: "row" }, step: { flex: 1, alignItems: "center", gap: 8 }, line: { position: "absolute", top: 9, left: "50%", width: "100%", height: 2, backgroundColor: colors.border }, lineComplete: { backgroundColor: colors.primary }, dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#c1cec4", backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, dotComplete: { backgroundColor: colors.primary, borderColor: colors.primary }, check: { fontSize: 11, color: colors.surface }, stepLabel: { fontSize: 9, color: colors.muted }, cardFooter: { flexDirection: "row", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: "#eef2ec", paddingTop: 12 }, muted: { color: colors.muted, fontSize: 12, lineHeight: 19 }, detailLink: { color: colors.primary, fontWeight: "700", fontSize: 11 },
  empty: { padding: 25, backgroundColor: colors.surface, borderRadius: 20, gap: 12 }, emptyAction: { padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignSelf: "flex-start" }, pickup: { backgroundColor: colors.pickup, padding: 22, borderRadius: 20, minHeight: 160 }, pickupTitle: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -1, marginTop: 10, marginBottom: 4 }, pickupArrow: { position: "absolute", right: 22, top: 65, backgroundColor: colors.accent, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, pickupNote: { color: colors.muted, fontSize: 10, marginTop: 20 },
});
