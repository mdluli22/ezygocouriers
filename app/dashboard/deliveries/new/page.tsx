"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddressFields {
  street_address: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  notes: string;
}

interface FormState {
  pickup_address: AddressFields;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  dropoff_address: AddressFields;
  recipient_name: string;
  recipient_phone: string;
  parcel_description: string;
  special_instructions: string;
}

const emptyAddress = (): AddressFields => ({
  street_address: "",
  suburb: "",
  city: "",
  province: "",
  postal_code: "",
  notes: "",
});

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {step}
      </div>
      <div>
        <h2 className="font-bold text-base" style={{ color: "var(--color-primary)" }}>{title}</h2>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{subtitle}</p>
      </div>
    </div>
  );
}

function AddressSection({
  prefix,
  values,
  onChange,
  errors,
}: {
  prefix: "pickup_address" | "dropoff_address";
  values: AddressFields;
  onChange: (field: string, value: string) => void;
  errors: Record<string, string>;
}) {
  function field(name: keyof AddressFields) {
    const key = `${prefix}.${name}`;
    return (
      <div>
        <input
          value={values[name]}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={
            name === "street_address" ? "123 Main Street" :
            name === "suburb" ? "Suburb (optional)" :
            name === "city" ? "City" :
            name === "postal_code" ? "Postal code (optional)" :
            name === "notes" ? "Delivery notes (optional)" : ""
          }
          className={`input ${errors[key] ? "input-error" : ""}`}
        />
        {errors[key] && <p className="error-text">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {field("street_address")}
      <div className="grid grid-cols-2 gap-3">
        {field("suburb")}
        {field("city")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <select
            value={values.province}
            onChange={(e) => onChange("province", e.target.value)}
            className="input"
            style={{ color: values.province ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
          >
            <option value="">Province (optional)</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {field("postal_code")}
      </div>
      {field("notes")}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewDeliveryPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    pickup_address: emptyAddress(),
    pickup_contact_name: "",
    pickup_contact_phone: "",
    dropoff_address: emptyAddress(),
    recipient_name: "",
    recipient_phone: "",
    parcel_description: "",
    special_instructions: "",
  });

  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // Quote preview state
  const [quote, setQuote] = useState<{ id: number; amount: number; currency: string; trackingNumber: string; deliveryId: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  function setAddressField(
    prefix: "pickup_address" | "dropoff_address",
    field: string,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [prefix]: { ...prev[prefix], [field]: value },
    }));
    const key = `${prefix}.${field}`;
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function setTopField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setServerError("");
    setErrors({});

    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.message || "Failed to create delivery.");
        return;
      }

      // Show quote preview
      setQuote({
        id:             data.data.quote.id,
        amount:         data.data.quote.amount,
        currency:       data.data.quote.currency,
        trackingNumber: data.data.trackingNumber,
        deliveryId:     data.data.id,
      });
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!quote) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/deliveries/${quote.deliveryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setServerError(d.message || "Failed to confirm delivery.");
        return;
      }
      router.push(`/dashboard/tracking/${quote.deliveryId}?confirmed=1`);
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  // ── Quote confirmation screen ────────────────────────────────────────────
  if (quote) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
            Your quote is ready
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Review and confirm your delivery below.
          </p>
        </div>

        <div className="card-raised space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Tracking number
            </span>
            <span className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>
              {quote.trackingNumber}
            </span>
          </div>
          <hr style={{ borderColor: "var(--color-border)" }} />
          <div className="flex items-center justify-between">
            <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Delivery fee
            </span>
            <span
              className="text-3xl font-black"
              style={{ color: "var(--color-accent)" }}
            >
              {quote.currency} {quote.amount.toFixed(2)}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Flat rate · No hidden fees · Paid securely via PayFast
          </p>
        </div>

        {serverError && (
          <div className="p-4 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgb(239 68 68 / 0.08)", color: "var(--color-error)" }}>
            {serverError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setQuote(null)}
            className="btn-outline flex-1"
          >
            ← Edit delivery
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="btn-accent flex-1 py-3"
          >
            {confirming ? "Confirming…" : "Confirm & proceed to payment →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
          New Delivery
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Fill in the details below. Flat rate of{" "}
          <span className="font-bold" style={{ color: "var(--color-accent)" }}>R99</span> for every delivery.
        </p>
      </div>

      {serverError && (
        <div className="p-4 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgb(239 68 68 / 0.08)", color: "var(--color-error)" }}>
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Section 1: Pickup */}
        <div className="card">
          <SectionHeader step={1} title="Pickup details" subtitle="Where should the driver collect the parcel?" />
          <AddressSection
            prefix="pickup_address"
            values={form.pickup_address}
            onChange={(f, v) => setAddressField("pickup_address", f, v)}
            errors={errors}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">Contact name</label>
              <input
                value={form.pickup_contact_name}
                onChange={(e) => setTopField("pickup_contact_name", e.target.value)}
                placeholder="Person at pickup"
                className={`input ${errors.pickup_contact_name ? "input-error" : ""}`}
              />
              {errors.pickup_contact_name && <p className="error-text">{errors.pickup_contact_name}</p>}
            </div>
            <div>
              <label className="label">Contact phone</label>
              <input
                value={form.pickup_contact_phone}
                onChange={(e) => setTopField("pickup_contact_phone", e.target.value)}
                placeholder="072 123 4567"
                className={`input ${errors.pickup_contact_phone ? "input-error" : ""}`}
              />
              {errors.pickup_contact_phone && <p className="error-text">{errors.pickup_contact_phone}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Drop-off */}
        <div className="card">
          <SectionHeader step={2} title="Drop-off details" subtitle="Where should the parcel be delivered?" />
          <AddressSection
            prefix="dropoff_address"
            values={form.dropoff_address}
            onChange={(f, v) => setAddressField("dropoff_address", f, v)}
            errors={errors}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">Recipient name</label>
              <input
                value={form.recipient_name}
                onChange={(e) => setTopField("recipient_name", e.target.value)}
                placeholder="Person receiving the parcel"
                className={`input ${errors.recipient_name ? "input-error" : ""}`}
              />
              {errors.recipient_name && <p className="error-text">{errors.recipient_name}</p>}
            </div>
            <div>
              <label className="label">Recipient phone</label>
              <input
                value={form.recipient_phone}
                onChange={(e) => setTopField("recipient_phone", e.target.value)}
                placeholder="072 123 4567"
                className={`input ${errors.recipient_phone ? "input-error" : ""}`}
              />
              {errors.recipient_phone && <p className="error-text">{errors.recipient_phone}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Parcel */}
        <div className="card">
          <SectionHeader step={3} title="Parcel details" subtitle="Tell us what you're sending." />
          <div className="space-y-3">
            <div>
              <label className="label">Parcel description</label>
              <textarea
                value={form.parcel_description}
                onChange={(e) => setTopField("parcel_description", e.target.value)}
                placeholder="e.g. Small box of clothing, fragile electronics, documents…"
                rows={3}
                className={`input resize-none ${errors.parcel_description ? "input-error" : ""}`}
              />
              {errors.parcel_description && <p className="error-text">{errors.parcel_description}</p>}
            </div>
            <div>
              <label className="label">
                Special instructions{" "}
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={form.special_instructions}
                onChange={(e) => setTopField("special_instructions", e.target.value)}
                placeholder="e.g. Handle with care, call before arriving, leave at gate…"
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>
        </div>

        {/* Price callout + Submit */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#ffffff",
          }}
        >
          <div>
            <p className="text-sm opacity-75">Flat delivery fee</p>
            <p className="text-2xl font-black" style={{ color: "var(--color-accent)" }}>
              R99.00
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-accent py-3 px-6"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Getting quote…
              </span>
            ) : (
              "Get quote →"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
