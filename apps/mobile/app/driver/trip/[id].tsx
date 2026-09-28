import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../../lib/theme";
import { TripSection, TripAction, TripTag, tripStyles as s } from "../../../components/driver/TripUI";
import { useCallback, useRef, useState } from "react";
import { Alert, Linking, Platform, Text, View } from "react-native";
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
import { Page, Field, Notice, Loading, Failure, errorMessage } from "../../../components/customer/UI";
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
  async function open(makeUrl: () => string) {
    if (!id || !data || !activeTrip(data.delivery.status)) return;
    try {
      // Recheck before launching another app: a trip may have ended since refresh.
      const latest = await driverApi.detail(id);
      if (!activeTrip(latest.delivery.status)) {
        setMessage("This trip has ended. Contact and navigation actions are no longer available.");
        await refresh();
        return;
      }
      await Linking.openURL(makeUrl());
    } catch (e) { setMessage(errorMessage(e)); }
  }
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
  const canContact = !!d && activeTrip(d.status);
  const next = d ? VALID_TRANSITIONS[d.status].filter(s => ["picked_up", "in_transit", "delivered", "failed"].includes(s)) : [];
  const pickupAddress = d ? [d.pickup_street, d.pickup_suburb, d.pickup_city].filter(Boolean).join(", ") : "";
  const destinationAddress = d ? [d.dropoff_street, d.dropoff_suburb, d.dropoff_city].filter(Boolean).join(", ") : "";
  const actionIcons: Partial<Record<DeliveryStatus, keyof typeof Ionicons.glyphMap>> = { picked_up: "cube-outline", in_transit: "car-outline", delivered: "checkmark-circle-outline", failed: "alert-circle-outline" };
  return <Page refresh={() => void refresh()} refreshing={loading && !!data}>
    {loading && !data ? <Loading /> : null}{error ? <Failure error={error} retry={() => void refresh()} /> : null}
    {d ? <>
      <View style={s.hero}>
        <View style={s.heroTop}><Text style={s.eyebrow}>EZYGO DELIVERY</Text><Text style={s.status}>{STATUS_LABELS[d.status]}</Text></View>
        <Text accessibilityRole="header" style={s.tracking}>{d.tracking_number}</Text>
        <View style={s.heroRoute}><Ionicons name="navigate-outline" size={18} color="#b7d6c5" /><Text style={s.heroCity}>{d.pickup_city}</Text><Ionicons name="arrow-forward" size={16} color="#b7d6c5" /><Text style={s.heroCity}>{d.dropoff_city}</Text></View>
      </View>
      {activeTrip(d.status) ? <View style={s.nextMove}><Ionicons name={d.status === "assigned" ? "cube-outline" : "car-outline"} size={27} color={colors.primary} /><View style={s.flex}><Text style={s.nextTitle}>{d.status === "assigned" ? "Next stop: collection" : "Next stop: your recipient"}</Text><Text style={s.muted}>{d.status === "assigned" ? "Head to the pickup address and collect the parcel." : "Keep the recipient’s parcel safe on its way to their door."}</Text></View></View> : null}
      {user ? <QueuePanel owner={user.id} trip={d.id} /> : null}
      <Notice message={message} />
      {!canContact ? <Notice message="Past delivery · contact and navigation actions are unavailable." /> : null}

      <TripSection title="Pickup" subtitle="Where the journey begins" icon="cube-outline">
        <Text style={s.address}>{d.pickup_street}</Text><Text style={s.muted}>{[d.pickup_suburb, d.pickup_city].filter(Boolean).join(", ")}</Text>
        {d.pickup_notes ? <View style={s.notes}><Ionicons name="information-circle-outline" size={19} color={colors.primary} /><Text style={s.noteText}>{d.pickup_notes}</Text></View> : null}
        <View style={s.contact}><Ionicons name="person-circle-outline" size={31} color={colors.primary} /><View style={s.flex}><Text style={s.contactName}>{d.pickup_contact_name}</Text>{canContact ? <Text style={s.muted}>{d.pickup_contact_phone}</Text> : null}</View></View>
        {canContact ? <TripAction label="Navigate to pickup" icon="navigate-outline" onPress={() => void open(() => mapsUrl(pickupAddress, Platform.OS))} /> : null}
        {canContact ? <TripAction label="Call pickup contact" icon="call-outline" secondary onPress={() => void open(() => contactUrl(d.pickup_contact_phone))} /> : null}
      </TripSection>

      <TripSection title="Destination" subtitle="The final stop" icon="location-outline">
        <Text style={s.address}>{d.dropoff_street}</Text><Text style={s.muted}>{[d.dropoff_suburb, d.dropoff_city].filter(Boolean).join(", ")}</Text>
        {d.dropoff_notes ? <View style={s.notes}><Ionicons name="information-circle-outline" size={19} color={colors.primary} /><Text style={s.noteText}>{d.dropoff_notes}</Text></View> : null}
        <View style={s.contact}><Ionicons name="person-circle-outline" size={31} color={colors.primary} /><View style={s.flex}><Text style={s.contactName}>{d.recipient_name}</Text>{canContact ? <Text style={s.muted}>{d.recipient_phone}</Text> : null}</View></View>
        {canContact ? <TripAction label="Navigate to destination" icon="navigate-outline" onPress={() => void open(() => mapsUrl(destinationAddress, Platform.OS))} /> : null}
        {canContact ? <TripAction label="Call recipient" icon="call-outline" secondary onPress={() => void open(() => contactUrl(d.recipient_phone))} /> : null}
        {canContact ? <TripAction label="Message recipient" icon="chatbubble-ellipses-outline" secondary onPress={() => void open(() => contactUrl(d.recipient_phone, true))} /> : null}
      </TripSection>

      <TripSection title="Parcel details" subtitle="Handle with the right care" icon="bag-handle-outline">
        <Text style={s.address}>{d.parcel_description}</Text>
        <View style={s.tags}><TripTag label={d.package_type ?? "Parcel"} icon="cube-outline" />{d.fragile ? <TripTag label="Fragile" icon="wine-outline" /> : null}{d.require_pin ? <TripTag label="PIN at handover" icon="shield-checkmark-outline" /> : null}</View>
        {d.special_instructions ? <View style={s.notes}><Ionicons name="document-text-outline" size={20} color={colors.primary} /><Text style={s.noteText}>{d.special_instructions}</Text></View> : null}
        {canContact && d.customer_phone ? <TripAction label="Call customer" icon="call-outline" secondary onPress={() => void open(() => contactUrl(d.customer_phone!))} /> : null}
      </TripSection>

      {next.length ? <TripSection title="Update your trip" subtitle="Record each milestone as it happens" icon="checkmark-done-outline">
        <Field label="Trip or handover note" value={note} onChangeText={setNote} maxLength={500} multiline />
        {d.status === "in_transit" && d.require_pin ? <Field label="Recipient’s six-digit handover PIN" value={pin} onChangeText={text => setPin(text.replace(/\D/g, "").slice(0, 6))} maxLength={6} keyboardType="number-pad" secureTextEntry /> : null}
        <View style={s.notes}><Ionicons name="cloud-upload-outline" size={21} color={colors.primary} /><Text style={s.noteText}>Changes are queued securely when offline. Status remains unconfirmed until the server accepts it. Keep the app open to sync.</Text></View>
        {next.map(status => <TripAction key={status} icon={actionIcons[status] ?? "checkmark-outline"} label={`Mark ${STATUS_LABELS[status].toLowerCase()}`} busy={busy} danger={status === "failed"} onPress={() => Alert.alert(`Mark trip ${STATUS_LABELS[status].toLowerCase()}?`, "Only record a status that has actually occurred. The server will verify the assignment, transition and any required PIN.", [{ text: "Go back", style: "cancel" }, { text: "Confirm", onPress: () => void update(status) }])} />)}
      </TripSection> : null}
      {activeTrip(d.status) && user ? <TrackingPanel owner={user.id} trip={d.id} /> : null}

      <TripSection title="Trip timeline" subtitle="Confirmed delivery updates" icon="time-outline">
        <View style={s.timeline}>{data.logs.map((log, index) => <View key={log.id} style={s.event}><View style={s.eventRail}><View style={s.eventDot}><Ionicons name={log.status === "failed" || log.status === "cancelled" ? "close-outline" : "checkmark-outline"} size={17} color={colors.primary} /></View>{index < data.logs.length - 1 ? <View style={s.eventLine} /> : null}</View><View style={s.eventCopy}><Text style={s.contactName}>{STATUS_LABELS[log.status]}</Text><Text style={s.muted}>{new Date(log.created_at).toLocaleString()}</Text>{log.note ? <Text style={s.muted}>{log.note}</Text> : null}</View></View>)}</View>
        {!data.logs.length ? <Text style={s.muted}>No confirmed updates yet.</Text> : null}
      </TripSection>
    </> : null}
  </Page>;
}
