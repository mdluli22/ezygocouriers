import * as Crypto from "expo-crypto";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts } from "../../../lib/theme";
import { BookingProgress, BookingTransition, BookingCardHeading, useBookingMotion } from "../../../components/customer/BookingProgress";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { createDeliveryRequestSchema, type AddressInput, type CreateDeliveryRequest } from "@ezygo/contracts";
import { useAuth } from "../../../lib/auth/provider";
import { customerApi } from "../../../lib/customer-api";
import { AddressField } from "../../../components/customer/AddressField";
import { Page, Card, Field, Notice, Action, styles, errorMessage } from "../../../components/customer/UI";
export default function NewDelivery() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const scroll = useRef<ScrollView>(null);
  const animate = useBookingMotion();
  function goToStep(next: number) {
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: animate });
  }
  const [pickup, setPickup] = useState<AddressInput>();
  const [dropoff, setDropoff] = useState<AddressInput>();
  const [form, setForm] = useState({ pickup_contact_name: user?.full_name ?? "", pickup_contact_phone: user?.phone ?? "", recipient_name: "", recipient_phone: "", recipient_email: "", parcel_description: "", special_instructions: "", package_type: "small" as "small" | "medium" | "large", package_category: "", fragile: false, require_pin: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const bookingKey = useRef<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  function input() { return { ...form, pickup_address: pickup ? { ...pickup, meeting_option: "meet_at_curb" } : undefined, dropoff_address: dropoff, payment_method: "yoco" }; }
  function validate(current: number): CreateDeliveryRequest | undefined {
    const result = createDeliveryRequestSchema.safeParse(input());
    const relevant = result.success ? [] : result.error.issues.filter(i => current === 3 || (current === 1 ? ["pickup_address", "dropoff_address", "pickup_contact_name", "pickup_contact_phone", "recipient_name", "recipient_phone"].includes(String(i.path[0])) : !["pickup_address", "dropoff_address", "pickup_contact_name", "pickup_contact_phone", "recipient_name", "recipient_phone"].includes(String(i.path[0]))));
    setErrors(Object.fromEntries(relevant.map(i => [String(i.path[0]), i.message])));
    if (!relevant.length && current < 3) goToStep(current + 1);
    return result.success ? result.data : undefined;
  }
  async function submit() {
    if (submitting.current || uncertain) return;
    const data = validate(3); if (!data) { setMessage("Please review the highlighted fields in the previous steps."); return; }
    submitting.current = true; setBusy(true); setMessage("");
    try { bookingKey.current ??= Crypto.randomUUID(); const delivery = await customerApi.create(data, bookingKey.current); router.replace({ pathname: "/payment", params: { id: delivery.id } }); }
    catch (e) { setMessage(`${errorMessage(e)} Check your dashboard before booking again; the request may have reached the server.`); setUncertain(true); }
    finally { submitting.current = false; setBusy(false); }
  }
  function textField(key: keyof typeof form, label: string, keyboardType?: "phone-pad" | "email-address") {
    return <Field label={label} value={String(form[key])} error={errors[key]} multiline={key === "parcel_description" || key === "special_instructions"} keyboardType={keyboardType} onChangeText={text => setForm(f => ({ ...f, [key]: text }))} />;
  }
  return <Page scrollRef={scroll}>
    <BookingProgress step={step} animate={animate} />
    <BookingTransition step={step} animate={animate}>
    <View style={booking.serviceNote}><Ionicons name="location-outline" size={18} color={colors.primary} /><Text style={booking.serviceText}>Deliveries within Cape Town. Select both addresses from search results.</Text></View>
    {step === 1 ? <><Card><BookingCardHeading title="Collection" icon="navigate-outline" /><AddressField label="Pickup address" value={pickup} onChange={setPickup} /><Notice message={errors.pickup_address} error />{pickup ? <Field label="Pickup building, unit or access notes" value={pickup.notes ?? ""} onChangeText={notes => setPickup({ ...pickup, notes })} /> : null}{textField("pickup_contact_name", "Pickup contact")}{textField("pickup_contact_phone", "Pickup phone", "phone-pad")}</Card><Card><BookingCardHeading title="Destination" icon="location-outline" amber /><AddressField label="Delivery address" value={dropoff} onChange={setDropoff} /><Notice message={errors.dropoff_address} error />{dropoff ? <Field label="Delivery building, unit or access notes" value={dropoff.notes ?? ""} onChangeText={notes => setDropoff({ ...dropoff, notes })} /> : null}{dropoff ? <><Text style={styles.label}>Delivery handover</Text>{(["meet_at_curb", "meet_at_door", "leave_at_door"] as const).map(option => <Action key={option} label={`${dropoff.meeting_option === option ? "Selected: " : ""}${option.replaceAll("_", " ")}`} secondary={dropoff.meeting_option !== option} onPress={() => setDropoff({ ...dropoff, meeting_option: option })} />)}</> : null}{textField("recipient_name", "Recipient name")}{textField("recipient_phone", "Recipient phone", "phone-pad")}</Card></> : null}
    {step === 2 ? <Card><BookingCardHeading title="Your parcel" icon="cube-outline" amber />{textField("parcel_description", "What are you sending?")}{textField("package_category", "Parcel category (optional)")}
      <Text style={styles.label}>Parcel size</Text><View style={booking.sizes}>{(["small", "medium", "large"] as const).map((size, index) => <Pressable key={size} accessibilityRole="radio" accessibilityState={{ checked: form.package_type === size }} accessibilityLabel={`${size} parcel`} onPress={() => setForm({ ...form, package_type: size })} style={({ pressed }) => [booking.size, form.package_type === size && booking.selectedSize, pressed && booking.pressed]}><Ionicons name="cube-outline" size={22 + index * 5} color={colors.primary} /><Text style={booking.sizeLabel}>{size}</Text><Ionicons name={form.package_type === size ? "checkmark-circle" : "ellipse-outline"} size={17} color={form.package_type === size ? colors.success : colors.muted} /></Pressable>)}</View>
      {(["fragile", "require_pin"] as const).map(key => <View key={key} style={booking.option}><Text style={styles.label}>{key === "fragile" ? "Fragile parcel" : "Require delivery PIN"}</Text><Switch trackColor={{ false: "#d5e4da", true: colors.primary }} thumbColor={colors.surface} accessibilityLabel={key === "fragile" ? "Fragile parcel" : "Require delivery PIN"} value={form[key]} onValueChange={value => setForm({ ...form, [key]: value })} /></View>)}
      {textField("recipient_email", "Recipient email (required for PIN)", "email-address")}{textField("special_instructions", "Special instructions (optional)")}
    </Card> : null}
    {step === 3 ? <>
      <Card><BookingCardHeading title="Your route" icon="map-outline" />
        <Text style={booking.reviewLabel}>COLLECTION</Text><Text style={booking.reviewValue}>{pickup?.formatted_address}</Text><Notice message={`${form.pickup_contact_name} · ${form.pickup_contact_phone}`} /><Notice message={pickup?.notes} />
        <View style={booking.divider} />
        <Text style={booking.reviewLabel}>DESTINATION</Text><Text style={booking.reviewValue}>{dropoff?.formatted_address}</Text><Notice message={`${form.recipient_name} · ${form.recipient_phone}`} /><Notice message={dropoff?.notes} /><Notice message={dropoff?.meeting_option?.replaceAll("_", " ")} />
        <Action label="Edit route & contacts" secondary disabled={busy || uncertain} onPress={() => goToStep(1)} />
      </Card>
      <Card><BookingCardHeading title="Your parcel" icon="cube-outline" amber />
        <Text style={booking.reviewValue}>{form.parcel_description}</Text><Notice message={`${form.package_type[0].toUpperCase()}${form.package_type.slice(1)} parcel${form.package_category ? ` · ${form.package_category}` : ""}${form.fragile ? " · Fragile" : ""}`} />
        <Notice message={form.require_pin ? `PIN handover · sent to ${form.recipient_email}` : "Standard handover · no PIN required"} />
        {!form.require_pin && form.recipient_email ? <Notice message={`Recipient email: ${form.recipient_email}`} /> : null}
        {form.special_instructions ? <><Text style={booking.reviewLabel}>SPECIAL INSTRUCTIONS</Text><Notice message={form.special_instructions} /></> : null}
        <Action label="Edit parcel details" secondary disabled={busy || uncertain} onPress={() => goToStep(2)} />
      </Card>
      <View style={booking.serviceNote}><Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} /><Text style={booking.serviceText}>Next, we’ll create your booking and show your quote. Review the price before opening secure Yoco checkout. You won’t be charged by this button.</Text></View>
    </> : null}
    <Notice message={message} error />
    {step > 1 ? <Action label="Back" secondary disabled={busy || uncertain} onPress={() => { setMessage(""); goToStep(step - 1); }} /> : null}
    {uncertain ? <Action label="Check dashboard" onPress={() => router.replace("/dashboard")} /> : <Action label={step === 3 ? "Get quote & continue to payment" : "Continue"} busy={busy} onPress={() => step === 3 ? void submit() : validate(step)} />}
    </BookingTransition>
  </Page>;
}

const booking = StyleSheet.create({
  reviewLabel: { fontSize: 10, fontFamily: fonts.bold, letterSpacing: 1.2, color: colors.primary },
  reviewValue: { fontSize: 16, lineHeight: 24, fontFamily: fonts.semibold, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border },
  serviceNote: { flexDirection: "row", alignItems: "center", gap: 9, padding: 13, backgroundColor: colors.soft, borderRadius: 13 },
  serviceText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.muted },
  sizes: { gap: 10 },
  size: { flexDirection: "row", minHeight: 66, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "space-between", gap: 9, backgroundColor: colors.surface },
  selectedSize: { backgroundColor: colors.soft, borderColor: colors.primary, borderWidth: 2 },
  sizeLabel: { flex: 1, fontSize: 14, fontFamily: fonts.bold, textTransform: "capitalize", color: colors.ink },
  pressed: { opacity: .8, transform: [{ scale: .97 }] },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: colors.soft, padding: 12, borderRadius: 10 },
});
