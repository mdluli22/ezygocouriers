import { LiveDeliveryMap } from "../../../components/customer/LiveDeliveryMap";
import { useCallback, useState } from "react";
import { Alert, Text } from "react-native";
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
    {d ? <><Title>{d.tracking_number}</Title><Card><Text style={styles.label}>{STATUS_LABELS[d.status]}</Text><Notice message={`${d.pickup_street} → ${d.dropoff_street}`} /><Notice message={`Recipient: ${d.recipient_name} · ${d.recipient_phone}`} /><Notice message={`${d.parcel_description} · ${d.package_type ?? "Parcel"}`} /><Notice message={d.quote_amount ? `${d.quote_currency} ${Number(d.quote_amount).toFixed(2)}` : "Quote pending"} /><Notice message={d.driver_name ? `Driver: ${d.driver_name}${d.driver_phone ? ` · ${d.driver_phone}` : ""}` : "A driver has not yet been assigned."} /></Card>
      {d.status === "confirmed" ? <Action label="Continue to payment" onPress={() => router.push({ pathname: "/payment", params: { id: d.id } })} /> : null}
      <LiveDeliveryMap id={d.id} status={d.status} /><Title>Status timeline</Title>{data.logs.length ? data.logs.map(log => <Card key={log.id}><Text style={styles.label}>{STATUS_LABELS[log.status]}</Text><Notice message={new Date(log.created_at).toLocaleString()} /><Notice message={log.note} /></Card>) : <Notice message="Status updates will appear here." />}
      <Notice message={actionError} error />
      {isValidTransition(d.status, "cancelled") ? <Action label="Cancel delivery" secondary busy={busy} onPress={() => Alert.alert("Cancel this delivery?", "Cancellation will be checked by the server. Any payment refund is handled according to the delivery policy.", [{ text: "Keep delivery", style: "cancel" }, { text: "Cancel delivery", style: "destructive", onPress: () => void cancel() }])} /> : null}
    </> : null}
  </Page>;
}
