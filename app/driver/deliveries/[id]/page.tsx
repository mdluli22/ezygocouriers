"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  VALID_TRANSITIONS,
  DeliveryStatus,
} from "@/lib/constants/delivery-status";

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  parcel_description: string;
  special_instructions: string | null;
  pickup_street: string;
  pickup_suburb: string | null;
  pickup_city: string;
  pickup_province: string | null;
  pickup_postal_code: string | null;
  pickup_notes: string | null;
  dropoff_street: string;
  dropoff_suburb: string | null;
  dropoff_city: string;
  dropoff_province: string | null;
  dropoff_postal_code: string | null;
  dropoff_notes: string | null;
  customer_name: string;
  customer_phone: string | null;
}

function fmt(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(", ");
}

const ACTION_LABELS: Partial<Record<DeliveryStatus, { label: string; emoji: string }>> = {
  picked_up:  { label: "Confirm Pickup",    emoji: "📦" },
  in_transit: { label: "Start Delivery",    emoji: "🚚" },
  delivered:  { label: "Complete Delivery", emoji: "✅" },
  cancelled:  { label: "Cancel Trip",       emoji: "❌" },
};

export default function DriverDeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [delivery, setDelivery]     = useState<Delivery | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [updating, setUpdating]     = useState<DeliveryStatus | null>(null);
  const [note, setNote]             = useState("");
  const [updateError, setUpdateError] = useState("");
  const [showNote, setShowNote]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/driver/deliveries/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Not found");
      setDelivery(data.data.delivery);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  async function handleStatusUpdate(newStatus: DeliveryStatus) {
    if (!delivery) return;
    setUpdating(newStatus);
    setUpdateError("");
    try {
      const res = await fetch("/api/driver/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_id: delivery.id, status: newStatus, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setUpdateError(data.message || "Update failed."); return; }
      setNote("");
      setShowNote(false);
      await load();
    } catch {
      setUpdateError("Something went wrong. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
          style={{ backgroundColor: "#1A2F2F" }}>
          {/* <span className="text-2xl">🚚</span> */}
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>Loading trip…</p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <span className="text-5xl">❗️</span>
        <p className="font-bold" style={{ color: "var(--color-primary)" }}>Trip not found</p>
        <Link href="/driver" className="btn-primary inline-flex">Back to dashboard</Link>
      </div>
    );
  }

  const nextStatuses = VALID_TRANSITIONS[delivery.status] ?? [];
  const isTerminal   = nextStatuses.length === 0;
  const primaryNext  = nextStatuses.filter(s => s !== "cancelled")[0];
  const canCancel    = nextStatuses.includes("cancelled");

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">

      {/* Back */}
      <Link href="/driver"
        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
        style={{ color: "var(--color-text-secondary)" }}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All Trips
      </Link>

      {/* Status action card */}
      <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#1A2F2F" }}>
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <p className="text-white font-black text-xl leading-tight">{delivery.tracking_number}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {delivery.parcel_description}
              </p>
            </div>
            <span className={`badge shrink-0 ${STATUS_COLORS[delivery.status]}`}>
              {STATUS_LABELS[delivery.status]}
            </span>
          </div>
        </div>

        {/* Route summary */}
        <div className="mx-5 mb-4 rounded-2xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex gap-3 items-stretch">
            <div className="flex flex-col items-center pt-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 mt-0.5" style={{ borderColor: "#F59E0B" }} />
              <div className="flex-1 w-0.5 my-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)", minHeight: 18 }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
            </div>
            <div className="flex-1 space-y-2.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Pickup</p>
                <p className="text-sm font-semibold text-white leading-tight">
                  {fmt([delivery.pickup_street, delivery.pickup_suburb])}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {fmt([delivery.pickup_city, delivery.pickup_province])}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Drop-off</p>
                <p className="text-sm font-semibold text-white leading-tight">
                  {fmt([delivery.dropoff_street, delivery.dropoff_suburb])}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {fmt([delivery.dropoff_city, delivery.dropoff_province])}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!isTerminal && (
          <div className="px-5 pb-5 space-y-3">
            {updateError && (
              <p className="text-xs font-semibold text-center" style={{ color: "#FCA5A5" }}>{updateError}</p>
            )}

            {/* Optional note toggle */}
            <button onClick={() => setShowNote(v => !v)}
              className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={showNote ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
              </svg>
              {showNote ? "Hide note" : "Add a note (optional)"}
            </button>

            {showNote && (
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. Arrived at pickup, slight delay…"
                className="input text-sm w-full"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "white", borderColor: "rgba(255,255,255,0.15)" }} />
            )}

            {/* Primary action */}
            {primaryNext && (
              <button onClick={() => handleStatusUpdate(primaryNext)}
                disabled={updating !== null}
                className="w-full py-3.5 rounded-2xl font-black text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#F59E0B", color: "#111" }}>
                {updating === primaryNext ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg> Updating…</>
                ) : (
                  <>{ACTION_LABELS[primaryNext]?.emoji} {ACTION_LABELS[primaryNext]?.label ?? `Mark as ${STATUS_LABELS[primaryNext]}`}</>
                )}
              </button>
            )}

            {/* Cancel (destructive, secondary) */}
            {canCancel && (
              <button onClick={() => handleStatusUpdate("cancelled")}
                disabled={updating !== null}
                className="w-full py-2.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-60"
                style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#FCA5A5" }}>
                {updating === "cancelled" ? "Cancelling…" : "Cancel this trip"}
              </button>
            )}
          </div>
        )}

        {/* Terminal state */}
        {isTerminal && (
          <div className="px-5 pb-5">
            <div className="rounded-2xl p-4 text-center text-sm font-semibold"
              style={{
                backgroundColor: delivery.status === "delivered" ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
                color:           delivery.status === "delivered" ? "#34D399" : "rgba(255,255,255,0.5)",
              }}>
              {delivery.status === "delivered" ? "Delivery completed successfully!" : `This trip is ${STATUS_LABELS[delivery.status].toLowerCase()}.`}
            </div>
          </div>
        )}
      </div>

      {/* Pickup details */}
      <section className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          {/* <span className="text-base">📍</span> */}
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Pickup</h3>
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {fmt([delivery.pickup_street, delivery.pickup_suburb, delivery.pickup_city, delivery.pickup_province, delivery.pickup_postal_code])}
        </p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          {delivery.pickup_contact_name && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-text-muted)" }}>Contact</p>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{delivery.pickup_contact_name}</p>
            </div>
          )}
          {delivery.pickup_contact_phone && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-text-muted)" }}>Phone</p>
              <a href={`tel:${delivery.pickup_contact_phone}`} className="text-sm font-medium" style={{ color: "var(--color-info)" }}>
                {delivery.pickup_contact_phone}
              </a>
            </div>
          )}
        </div>
        {delivery.pickup_notes && (
          <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-secondary)" }}>
            {delivery.pickup_notes}
          </p>
        )}
      </section>

      {/* Drop-off details */}
      <section className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          {/* <span className="text-base">🏁</span> */}
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Drop-off</h3>
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {fmt([delivery.dropoff_street, delivery.dropoff_suburb, delivery.dropoff_city, delivery.dropoff_province, delivery.dropoff_postal_code])}
        </p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-text-muted)" }}>Recipient</p>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{delivery.recipient_name}</p>
          </div>
          {delivery.recipient_phone && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-text-muted)" }}>Phone</p>
              <a href={`tel:${delivery.recipient_phone}`} className="text-sm font-medium" style={{ color: "var(--color-info)" }}>
                {delivery.recipient_phone}
              </a>
            </div>
          )}
        </div>
        {delivery.dropoff_notes && (
          <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-secondary)" }}>
            {delivery.dropoff_notes}
          </p>
        )}
      </section>

      {/* Parcel */}
      <section className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          {/* <span className="text-base">📦</span> */}
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Parcel</h3>
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{delivery.parcel_description}</p>
        {delivery.special_instructions && (
          <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "var(--color-warning)" }}>
            {delivery.special_instructions}
          </p>
        )}
      </section>

      {/* Customer */}
      <section className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          {/* <span className="text-base">👤</span> */}
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Customer</h3>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{delivery.customer_name}</p>
          {delivery.customer_phone && (
            <a href={`tel:${delivery.customer_phone}`}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "var(--color-info)" }}>
                {delivery.customer_phone}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
