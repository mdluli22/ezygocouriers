import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts } from "../../../lib/theme";
import { DeliveryStatusCard } from "../../../components/customer/DeliveryStatus";
import { LiveDeliveryMap } from "../../../components/customer/LiveDeliveryMap";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { STATUS_LABELS, isValidTransition } from "@ezygo/contracts";
import { customerApi, deliveryId } from "../../../lib/customer-api";
import { useResource } from "../../../lib/use-resource";
import { Page, Title, Card, Notice, Action, Loading, Failure, errorMessage, styles } from "../../../components/customer/UI";
export default function Detail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = deliveryId(params.id);
  const fetcher = useCallback(() => { if (!id) return Promise.reject(new Error("Invalid delivery link.")); return customerApi.detail(id); }, [id]);
  const { data, error, loading, refresh } = useResource(fetcher, 15000);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  async function cancel() { if (!id || busy) return; setBusy(true); setActionError(""); try { await customerApi.cancel(id); await refresh(); } catch (e) { setActionError(errorMessage(e)); } finally { setBusy(false); } }
  const d = data?.delivery;
  return <Page refresh={() => void refresh()} refreshing={loading && !!data}>
    {loading && !data ? <Loading /> : null}{error ? <Failure error={error} retry={() => void refresh()} /> : null}
    {d ? <>
      <View style={{ gap: 8 }}><Text style={detailStyles.eyebrow}>YOUR DELIVERY</Text><Title>Track your parcel</Title><Text selectable style={detailStyles.reference}>{d.tracking_number}</Text></View>
      <DeliveryStatusCard status={d.status} updatedAt={d.updated_at} />
      <LiveDeliveryMap id={d.id} status={d.status} />
      <Card><Text accessibilityRole="header" style={detailStyles.title}>The journey</Text>
        <View style={detailStyles.event}><View style={detailStyles.eventRail}><View style={detailStyles.eventDot}><Ionicons name="navigate" size={14} color={colors.ink} /></View><View style={detailStyles.eventLine} /></View><View style={detailStyles.eventCopy}><Text style={styles.label}>Pickup</Text><Notice message={d.pickup_street} /><Notice message={`${d.pickup_contact_name} · ${d.pickup_contact_phone}`} /><Notice message={d.pickup_address_notes} /></View></View>
        <View style={detailStyles.heading}><View style={detailStyles.eventDot}><Ionicons name="location" size={15} color={colors.ink} /></View><View style={detailStyles.flex}><Text style={styles.label}>Drop-off</Text><Notice message={d.dropoff_street} /><Notice message={`${d.recipient_name} · ${d.recipient_phone}`} /><Notice message={d.dropoff_address_notes} /></View></View>
      </Card>
      <Card><View style={detailStyles.heading}><View style={detailStyles.icon}><Ionicons name="person-outline" size={23} color={colors.ink} /></View><View style={detailStyles.flex}><Text accessibilityRole="header" style={detailStyles.title}>Your driver</Text><Text style={styles.label}>{d.driver_name || "Awaiting assignment"}</Text>{d.driver_phone ? <Notice message={d.driver_phone} /> : null}</View></View></Card>
      <Card><Text accessibilityRole="header" style={detailStyles.title}>Delivery summary</Text><View style={detailStyles.summary}><Notice message="Delivery fee" /><Text style={detailStyles.price}>{d.quote_amount !== null ? `${d.quote_currency ?? "ZAR"} ${Number(d.quote_amount).toFixed(2)}` : "Quote pending"}</Text></View><Notice message={`Booked ${new Date(d.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`} /></Card>
      <Card><Text accessibilityRole="header" style={detailStyles.title}>Parcel details</Text><Text style={detailStyles.address}>{d.parcel_description}</Text><Notice message={`${d.package_type ?? "Standard"} parcel${d.fragile ? " · Fragile" : ""}`} /><Notice message={d.special_instructions} />{d.require_pin ? <View style={detailStyles.security}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /><View style={detailStyles.flex}><Text style={styles.label}>PIN handover</Text><Notice message="The recipient’s PIN is required to confirm delivery." /></View></View> : null}</Card>
      {d.status === "confirmed" ? <Action label="Continue to payment" onPress={() => router.push({ pathname: "/payment", params: { id: d.id } })} /> : null}
      <Card><Text accessibilityRole="header" style={detailStyles.title}>Delivery activity</Text>{data.logs.length ? [...data.logs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).map((log, index) => <View key={log.id} style={detailStyles.event}><View style={detailStyles.eventRail}><View style={[detailStyles.eventDot, { backgroundColor: colors.cream }]}><Ionicons name="checkmark" size={16} color={colors.ink} /></View>{index < data.logs.length - 1 ? <View style={detailStyles.eventLine} /> : null}</View><View style={detailStyles.eventCopy}><Text style={styles.label}>{STATUS_LABELS[log.status]}</Text><Notice message={new Date(log.created_at).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} /><Notice message={log.note} /></View></View>) : <Notice message="Status updates will appear here." />}</Card>
      <Notice message={actionError} error />
      {isValidTransition(d.status, "cancelled") ? <Action label="Cancel delivery" secondary busy={busy} onPress={() => Alert.alert("Cancel this delivery?", "Cancellation will be checked by the server. Any payment refund is handled according to the delivery policy.", [{ text: "Keep delivery", style: "cancel" }, { text: "Cancel delivery", style: "destructive", onPress: () => void cancel() }])} /> : null}
    </> : null}
  </Page>;
}

const detailStyles = StyleSheet.create({
  flex: { flex: 1 }, eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: colors.muted },
  reference: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  title: { fontFamily: fonts.bold, fontSize: 19, letterSpacing: -.5, color: colors.text },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  event: { flexDirection: "row", gap: 13, minHeight: 72 }, eventRail: { width: 25, alignItems: "center" },
  eventDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  eventLine: { width: 1, flex: 1, backgroundColor: "#a8c5b7", marginVertical: 4 }, eventCopy: { flex: 1, gap: 3, paddingBottom: 18 },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" },
  price: { fontFamily: fonts.semibold, fontSize: 26, color: colors.text }, address: { fontFamily: fonts.medium, fontSize: 16, color: colors.text, lineHeight: 24 },
  security: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: colors.soft, borderRadius: 8 },
});
