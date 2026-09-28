import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../../lib/theme";
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
  const [uncertain, setUncertain] = useState(false);
  function input() { return { ...form, pickup_address: pickup ? { ...pickup, meeting_option: "meet_at_curb" } : undefined, dropoff_address: dropoff, payment_method: "paystack" }; }
  function validate(current: number): CreateDeliveryRequest | undefined {
    const result = createDeliveryRequestSchema.safeParse(input());
    const relevant = result.success ? [] : result.error.issues.filter(i => current === 3 || (current === 1 ? ["pickup_address", "dropoff_address", "pickup_contact_name", "pickup_contact_phone", "recipient_name", "recipient_phone"].includes(String(i.path[0])) : !["pickup_address", "dropoff_address", "pickup_contact_name", "pickup_contact_phone", "recipient_name", "recipient_phone"].includes(String(i.path[0]))));
    setErrors(Object.fromEntries(relevant.map(i => [String(i.path[0]), i.message])));
    if (!relevant.length && current < 3) goToStep(current + 1);
    return result.success ? result.data : undefined;
  }
  async function submit() {
    if (submitting.current) return;
    const data = validate(3); if (!data) { setMessage("Please review the highlighted fields in the previous steps."); return; }
    submitting.current = true; setBusy(true); setMessage("");
    try { const delivery = await customerApi.create(data); router.replace({ pathname: "/payment", params: { id: delivery.id } }); }
    catch (e) { setMessage(`${errorMessage(e)} Check your dashboard before booking again; the request may have reached the server.`); setUncertain(true); }
    finally { submitting.current = false; setBusy(false); }
  }
  function textField(key: keyof typeof form, label: string, keyboardType?: "phone-pad" | "email-address") {
    return <Field label={label} value={String(form[key])} error={errors[key]} keyboardType={keyboardType} onChangeText={text => setForm(f => ({ ...f, [key]: text }))} />;
  }
  return <Page scrollRef={scroll}>
    <BookingProgress step={step} animate={animate} />
    <BookingTransition step={step} animate={animate}>
    <View style={booking.serviceNote}><Ionicons name="location-outline" size={18} color={colors.primary} /><Text style={booking.serviceText}>Deliveries within Cape Town. Select both addresses from search results.</Text></View>
    {step === 1 ? <><Card><BookingCardHeading title="Collection" subtitle="Where your parcel’s journey begins" icon="navigate-outline" /><AddressField label="Pickup address" value={pickup} onChange={setPickup} /><Notice message={errors.pickup_address} error />{pickup ? <Field label="Pickup building, unit or access notes" value={pickup.notes ?? ""} onChangeText={notes => setPickup({ ...pickup, notes })} /> : null}{textField("pickup_contact_name", "Pickup contact")}{textField("pickup_contact_phone", "Pickup phone", "phone-pad")}</Card><Card><BookingCardHeading title="Destination" subtitle="Who are we making a delivery to?" icon="location-outline" amber /><AddressField label="Delivery address" value={dropoff} onChange={setDropoff} /><Notice message={errors.dropoff_address} error />{dropoff ? <Field label="Delivery building, unit or access notes" value={dropoff.notes ?? ""} onChangeText={notes => setDropoff({ ...dropoff, notes })} /> : null}{dropoff ? <><Text style={styles.label}>Delivery handover</Text>{(["meet_at_curb", "meet_at_door", "leave_at_door"] as const).map(option => <Action key={option} label={`${dropoff.meeting_option === option ? "Selected: " : ""}${option.replaceAll("_", " ")}`} secondary={dropoff.meeting_option !== option} onPress={() => setDropoff({ ...dropoff, meeting_option: option })} />)}</> : null}{textField("recipient_name", "Recipient name")}{textField("recipient_phone", "Recipient phone", "phone-pad")}</Card></> : null}
    {step === 2 ? <Card><BookingCardHeading title="Your parcel" subtitle="Good things come in all sizes" icon="cube-outline" amber />{textField("parcel_description", "What are you sending?")}{textField("package_category", "Parcel category (optional)")}
      <Text style={styles.label}>Parcel size</Text><View style={booking.sizes}>{(["small", "medium", "large"] as const).map((size, index) => <Pressable key={size} accessibilityRole="radio" accessibilityState={{ checked: form.package_type === size }} accessibilityLabel={`${size} parcel`} onPress={() => setForm({ ...form, package_type: size })} style={({ pressed }) => [booking.size, form.package_type === size && booking.selectedSize, pressed && booking.pressed]}><Ionicons name="cube-outline" size={22 + index * 5} color={colors.primary} /><Text style={booking.sizeLabel}>{size}</Text><Ionicons name={form.package_type === size ? "checkmark-circle" : "ellipse-outline"} size={17} color={form.package_type === size ? colors.success : colors.muted} /></Pressable>)}</View>
      {(["fragile", "require_pin"] as const).map(key => <View key={key} style={booking.option}><Text style={styles.label}>{key === "fragile" ? "Fragile parcel" : "Require delivery PIN"}</Text><Switch trackColor={{ false: "#d5e4da", true: colors.primary }} thumbColor={colors.surface} accessibilityLabel={key === "fragile" ? "Fragile parcel" : "Require delivery PIN"} value={form[key]} onValueChange={value => setForm({ ...form, [key]: value })} /></View>)}
      {textField("recipient_email", "Recipient email (required for PIN)", "email-address")}{textField("special_instructions", "Special instructions (optional)")}
    </Card> : null}
    {step === 3 ? <Card><BookingCardHeading title="Ready to go?" subtitle="Check the details. We’ll take it from here." icon="checkmark-circle-outline" /><Notice message={`From: ${pickup?.formatted_address}\n${form.pickup_contact_name} · ${form.pickup_contact_phone}`} /><Notice message={`To: ${dropoff?.formatted_address}\n${form.recipient_name} · ${form.recipient_phone}`} /><Notice message={`${form.package_type} parcel · ${form.parcel_description}${form.fragile ? " · Fragile" : ""}${form.require_pin ? " · PIN required" : ""}`} /><Notice message="Continue to create your delivery and receive the server-calculated quote. You can review the price before opening Paystack." /></Card> : null}
    <Notice message={message} error />
    {step > 1 ? <Action label="Back" secondary disabled={busy} onPress={() => { setMessage(""); goToStep(step - 1); }} /> : null}
    {uncertain ? <Action label="Check dashboard" onPress={() => router.replace("/dashboard")} /> : <Action label={step === 3 ? "Get quote & continue to payment" : "Continue"} busy={busy} onPress={() => step === 3 ? void submit() : validate(step)} />}
    </BookingTransition>
  </Page>;
}

const booking = StyleSheet.create({
  serviceNote: { flexDirection: "row", alignItems: "center", gap: 9, padding: 13, backgroundColor: "#f4f8f5", borderRadius: 13 },
  serviceText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.muted },
  sizes: { flexDirection: "row", gap: 8 },
  size: { flex: 1, minHeight: 117, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "space-between", gap: 9, backgroundColor: colors.surface },
  selectedSize: { backgroundColor: "#fff4d9", borderColor: colors.accent, borderWidth: 2 },
  sizeLabel: { fontSize: 12, fontWeight: "700", textTransform: "capitalize", color: colors.ink },
  pressed: { opacity: .8, transform: [{ scale: .97 }] },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: "#f4f8f5", padding: 12, borderRadius: 14 },
});
