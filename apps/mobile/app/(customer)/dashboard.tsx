import { BrandLogo } from "../../components/BrandLogo";
import { BlurTargetView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { GlassNavigation } from "../../components/customer/GlassNavigation";
import { colors, fonts } from "../../lib/theme";
import { useCallback, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
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
  const { width, fontScale } = useWindowDimensions();
  const stackShortcuts = width < 350 || fontScale > 1.3;
  const { user } = useAuth();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [query, setQuery] = useState("");
  const search = useRef<TextInput>(null);
  const blurTarget = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const [destination, setDestination] = useState<"Home" | "Orders" | "Send" | "History">("Home");
  const scroll = useRef<ScrollView>(null);
  const [deliveryY, setDeliveryY] = useState(0);
  const deliveries = data?.filter(d => !past.includes(d.status) && `${d.tracking_number} ${d.pickup_city} ${d.dropoff_city}`.toLowerCase().includes(query.trim().toLowerCase()));
  const book = () => router.push("/deliveries/new");
  const showOrders = () => { setDestination("Orders"); setQuery(""); scroll.current?.scrollTo({ y: deliveryY, animated: true }); };
  useFocusEffect(useCallback(() => {
    if (!section) return;
    setDestination(section === "orders" ? "Orders" : "Home");
    setQuery("");
    scroll.current?.scrollTo({ y: section === "orders" ? deliveryY : 0, animated: true });
  }, [section, deliveryY]));
  return <SafeAreaView edges={[]} style={s.screen}>
    <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingBottom: 150 + insets.bottom }]} refreshControl={<RefreshControl tintColor={colors.primary} refreshing={loading && !!data} onRefresh={() => void refresh()} />}>
      <View style={s.heading}><BrandLogo /><Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push("/profile")} style={s.avatar}><Text style={s.avatarText}>{user?.full_name?.slice(0, 1).toUpperCase() || "E"}</Text></Pressable></View>
      <View style={s.hero}>
        <View style={s.heroTop}><View style={s.heroCopy}><Text style={s.heroEyebrow}>DELIVER ANYWHERE IN CAPE TOWN</Text><Text style={s.greeting}>Hello, {user?.full_name?.split(" ")[0] || "sender"}.</Text></View></View>
        <View style={s.search}><Ionicons name="search-outline" size={21} color={colors.primary} /><TextInput ref={search} style={s.input} value={query} onChangeText={setQuery} placeholder="Tracking number or city" placeholderTextColor={colors.muted} accessibilityLabel="Search by tracking number or city" autoCapitalize="none" autoCorrect={false} returnKeyType="search" /></View>
      </View>
      <View style={s.shortcuts}>{[{ label: "Send parcel", icon: "paper-plane-outline" as const, action: book }, { label: "Track delivery", icon: "search-outline" as const, action: () => search.current?.focus() }, { label: "Active deliveries", icon: "cube-outline" as const, action: () => showOrders() }, { label: "History", icon: "time-outline" as const, action: () => router.push("/history") }].map((item, i) => <Pressable key={item.label} accessibilityRole="button" onPress={item.action} style={({ pressed }) => [s.shortcut, stackShortcuts && s.shortcutStacked, pressed && { opacity: .65 }]}><View style={[s.shortcutIcon, i === 0 && s.featured]}><Ionicons name={item.icon} size={24} color={colors.primary} /></View><Text style={s.shortcutLabel}>{item.label}</Text></Pressable>)}</View>
      <View onLayout={event => setDeliveryY(event.nativeEvent.layout.y)} style={s.sectionHeading}>
        <Text accessibilityRole="header" style={s.sectionTitle}>Your deliveries</Text>
        <View style={s.tabs}><View style={[s.tab, s.selectedTab]}><Text style={[s.tabLabel, { color: colors.ink }]}>Active ({data?.filter(d => !past.includes(d.status)).length ?? 0})</Text></View><Pressable accessibilityRole="button" onPress={() => router.push("/history")} style={s.tab}><Text style={s.tabLabel}>History <Ionicons name="arrow-forward" size={14} color={colors.primary} /></Text></Pressable></View>
      </View>
      {query.trim() ? <Text style={s.tracking}>Search results</Text> : null}
      {loading && !data ? <Loading /> : null}
      {error ? <Failure error={error} retry={() => void refresh()} /> : null}
      {!error && deliveries?.length === 0 ? <View style={s.empty}><Text style={s.sectionTitle}>{query.trim() ? "No matching parcels" : "No active deliveries"}</Text>{query.trim() ? <Text style={s.muted}>Try another tracking number or city.</Text> : null}{!query.trim() ? <Pressable accessibilityRole="button" onPress={book} style={s.emptyAction}><Text style={s.emptyActionText}>Send your first parcel</Text><Ionicons name="arrow-forward" size={20} color={colors.surface} /></Pressable> : null}</View> : null}
      {deliveries?.map(d => {
        const current = d.status === "delivered" ? 3 : d.status === "in_transit" ? 2 : d.status === "picked_up" ? 1 : 0;
        return <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={`View ${d.tracking_number}, ${STATUS_LABELS[d.status]}`} style={s.card} onPress={() => router.push({ pathname: "/deliveries/[id]", params: { id: d.id } })}>
          <View style={s.cardTop}><View style={s.parcelIcon}><Ionicons name="cube-outline" size={25} color={colors.primary} /></View><View style={s.cardCopy}><Text style={s.tracking}>{d.tracking_number}</Text><Text style={s.route}>{d.pickup_city || d.pickup_street || "Pickup"} <Ionicons name="arrow-forward" size={12} color={colors.muted} /> {d.dropoff_city || d.dropoff_street || "Drop-off"}</Text></View><Text style={s.badge}>{STATUS_LABELS[d.status]}</Text></View>
          {!['failed', 'cancelled'].includes(d.status) ? <View style={s.progress}>{["Booked", "Picked up", "In transit", "Delivered"].map((label, index) => <View key={label} style={s.step}>{index < 3 ? <View style={[s.line, index < current && s.lineComplete]} /> : null}<View style={[s.dot, index <= current && s.dotComplete]}>{index <= current ? <Ionicons name="checkmark" size={12} color={colors.surface} /> : null}</View><Text style={s.stepLabel}>{label}</Text></View>)}</View> : null}
          <View style={s.cardFooter}><Text style={s.muted}>{d.quote_amount === null ? "Quote pending" : `${d.quote_currency} ${Number(d.quote_amount).toFixed(2)}`}</Text><Text style={s.detailLink}>View delivery <Ionicons name="arrow-forward" size={14} color={colors.primary} /></Text></View>
        </Pressable>;
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Book a pickup" onPress={book} style={s.pickup}><Text style={s.eyebrow}>BUSINESS OR PERSONAL</Text><Text style={s.pickupTitle}>Need a pickup?</Text><Text style={s.muted}>We’ll come to you.</Text><View style={s.pickupArrow}><Ionicons name="arrow-forward" size={23} color={colors.ink} /></View><Text style={s.pickupNote}>From your door. To theirs.</Text></Pressable>
      <View style={s.card}><Ionicons name="shield-checkmark-outline" size={25} color={colors.primary} /><Text style={s.eyebrow}>EZYGO PROMISE</Text><Text style={s.sectionTitle}>Simple from start to finish.</Text>{["One transparent flat fee", "Live status updates", "Secure online payment"].map(label => <View key={label} style={s.promiseRow}><Ionicons name="checkmark" size={18} color={colors.primary} /><Text style={[s.muted, { flex: 1 }]}>{label}</Text></View>)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Start a booking" onPress={book} style={[s.card, s.feeCard]}><Text style={s.eyebrow}>FLAT DELIVERY FEE</Text><Text style={s.fee}>R99</Text><Text style={s.muted}>One clear price for every standard Cape Town delivery.</Text><Text style={s.detailLink}>Start a booking <Ionicons name="arrow-forward" size={14} color={colors.primary} /></Text></Pressable>
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
  tabs: { alignSelf: "stretch", flexDirection: "row", padding: 4, gap: 4, borderRadius: 12, backgroundColor: colors.soft },
  tab: { flex: 1, alignItems: "center", minHeight: 48, paddingHorizontal: 12, justifyContent: "center", borderRadius: 24 },
  selectedTab: { backgroundColor: colors.surface }, tabLabel: { textAlign: "center", fontSize: 13, fontFamily: fonts.semibold, color: colors.ink },
  promiseRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  listIntro: { gap: 5 }, feeCard: { backgroundColor: colors.cream }, fee: { fontSize: 48, fontFamily: fonts.bold, letterSpacing: -2, color: colors.ink },
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, gap: 20, paddingBottom: 30, maxWidth: 760, width: "100%", alignSelf: "center" },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, eyebrow: { fontSize: 10, fontFamily: fonts.bold, letterSpacing: 1.4, color: colors.muted }, brand: { fontSize: 23, fontFamily: fonts.bold, letterSpacing: -.8, color: colors.ink, marginTop: 7 }, avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.surface, fontFamily: fonts.bold },
  hero: { backgroundColor: colors.ink, borderRadius: 24, padding: 20, overflow: "hidden", gap: 22 }, heroTop: { minHeight: 80, justifyContent: "center" }, heroCopy: { flex: 1 }, heroEyebrow: { color: colors.heroLabel, fontSize: 8, fontFamily: fonts.bold, letterSpacing: 1 }, greeting: { color: colors.surface, fontSize: 29, fontFamily: fonts.semibold, letterSpacing: -1, marginTop: 14, marginBottom: 10 }, heroDescription: { fontFamily: fonts.regular, color: colors.heroText, fontSize: 12, lineHeight: 19 },
  search: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface, borderRadius: 13, paddingHorizontal: 16, minHeight: 54 }, searchIcon: { fontSize: 25, color: colors.primary }, input: { fontFamily: fonts.regular, flex: 1, minWidth: 0, color: colors.ink, fontSize: 13, paddingVertical: 13 }, shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, shortcut: { flexBasis: "46%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 80, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, shortcutStacked: { flexBasis: "100%" }, shortcutIcon: { flexShrink: 0, width: 50, height: 50, borderRadius: 16, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, featured: { backgroundColor: colors.accent }, icon: { fontSize: 27, color: colors.primary }, shortcutLabel: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: fonts.semibold, color: colors.ink },
  sectionHeading: { alignItems: "flex-start", gap: 12, marginTop: 8 }, sectionTitle: { fontSize: 21, fontFamily: fonts.semibold, color: colors.ink, letterSpacing: -.5 }, switch: { color: colors.primary, fontSize: 12, fontFamily: fonts.semibold, paddingVertical: 12 }, card: { backgroundColor: colors.surface, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, gap: 20 }, cardTop: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" }, parcelIcon: { width: 42, height: 45, borderRadius: 13, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, cardCopy: { flex: 1, minWidth: 110 }, tracking: { fontSize: 13, color: colors.ink, fontFamily: fonts.bold }, route: { fontFamily: fonts.regular, color: colors.muted, fontSize: 11, marginTop: 6 }, badge: { fontSize: 11, fontFamily: fonts.bold, color: colors.primary, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: "#eaf3ed", borderRadius: 20 }, progress: { flexDirection: "row" }, step: { flex: 1, alignItems: "center", gap: 8 }, line: { position: "absolute", top: 9, left: "50%", width: "100%", height: 2, backgroundColor: colors.border }, lineComplete: { backgroundColor: colors.accent }, dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#c1cec4", backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, dotComplete: { backgroundColor: colors.ink, borderColor: colors.accent }, check: { fontSize: 11, color: colors.surface }, stepLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted }, cardFooter: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: "#eef2ec", paddingTop: 12 }, muted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, lineHeight: 19 }, detailLink: { color: colors.primary, fontFamily: fonts.bold, fontSize: 11 },
  empty: { padding: 25, backgroundColor: colors.surface, borderRadius: 20, gap: 12 }, emptyActionText: { flexShrink: 1, textAlign: "center", fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.surface }, emptyAction: { flexDirection: "row", gap: 10, minHeight: 56, justifyContent: "center", paddingVertical: 16, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.primary, alignSelf: "stretch", alignItems: "center" }, pickup: { backgroundColor: colors.pickup, padding: 22, borderRadius: 20, minHeight: 160 }, pickupTitle: { paddingRight: 48, color: colors.ink, fontSize: 27, fontFamily: fonts.bold, letterSpacing: -1, marginTop: 10, marginBottom: 4 }, pickupArrow: { position: "absolute", right: 22, top: 65, backgroundColor: colors.accent, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, pickupNote: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, marginTop: 20 },
});
