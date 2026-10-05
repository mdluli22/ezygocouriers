import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../../lib/theme";
import { tripStyles as detailStyles } from "../../../components/driver/TripUI";
import { LiveDeliveryMap } from "../../../components/customer/LiveDeliveryMap";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { STATUS_LABELS, isValidTransition } from "@ezygo/contracts";
import { customerApi, deliveryId } from "../../../lib/customer-api";
import { useResource } from "../../../lib/use-resource";
import { Page, Title, Card, Notice, Action, Loading, Failure, errorMessage, styles } from "../../../components/customer/UI";
export default function Detail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = deliveryId(params.id);
  const fetcher = useCallback(() => { if (!id) return Promise.reject(new Error("Invalid delivery link.")); return customerApi.detail(id); }, [id]);
  const { data, error, loading, refresh } = useResource(fetcher);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  async function cancel() { if (!id || busy) return; setBusy(true); setActionError(""); try { await customerApi.cancel(id); await refresh(); } catch (e) { setActionError(errorMessage(e)); } finally { setBusy(false); } }
  const d = data?.delivery;
  return <Page refresh={() => void refresh()} refreshing={loading && !!data}>
    {loading && !data ? <Loading /> : null}{error ? <Failure error={error} retry={() => void refresh()} /> : null}
    {d ? <>
      <LiveDeliveryMap id={d.id} status={d.status} />
      <View style={detailStyles.hero}>
        <View style={detailStyles.heroTop}><Text style={detailStyles.eyebrow}>YOUR DELIVERY</Text><Text style={detailStyles.status}>{STATUS_LABELS[d.status]}</Text></View>
        <Text accessibilityRole="header" style={detailStyles.tracking}>{d.tracking_number}</Text>
        <Text style={{ color: colors.heroText, fontSize: 14 }}>{d.parcel_description} · {d.package_type ?? "Parcel"}</Text>
        <Text style={{ color: colors.surface, fontSize: 24, fontWeight: "700" }}>{d.quote_amount !== null ? `${d.quote_currency} ${Number(d.quote_amount).toFixed(2)}` : "Quote pending"}</Text>
      </View>
      <Card>
        <View style={detailStyles.event}><View style={detailStyles.eventRail}><View style={detailStyles.eventDot}><Ionicons name="navigate" size={14} color={colors.ink} /></View><View style={detailStyles.eventLine} /></View><View style={detailStyles.eventCopy}><Text style={styles.label}>Pickup</Text><Notice message={d.pickup_street} /></View></View>
        <View style={detailStyles.heading}><View style={detailStyles.eventDot}><Ionicons name="location" size={15} color={colors.ink} /></View><View style={detailStyles.flex}><Text style={styles.label}>Drop-off</Text><Notice message={d.dropoff_street} /><Notice message={`${d.recipient_name} · ${d.recipient_phone}`} /></View></View>
      </Card>
      <Card><View style={detailStyles.heading}><View style={detailStyles.icon}><Ionicons name="person-outline" size={23} color={colors.ink} /></View><View style={detailStyles.flex}><Text style={styles.label}>{d.driver_name || "Your delivery partner"}</Text><Notice message={d.driver_name ? d.driver_phone || "Driver assigned" : "We’ll show your driver here once assigned."} /></View></View></Card>
      {d.status === "confirmed" ? <Action label="Continue to payment" onPress={() => router.push({ pathname: "/payment", params: { id: d.id } })} /> : null}
      <Card><Title>Delivery progress</Title>{data.logs.length ? data.logs.map((log, index) => <View key={log.id} style={detailStyles.event}><View style={detailStyles.eventRail}><View style={[detailStyles.eventDot, { backgroundColor: colors.cream }]}><Ionicons name="checkmark" size={16} color={colors.ink} /></View>{index < data.logs.length - 1 ? <View style={detailStyles.eventLine} /> : null}</View><View style={detailStyles.eventCopy}><Text style={styles.label}>{STATUS_LABELS[log.status]}</Text><Notice message={new Date(log.created_at).toLocaleString()} /><Notice message={log.note} /></View></View>) : <Notice message="Status updates will appear here." />}</Card>
      <Notice message={actionError} error />
      {isValidTransition(d.status, "cancelled") ? <Action label="Cancel delivery" secondary busy={busy} onPress={() => Alert.alert("Cancel this delivery?", "Cancellation will be checked by the server. Any payment refund is handled according to the delivery policy.", [{ text: "Keep delivery", style: "cancel" }, { text: "Cancel delivery", style: "destructive", onPress: () => void cancel() }])} /> : null}
    </> : null}
  </Page>;
}
