import { useRef, useState } from "react";
import { Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { createDeliveryRequestSchema, type AddressInput, type CreateDeliveryRequest } from "@ezygo/contracts";
import { useAuth } from "../../../lib/auth/provider";
import { customerApi } from "../../../lib/customer-api";
import { AddressField } from "../../../components/customer/AddressField";
import { Page, Card, Title, Field, Notice, Action, styles, errorMessage } from "../../../components/customer/UI";
export default function NewDelivery() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
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
    if (!relevant.length && current < 3) setStep(current + 1);
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
  return <Page><Title>Step {step} of 3 · {step === 1 ? "Route & contacts" : step === 2 ? "Your parcel" : "Review & pay"}</Title>
    <Notice message="Deliveries within Cape Town. Select both addresses from search results." />
    {step === 1 ? <><Card><AddressField label="Pickup address" value={pickup} onChange={setPickup} /><Notice message={errors.pickup_address} error />{pickup ? <Field label="Pickup building, unit or access notes" value={pickup.notes ?? ""} onChangeText={notes => setPickup({ ...pickup, notes })} /> : null}{textField("pickup_contact_name", "Pickup contact")}{textField("pickup_contact_phone", "Pickup phone", "phone-pad")}</Card><Card><AddressField label="Delivery address" value={dropoff} onChange={setDropoff} /><Notice message={errors.dropoff_address} error />{dropoff ? <Field label="Delivery building, unit or access notes" value={dropoff.notes ?? ""} onChangeText={notes => setDropoff({ ...dropoff, notes })} /> : null}{dropoff ? <><Text style={styles.label}>Delivery handover</Text>{(["meet_at_curb", "meet_at_door", "leave_at_door"] as const).map(option => <Action key={option} label={`${dropoff.meeting_option === option ? "Selected: " : ""}${option.replaceAll("_", " ")}`} secondary={dropoff.meeting_option !== option} onPress={() => setDropoff({ ...dropoff, meeting_option: option })} />)}</> : null}{textField("recipient_name", "Recipient name")}{textField("recipient_phone", "Recipient phone", "phone-pad")}</Card></> : null}
    {step === 2 ? <Card>{textField("parcel_description", "What are you sending?")}{textField("package_category", "Parcel category (optional)")}
      <Text style={styles.label}>Parcel size</Text>{(["small", "medium", "large"] as const).map(size => <Action key={size} label={`${form.package_type === size ? "Selected: " : ""}${size}`} secondary={form.package_type !== size} onPress={() => setForm({ ...form, package_type: size })} />)}
      {(["fragile", "require_pin"] as const).map(key => <View key={key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={styles.label}>{key === "fragile" ? "Fragile parcel" : "Require delivery PIN"}</Text><Switch accessibilityLabel={key === "fragile" ? "Fragile parcel" : "Require delivery PIN"} value={form[key]} onValueChange={value => setForm({ ...form, [key]: value })} /></View>)}
      {textField("recipient_email", "Recipient email (required for PIN)", "email-address")}{textField("special_instructions", "Special instructions (optional)")}
    </Card> : null}
    {step === 3 ? <Card><Notice message={`From: ${pickup?.formatted_address}\n${form.pickup_contact_name} · ${form.pickup_contact_phone}`} /><Notice message={`To: ${dropoff?.formatted_address}\n${form.recipient_name} · ${form.recipient_phone}`} /><Notice message={`${form.package_type} parcel · ${form.parcel_description}${form.fragile ? " · Fragile" : ""}${form.require_pin ? " · PIN required" : ""}`} /><Notice message="Continue to create your delivery and receive the server-calculated quote. You can review the price before opening Paystack." /></Card> : null}
    <Notice message={message} error />
    {step > 1 ? <Action label="Back" secondary disabled={busy} onPress={() => { setMessage(""); setStep(step - 1); }} /> : null}
    {uncertain ? <Action label="Check dashboard" onPress={() => router.replace("/dashboard")} /> : <Action label={step === 3 ? "Get quote & continue to payment" : "Continue"} busy={busy} onPress={() => step === 3 ? void submit() : validate(step)} />}
  </Page>;
}
