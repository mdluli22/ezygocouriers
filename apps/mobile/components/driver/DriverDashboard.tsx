import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { STATUS_LABELS, type DriverDeliverySummary, type MobileAuthUser } from "@ezygo/contracts";
import { BrandLogo } from "../BrandLogo";
import { Failure, Loading, Action } from "../customer/UI";
import { activeTrip } from "../../lib/driver/api";
import { colors, fonts } from "../../lib/theme";

const CAPE_TOWN = { latitude: -33.9249, longitude: 18.4241, latitudeDelta: .09, longitudeDelta: .09 };
const mapStyle = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#eef0eb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cddedb" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
];
type Tab = "Drive" | "Deliveries" | "Account";
interface Props {
  user: MobileAuthUser | null; data: DriverDeliverySummary[] | null; error: string; loading: boolean;
  refresh: () => Promise<void>; signOut: () => Promise<void>; duty: ReactNode; queue: ReactNode; notifications: ReactNode;
}

/** Presentation stays separate from authenticated data and availability mutations. */
export function DriverDashboard({ user, data, error, loading, refresh, signOut, duty, queue, notifications }: Props) {
  const [tab, setTab] = useState<Tab>("Drive");
  const [history, setHistory] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [position, setPosition] = useState<{ latitude: number; longitude: number }>();
  const [locationMessage, setLocationMessage] = useState("");
  const map = useRef<MapView>(null);
  const locatingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { height, width, fontScale } = useWindowDimensions();
  const assignments = data?.filter(d => activeTrip(d.status)) ?? [];
  const previous = data?.filter(d => !activeTrip(d.status)) ?? [];
  const current = assignments.find(d => ["picked_up", "in_transit"].includes(d.status)) ?? assignments[0];
  const openTrip = (id: number) => router.push({ pathname: "/driver/trip/[id]", params: { id } });
  const showDeliveries = (past = false) => { setHistory(past); setTab("Deliveries"); };
  async function locate() {
    if (locatingRef.current) return;
    locatingRef.current = true; setLocating(true); setLocationMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setLocationMessage("Allow location access to centre the map on your position."); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setPosition(point);
      map.current?.animateToRegion({ ...point, latitudeDelta: .025, longitudeDelta: .025 }, 450);
    } catch { setLocationMessage("Couldn’t find your location. Tap the location button to retry."); }
    finally { locatingRef.current = false; setLocating(false); }
  }
  function logout() {
    Alert.alert("Sign out?", "Location sharing will stop and unsent changes on this device will be removed. Sync first if you have pending work.", [{ text: "Stay signed in", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => { void signOut(); } }]);
  }
  const drive = tab === "Drive";
  return <View style={s.screen}>
    {drive ? <View style={s.mapArea}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={CAPE_TOWN} customMapStyle={mapStyle} legalLabelInsets={{ top: 0, left: 0, bottom: 24, right: 12 }} showsPointsOfInterests={false} showsCompass={false} showsMyLocationButton={false} toolbarEnabled={false} accessibilityLabel="Cape Town delivery area map">
        {position ? <Marker coordinate={position} title="Your position when last located" pinColor={colors.primary} /> : null}
      </MapView>
      <View pointerEvents="box-none" style={[s.floatingHeader, { top: insets.top + 12, left: Math.max(insets.left, 16), right: Math.max(insets.right, 16) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open driver account" onPress={() => setTab("Account")} style={s.mapButton}><Ionicons name="menu-outline" size={25} color={colors.ink} /></Pressable>
        {width >= 350 && fontScale <= 1.3 ? <View style={s.brandPill}><BrandLogo compact /></View> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh deliveries" accessibilityState={{ busy: loading }} onPress={() => void refresh()} style={s.mapButton}>{loading ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="refresh-outline" size={22} color={colors.ink} />}</Pressable>
      </View>
      <View pointerEvents="box-none" style={s.mapFooter}><View style={s.mapCaption}><View style={s.mapCaptionDot} /><Text style={s.mapCaptionText}>{position ? "Last located position" : "Delivery area"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Centre map on my location" accessibilityState={{ busy: locating, disabled: locating }} disabled={locating} onPress={() => void locate()} style={s.mapButton}>{locating ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="locate-outline" size={24} color={colors.ink} />}</Pressable></View>
    </View> : <View style={[s.pageHeader, { paddingTop: insets.top + 18 }]}><BrandLogo compact /><Text style={s.pageTitle}>{tab === "Deliveries" ? "Your deliveries" : "Your account"}</Text></View>}

    <View style={[s.sheet, drive ? { maxHeight: height * (expanded || fontScale > 1.3 || height < 650 ? .68 : .54) } : s.fill]}>
      {drive ? <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Show more map" : "Show more delivery details"} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={s.sheetToggle}><View style={s.handle} /><Ionicons name={expanded ? "chevron-down" : "chevron-up"} size={16} color={colors.muted} /></Pressable> : null}
      <ScrollView contentContainerStyle={[s.sheetContent, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]} refreshControl={<RefreshControl tintColor={colors.primary} refreshing={loading && !!data} onRefresh={() => void refresh()} />}>
        {drive ? <>
          {duty}
          {locationMessage ? <Text accessibilityRole="alert" style={s.message}>{locationMessage}</Text> : null}
          {error ? <Failure error={error} retry={() => void refresh()} /> : null}
          {loading && !data ? <Loading /> : null}
          {current ? <TripCard delivery={current} prominent compact={!expanded} onPress={() => openTrip(current.id)} /> : !loading && !error ? <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="checkmark-done-outline" size={26} color={colors.primary} /></View><View style={s.fill}><Text style={s.emptyTitle}>You’re all caught up</Text><Text style={s.description}>No deliveries assigned.</Text></View></View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="View delivery queue" onPress={() => showDeliveries()} style={s.queueShortcut}><View style={s.queueIcon}><Ionicons name="layers-outline" size={21} color={colors.primary} /></View><View style={s.fill}><Text style={s.title}>Delivery queue</Text><Text style={s.description}>{"Assignments and delivery history"}</Text></View><Ionicons name="arrow-forward" size={20} color={colors.primary} /></Pressable>
          {queue}
        </> : tab === "Deliveries" ? <>
          <View style={s.tabs}>{[false, true].map(past => <Pressable key={String(past)} accessibilityRole="tab" accessibilityState={{ selected: past === history }} onPress={() => setHistory(past)} style={[s.tab, past === history && s.selectedTab]}><Ionicons name={past ? "time-outline" : "cube-outline"} size={18} color={past === history ? colors.surface : colors.primary} /><Text style={[s.tabText, past === history && s.selectedTabText]}>{past ? "History" : "Active"}</Text></Pressable>)}</View>
          {loading && !data ? <Loading /> : null}{error ? <Failure error={error} retry={() => void refresh()} /> : null}
          {(history ? previous : assignments).map(delivery => <TripCard key={delivery.id} delivery={delivery} onPress={() => openTrip(delivery.id)} />)}
          {!loading && !error && !(history ? previous : assignments).length ? <View style={s.empty}><Ionicons name="cube-outline" size={28} color={colors.primary} /><Text style={s.emptyTitle}>{history ? "No previous deliveries" : "No active deliveries"}</Text></View> : null}
          {queue}
        </> : <>
          <View style={s.profile}><View style={s.avatar}><Text style={s.initial}>{user?.full_name?.slice(0, 1).toUpperCase() || "D"}</Text></View><View style={s.fill}><Text style={s.profileName}>{user?.full_name ?? "EzyGo driver"}</Text><Text style={s.profileEmail}>{user?.email}</Text></View><Ionicons name="shield-checkmark-outline" size={22} color={colors.heroLabel} /></View>
          {duty}{queue}{notifications}<Action label="Sign out" danger onPress={logout} />
        </>}
      </ScrollView>
    </View>
    <View style={[s.navigation, { paddingBottom: Math.max(insets.bottom, 12), paddingLeft: insets.left, paddingRight: insets.right }]}>{([{ label: "Drive", icon: "navigate-outline", selected: "navigate" }, { label: "Deliveries", icon: "cube-outline", selected: "cube" }, { label: "Account", icon: "person-circle-outline", selected: "person-circle" }] as const).map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: tab === item.label }} onPress={() => setTab(item.label)} style={s.navItem}><View style={[s.navIcon, tab === item.label && s.activeNavIcon]}><Ionicons name={tab === item.label ? item.selected : item.icon} size={23} color={tab === item.label ? colors.ink : colors.muted} /></View><Text style={[s.navText, tab === item.label && s.activeNav]}>{item.label}</Text></Pressable>)}</View>
  </View>;
}

function TripCard({ delivery, prominent = false, compact = false, onPress }: { delivery: DriverDeliverySummary; prominent?: boolean; compact?: boolean; onPress: () => void }) {
  const foreground = prominent ? colors.surface : colors.text;
  const muted = prominent ? colors.heroText : colors.muted;
  const heading = delivery.status === "assigned" ? "Your next pickup" : "Continue delivery";
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open delivery ${delivery.tracking_number}, ${STATUS_LABELS[delivery.status]}`} onPress={onPress} style={({ pressed }) => [s.tripCard, prominent && s.prominentCard, compact && s.compactCard, pressed && { opacity: .8 }]}>
    {prominent && !compact ? <View style={s.cardHeading}><Text style={s.eyebrow}>CURRENT DELIVERY</Text><Ionicons name="navigate-outline" size={22} color={colors.accent} /></View> : null}
    {prominent ? <Text style={s.focusTitle}>{heading}</Text> : null}
    <View style={s.cardHeading}><Text style={[s.tracking, { color: muted }]}>{delivery.tracking_number}</Text><Text style={[s.status, prominent && s.focusStatus]}>{STATUS_LABELS[delivery.status]}</Text></View>
    <View style={s.route}>
      {compact ? <View style={s.stop}><View style={s.rail}><Ionicons name={delivery.status === "assigned" ? "navigate-outline" : "location-outline"} size={17} color={colors.accent} /></View><View style={s.fill}><Text style={[s.addressLabel, { color: muted }]}>{delivery.status === "assigned" ? "PICKUP" : "DROP-OFF"}</Text><Text numberOfLines={2} style={[s.address, { color: foreground }]}>{delivery.status === "assigned" ? delivery.pickup_street : delivery.dropoff_street}</Text></View></View> : <>
      <View style={s.stop}><View style={s.rail}><View style={[s.pickupDot, prominent && s.amberBorder]} /><View style={[s.routeLine, prominent && s.focusLine]} /></View><View style={s.stopCopy}><Text style={[s.addressLabel, { color: muted }]}>PICKUP</Text><Text style={[s.address, { color: foreground }]}>{delivery.pickup_street}</Text></View></View>
      <View style={s.stop}><View style={s.rail}><View style={[s.dropoffDot, prominent && s.amberFill]} /></View><View style={s.fill}><Text style={[s.addressLabel, { color: muted }]}>DROP-OFF</Text><Text style={[s.address, { color: foreground }]}>{delivery.dropoff_street}</Text></View></View>
    </>}
    </View>
    {!compact && (delivery.fragile || delivery.require_pin) ? <View style={s.tags}>{delivery.fragile ? <View style={[s.tag, prominent && s.focusTag]}><Ionicons name="alert-circle-outline" size={14} color={prominent ? "#ffdaa0" : colors.primary} /><Text style={[s.tagText, prominent && s.focusTagText]}>Fragile</Text></View> : null}{delivery.require_pin ? <View style={[s.tag, prominent && s.focusTag]}><Ionicons name="key-outline" size={14} color={prominent ? "#ffdaa0" : colors.primary} /><Text style={[s.tagText, prominent && s.focusTagText]}>PIN handover</Text></View> : null}</View> : null}
    <View style={[s.tripAction, prominent && s.focusAction]}><Text style={[s.tripActionText, prominent && { color: colors.ink }]}>{prominent ? delivery.status === "assigned" ? "View pickup" : "Continue delivery" : "View delivery"}</Text><Ionicons name="arrow-forward" size={20} color={colors.ink} /></View>
  </Pressable>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface }, fill: { flex: 1 }, mapArea: { flex: 1, minHeight: 140, backgroundColor: "#eef0eb" },
  floatingHeader: { position: "absolute", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  mapButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", shadowColor: colors.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: .1, shadowRadius: 8, elevation: 4 },
  brandPill: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.surface, shadowColor: colors.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: .08, shadowRadius: 8, elevation: 3 },
  mapFooter: { position: "absolute", bottom: 30, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  mapCaption: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: "#ffffffed", borderRadius: 16 }, mapCaptionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }, mapCaptionText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -18, shadowColor: colors.ink, shadowOffset: { width: 0, height: -4 }, shadowOpacity: .08, shadowRadius: 16, elevation: 5 },
  sheetToggle: { minHeight: 32, alignItems: "center", justifyContent: "center", gap: 2 }, handle: { width: 34, height: 3, borderRadius: 2, backgroundColor: "#d1dad5", marginTop: 7 }, sheetContent: { paddingTop: 8, paddingBottom: 24, gap: 18 },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text }, description: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, lineHeight: 19 },
  empty: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center", padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border }, emptyIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft }, emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  queueShortcut: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12, minHeight: 60 }, queueIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  compactCard: { padding: 18, gap: 12 },
  tripCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, padding: 20, gap: 16 }, prominentCard: { borderWidth: 0, backgroundColor: "#153838", borderRadius: 18 }, cardHeading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.3, color: colors.heroText }, focusTitle: { fontFamily: fonts.semibold, fontSize: 27, lineHeight: 33, letterSpacing: -.7, color: colors.surface }, tracking: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  status: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary, backgroundColor: colors.soft, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 }, focusStatus: { color: "#cdf0dc", backgroundColor: "#31584d" },
  route: { gap: 0 }, stop: { flexDirection: "row", gap: 12 }, rail: { width: 14, alignItems: "center", paddingTop: 4 }, pickupDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: colors.primary }, dropoffDot: { width: 11, height: 11, borderRadius: 2, backgroundColor: colors.primary }, routeLine: { width: 1, flex: 1, backgroundColor: "#c1d1c7", marginVertical: 5, minHeight: 20 }, focusLine: { backgroundColor: "#577c6f" }, amberBorder: { borderColor: colors.accent }, amberFill: { backgroundColor: colors.accent }, stopCopy: { flex: 1, paddingBottom: 20 }, addressLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, marginBottom: 5 }, address: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, tag: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.soft, padding: 7, borderRadius: 6 }, tagText: { fontFamily: fonts.medium, fontSize: 11, color: colors.primary }, focusTag: { backgroundColor: "#385044" }, focusTagText: { color: "#ffdaa0" },
  tripAction: { minHeight: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.soft }, focusAction: { backgroundColor: colors.accent }, tripActionText: { fontFamily: fonts.bold, flexShrink: 1, fontSize: 14, color: colors.primary },
  pageHeader: { backgroundColor: colors.soft, paddingHorizontal: 24, paddingBottom: 32, gap: 20 }, pageTitle: { fontFamily: fonts.semibold, fontSize: 30, letterSpacing: -.9, color: colors.text },
  tabs: { flexDirection: "row", padding: 4, gap: 6, backgroundColor: colors.soft, borderRadius: 16 }, tab: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 12, minHeight: 48, borderRadius: 12 }, selectedTab: { backgroundColor: colors.primary }, tabText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary }, selectedTabText: { color: colors.surface },
  profile: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.ink, padding: 22, borderRadius: 18 }, avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#31584d", justifyContent: "center", alignItems: "center" }, initial: { fontFamily: fonts.semibold, fontSize: 24, color: colors.surface }, profileName: { fontFamily: fonts.semibold, fontSize: 20, color: colors.surface }, profileEmail: { fontFamily: fonts.regular, fontSize: 12, color: colors.heroText, marginTop: 5 },
  navigation: { flexDirection: "row", backgroundColor: colors.surface, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, minHeight: 62, paddingBottom: 4 }, navIcon: { width: 54, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, activeNavIcon: { backgroundColor: "#e8f0eb" }, navText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted }, activeNav: { fontFamily: fonts.bold, color: colors.ink }, message: { fontFamily: fonts.regular, color: colors.error, fontSize: 12, lineHeight: 18 },
});
