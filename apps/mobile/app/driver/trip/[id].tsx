import { useCallback, useRef, useState } from "react";
import { Alert, Linking, Platform, Text } from "react-native";
import * as Crypto from "expo-crypto";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { STATUS_LABELS, VALID_TRANSITIONS, driverStatusUpdateSchema, type DeliveryStatus } from "@ezygo/contracts";
import { driverApi, activeTrip } from "../../../lib/driver/api";
import { driverOutbox } from "../../../lib/driver/queue";
import { contactUrl, mapsUrl } from "../../../lib/driver/links";
import { stopTracking } from "../../../lib/driver/location";
import { useResource } from "../../../lib/use-resource";
import { deliveryId } from "../../../lib/customer-api";
import { useAuth } from "../../../lib/auth/provider";
import { QueuePanel } from "../../../components/driver/QueuePanel";
import { TrackingPanel } from "../../../components/driver/TrackingPanel";
import { Page, Title, Card, Field, Notice, Action, Loading, Failure, styles, errorMessage } from "../../../components/customer/UI";
export default function Trip() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = deliveryId(rawId);
  const { user } = useAuth();
  const fetcher = useCallback(() => id ? driverApi.detail(id) : Promise.reject(new Error("Invalid trip link.")), [id]);
  const { data, loading, error, refresh } = useResource(fetcher);
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  useFocusEffect(useCallback(() => { const timer = setInterval(() => void refresh(), 15000); return () => { clearInterval(timer); setPin(""); }; }, [refresh]));
  async function open(makeUrl: () => string) { try { await Linking.openURL(makeUrl()); } catch (e) { setMessage(errorMessage(e)); } }
  async function update(status: DeliveryStatus) {
    if (!id || !user || !data || sending.current) return;
    if (status === "delivered" && data.delivery.require_pin && !/^\d{6}$/.test(pin)) { setMessage("Enter the recipient’s six-digit PIN."); return; }
    const parsed = driverStatusUpdateSchema.safeParse({ delivery_id: id, status, note, ...(status === "delivered" && data.delivery.require_pin ? { pin } : {}), operation_id: Crypto.randomUUID() });
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
    sending.current = true; setBusy(true); setMessage("");
    try {
      await driverOutbox.enqueue(user.id, parsed.data);
      setPin(""); setNote(""); setMessage("Change saved securely. Waiting for server confirmation.");
      if (["delivered", "failed", "cancelled"].includes(status)) await stopTracking();
      await driverOutbox.flush(user.id); await refresh();
    } catch (e) { setMessage(errorMessage(e)); }
    finally { sending.current = false; setBusy(false); }
  }
  const d = data?.delivery;
  const next = d ? VALID_TRANSITIONS[d.status].filter(s => ["picked_up", "in_transit", "delivered", "failed"].includes(s)) : [];
  return <Page refresh={() => void refresh()} refreshing={loading && !!data}>
    {loading && !data ? <Loading /> : null}{error ? <Failure error={error} retry={() => void refresh()} /> : null}
    {d ? <><Title>{d.tracking_number}</Title><Notice message={`Server status: ${STATUS_LABELS[d.status]}`} />
      {user ? <QueuePanel owner={user.id} trip={d.id} /> : null}
      <Card><Text style={styles.label}>Pickup</Text><Notice message={[d.pickup_street, d.pickup_suburb, d.pickup_city].filter(Boolean).join(", ")} /><Notice message={d.pickup_notes} /><Notice message={d.pickup_contact_name} /><Action secondary label={`Call pickup · ${d.pickup_contact_phone}`} onPress={() => void open(() => contactUrl(d.pickup_contact_phone))} /><Action secondary label="Navigate to pickup" onPress={() => void open(() => mapsUrl([d.pickup_street, d.pickup_suburb, d.pickup_city].filter(Boolean).join(", "), Platform.OS))} /></Card>
      <Card><Text style={styles.label}>Destination</Text><Notice message={[d.dropoff_street, d.dropoff_suburb, d.dropoff_city].filter(Boolean).join(", ")} /><Notice message={d.dropoff_notes} /><Notice message={d.recipient_name} /><Action secondary label={`Call recipient · ${d.recipient_phone}`} onPress={() => void open(() => contactUrl(d.recipient_phone))} /><Action secondary label="Text recipient" onPress={() => void open(() => contactUrl(d.recipient_phone, true))} /><Action secondary label="Navigate to destination" onPress={() => void open(() => mapsUrl([d.dropoff_street, d.dropoff_suburb, d.dropoff_city].filter(Boolean).join(", "), Platform.OS))} /></Card>
      <Card><Text style={styles.label}>Parcel</Text><Notice message={`${d.parcel_description}\n${d.package_type ?? "Parcel"}${d.fragile ? " · FRAGILE" : ""}${d.require_pin ? " · PIN required at handover" : ""}`} /><Notice message={d.special_instructions} />{d.customer_phone ? <Action secondary label="Call customer" onPress={() => void open(() => contactUrl(d.customer_phone!))} /> : null}</Card>
      {activeTrip(d.status) && user ? <TrackingPanel owner={user.id} trip={d.id} /> : null}
      {next.length ? <Card><Field label="Trip or handover note" value={note} onChangeText={setNote} maxLength={500} multiline />
        {d.status === "in_transit" && d.require_pin ? <Field label="Recipient’s six-digit handover PIN" value={pin} onChangeText={text => setPin(text.replace(/\D/g, "").slice(0, 6))} maxLength={6} keyboardType="number-pad" secureTextEntry /> : null}
        <Notice message="Changes are queued securely when offline. Status remains unconfirmed until the server accepts it. Keep the app open to sync." />
        {next.map(status => <Action key={status} label={`Mark ${STATUS_LABELS[status].toLowerCase()}`} busy={busy} secondary={status === "failed"} onPress={() => Alert.alert(`Mark trip ${STATUS_LABELS[status].toLowerCase()}?`, "Only record a status that has actually occurred. The server will verify the assignment, transition and any required PIN.", [{ text: "Go back", style: "cancel" }, { text: "Confirm", onPress: () => void update(status) }])} />)}
      </Card> : null}<Notice message={message} />
      <Title>Trip timeline</Title>{data.logs.map(log => <Card key={log.id}><Text style={styles.label}>{STATUS_LABELS[log.status]}</Text><Notice message={new Date(log.created_at).toLocaleString()} /><Notice message={log.note} /></Card>)}
    </> : null}
  </Page>;
}
