import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { STATUS_LABELS, type DriverDeliverySummary } from "@ezygo/contracts";
import { DutyPanel } from "../../components/driver/DutyPanel";
import { NotificationsPanel } from "../../components/operations/Notifications";
import { QueuePanel } from "../../components/driver/QueuePanel";
import { Failure, Loading, Action } from "../../components/customer/UI";
import { useAuth } from "../../lib/auth/provider";
import { useResource } from "../../lib/use-resource";
import { driverApi, activeTrip } from "../../lib/driver/api";
import { colors } from "../../lib/theme";

const CAPE_TOWN = { latitude: -33.9249, longitude: 18.4241, latitudeDelta: .09, longitudeDelta: .09 };
const mapStyle = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#eef0eb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cddedb" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
];
type Tab = "Drive" | "Trips" | "Account";
export default function Assignments() {
  const { user, signOut } = useAuth();
  const { data, error, loading, refresh } = useResource(driverApi.list);
  const [tab, setTab] = useState<Tab>("Drive");
  const [history, setHistory] = useState(false);
  const [locating, setLocating] = useState(false);
  const [position, setPosition] = useState<{ latitude: number; longitude: number }>();
  const [locationMessage, setLocationMessage] = useState("");
  const map = useRef<MapView>(null);
  const locatingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useFocusEffect(useCallback(() => { const timer = setInterval(() => void refresh(), 15000); return () => clearInterval(timer); }, [refresh]));
  const assignments = data?.filter(d => activeTrip(d.status)) ?? [];
  const previous = data?.filter(d => !activeTrip(d.status)) ?? [];
  const current = assignments.find(d => ["picked_up", "in_transit"].includes(d.status)) ?? assignments[0];
  const openTrip = (id: number) => router.push({ pathname: "/driver/trip/[id]", params: { id } });
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
    Alert.alert("Sign out?", "Location sharing will stop and unsent changes on this device will be removed. Sync first if you have pending work.", [{ text: "Stay signed in", style: "cancel" }, { text: "Sign out", onPress: () => { void signOut(); } }]);
  }
  return <View style={s.screen}>
    {tab === "Drive" ? <View style={s.mapArea}>
      <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={CAPE_TOWN} customMapStyle={mapStyle} showsPointsOfInterests={false} showsCompass={false} showsMyLocationButton={false} toolbarEnabled={false} accessibilityLabel="Cape Town delivery area map">
        {position ? <Marker coordinate={position} title="Your position when last located" pinColor={colors.primary} /> : null}
      </MapView>
      <View pointerEvents="box-none" style={[s.floatingHeader, { top: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => setTab("Account")} style={s.mapButton}><Ionicons name="menu" size={25} color={s.title.color} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="View assigned deliveries" onPress={() => { setHistory(false); setTab("Trips"); }} style={s.summary}><Ionicons name="cube" size={18} color="#ccebd9" /><Text style={s.summaryNumber}>{data ? assignments.length : "—"}</Text><Text style={s.summaryLabel}>ASSIGNED</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh assignments" onPress={() => void refresh()} style={s.mapButton}>{loading ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="refresh" size={22} color={colors.ink} />}</Pressable>
      </View>
      <View style={s.mapFooter}><View style={s.cityChip}><Ionicons name="location" size={13} color={colors.primary} /><Text style={s.cityText}>{position ? "Last located position" : "Cape Town delivery area"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Centre map on my location" disabled={locating} onPress={() => void locate()} style={s.mapButton}>{locating ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="locate-outline" size={24} color={colors.ink} />}</Pressable></View>
    </View> : <View style={[s.pageHeader, { paddingTop: insets.top + 22 }]}><Text style={s.kicker}>EZYGO DRIVER</Text><Text style={s.pageTitle}>{tab === "Trips" ? "Your trips" : "Your account"}</Text></View>}

    <View style={[s.sheet, tab === "Drive" ? { maxHeight: height * .52 } : s.fill]}>
      {tab === "Drive" ? <View style={s.sheetHandle} /> : null}
      <ScrollView contentContainerStyle={s.sheetContent} refreshControl={<RefreshControl tintColor={colors.primary} refreshing={loading && !!data} onRefresh={() => void refresh()} />}>
        {tab === "Drive" ? <>
          <DutyPanel />
          {locationMessage ? <Text accessibilityRole="alert" style={s.message}>{locationMessage}</Text> : null}
          {error ? <Failure error={error} retry={() => void refresh()} /> : null}
          {loading && !data ? <Loading /> : null}
          {current ? <><View style={s.sectionHeading}><Text style={s.kicker}>YOUR NEXT MOVE</Text><Text style={s.liveBadge}>Assigned to you</Text></View><TripCard delivery={current} prominent onPress={() => openTrip(current.id)} /></> : !loading && !error ? <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="car-outline" size={29} color={colors.primary} /></View><Text style={s.emptyTitle}>You’re all caught up</Text><Text style={s.description}>Your next assignment will appear here. We check for updates automatically.</Text></View> : null}
          {user ? <QueuePanel owner={user.id} /> : null}
        </> : tab === "Trips" ? <>
          <View style={s.tabs}>{[false, true].map(past => <Pressable key={String(past)} accessibilityRole="button" accessibilityState={{ selected: past === history }} onPress={() => setHistory(past)} style={[s.tab, past === history && s.selectedTab]}><Text style={[s.tabText, past === history && s.selectedTabText]}>{past ? "History" : `Assigned (${assignments.length})`}</Text></Pressable>)}</View>
          {loading && !data ? <Loading /> : null}{error ? <Failure error={error} retry={() => void refresh()} /> : null}
          {(history ? previous : assignments).map(delivery => <TripCard key={delivery.id} delivery={delivery} onPress={() => openTrip(delivery.id)} />)}
          {!loading && !error && !(history ? previous : assignments).length ? <View style={s.empty}><Ionicons name="receipt-outline" size={30} color={colors.primary} /><Text style={s.emptyTitle}>{history ? "No previous trips yet" : "No assignments right now"}</Text><Text style={s.description}>Pull down to check for updates.</Text></View> : null}
          {user ? <QueuePanel owner={user.id} /> : null}
        </> : <>
          <View style={s.profile}><View style={s.avatar}><Ionicons name="person" size={29} color="white" /></View><View style={s.fill}><Text style={s.title}>{user?.full_name ?? "EzyGo driver"}</Text><Text style={s.description}>{user?.email}</Text></View></View>
          <DutyPanel />{user ? <QueuePanel owner={user.id} /> : null}<NotificationsPanel /><Action label="Sign out" secondary onPress={logout} />
        </>}
      </ScrollView>
    </View>
    <View style={[s.navigation, { paddingBottom: Math.max(insets.bottom, 12) }]}>{([{ label: "Drive", icon: "navigate-outline" }, { label: "Trips", icon: "list-outline" }, { label: "Account", icon: "person-circle-outline" }] as const).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: tab === item.label }} onPress={() => setTab(item.label)} style={s.navItem}><Ionicons name={item.icon} size={23} color={tab === item.label ? colors.ink : colors.muted} /><Text style={[s.navText, tab === item.label && s.activeNav]}>{item.label}</Text><View style={[s.navDot, tab === item.label && s.activeDot]} /></Pressable>)}</View>
  </View>;
}

function TripCard({ delivery, prominent = false, onPress }: { delivery: DriverDeliverySummary; prominent?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open trip ${delivery.tracking_number}, ${STATUS_LABELS[delivery.status]}`} onPress={onPress} style={({ pressed }) => [s.tripCard, prominent && s.prominentCard, pressed && { opacity: .75 }]}>
    <View style={s.sectionHeading}><Text style={s.tracking}>{delivery.tracking_number}</Text><Text style={s.status}>{STATUS_LABELS[delivery.status]}</Text></View>
    <View style={s.addressRow}><View style={s.pickupDot} /><View style={s.fill}><Text style={s.addressLabel}>PICKUP</Text><Text style={s.address}>{delivery.pickup_street}</Text><Text style={s.description}>{delivery.pickup_city}</Text></View></View>
    <View style={s.addressRow}><View style={s.dropoffDot} /><View style={s.fill}><Text style={s.addressLabel}>DROP-OFF</Text><Text style={s.address}>{delivery.dropoff_street}</Text><Text style={s.description}>{delivery.dropoff_city}</Text></View></View>
    <View style={prominent ? s.tripAction : s.tripLink}><Text style={prominent ? s.tripActionText : s.tripLinkText}>{prominent ? "Open current trip" : "View trip"}</Text><Ionicons name="arrow-forward" size={19} color={prominent ? "white" : colors.ink} /></View>
  </Pressable>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" }, fill: { flex: 1 }, mapArea: { flex: 1, minHeight: 170, backgroundColor: "#eef0eb" },
  floatingHeader: { position: "absolute", left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  mapButton: { width: 47, height: 47, borderRadius: 24, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: colors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: .12, shadowRadius: 7, elevation: 4 },
  summary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.ink, paddingHorizontal: 17, minHeight: 46, borderRadius: 24 }, summaryNumber: { color: "white", fontSize: 20, fontWeight: "800" }, summaryLabel: { color: "#d5dcd8", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  mapFooter: { position: "absolute", bottom: 27, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, cityChip: { flexDirection: "row", gap: 5, padding: 9, backgroundColor: "#fffffff0", borderRadius: 15 }, cityText: { fontSize: 10, fontWeight: "600", color: colors.primary },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 27, borderTopRightRadius: 27, marginTop: -16, shadowColor: colors.ink, shadowOffset: { width: 0, height: -4 }, shadowOpacity: .07, shadowRadius: 14 }, sheetHandle: { height: 4, width: 36, borderRadius: 2, backgroundColor: "#d9deda", alignSelf: "center", marginTop: 10 }, sheetContent: { padding: 22, gap: 18, paddingBottom: 25 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink }, description: { color: colors.muted, fontSize: 12, lineHeight: 19 }, kicker: { color: colors.muted, fontSize: 10, letterSpacing: 1.1, fontWeight: "800" }, sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }, liveBadge: { fontSize: 10, fontWeight: "700", color: colors.primary },
  empty: { padding: 18, gap: 10, alignItems: "center", borderRadius: 18, backgroundColor: "#f5f7f5" }, emptyIcon: { backgroundColor: "#e7ede8", borderRadius: 25, padding: 12 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  tripCard: { borderWidth: 1, borderColor: "#e4e8e5", borderRadius: 20, padding: 17, gap: 17 }, prominentCard: { backgroundColor: "#f8faf8" }, tracking: { fontSize: 12, fontWeight: "800", color: colors.ink }, status: { color: colors.primary, fontSize: 10, fontWeight: "700", backgroundColor: "#e8f1eb", padding: 6, borderRadius: 7 }, addressRow: { flexDirection: "row", gap: 13, alignItems: "flex-start" }, pickupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 }, dropoffDot: { width: 10, height: 10, backgroundColor: colors.ink, marginTop: 4 }, addressLabel: { fontSize: 9, letterSpacing: 1, fontWeight: "700", color: colors.muted, marginBottom: 4 }, address: { fontSize: 15, color: colors.ink, fontWeight: "700" }, tripAction: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, backgroundColor: colors.ink, borderRadius: 12 }, tripActionText: { color: "white", fontWeight: "700", fontSize: 14 }, tripLink: { flexDirection: "row", justifyContent: "space-between" }, tripLinkText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  pageHeader: { padding: 24, paddingBottom: 32, gap: 8 }, pageTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -1, color: colors.ink }, tabs: { flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: "#f0f3f0", gap: 4 }, tab: { flex: 1, padding: 12, alignItems: "center", borderRadius: 11 }, selectedTab: { backgroundColor: colors.ink }, tabText: { color: colors.primary, fontWeight: "700", fontSize: 12 }, selectedTabText: { color: "white" }, profile: { flexDirection: "row", gap: 14, alignItems: "center" }, avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  navigation: { flexDirection: "row", paddingTop: 12, borderTopWidth: 1, borderTopColor: "#edf0ed", backgroundColor: "white" }, navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, minHeight: 50 }, navText: { fontSize: 10, color: colors.muted, fontWeight: "600" }, activeNav: { color: colors.ink, fontWeight: "800" }, navDot: { width: 4, height: 4, borderRadius: 2 }, activeDot: { backgroundColor: colors.ink }, message: { color: colors.error, fontSize: 12, lineHeight: 18 },
});
