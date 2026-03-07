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

function InfoBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{value}</p>
    </div>
  );
}

function formatAddress(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(", ");
}

export default function DriverDeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [updating, setUpdating] = useState<DeliveryStatus | null>(null);
  const [note, setNote]         = useState("");
  const [updateError, setUpdateError] = useState("");

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
        body: JSON.stringify({
          delivery_id: delivery.id,
          status: newStatus,
          note: note || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUpdateError(data.message || "Update failed.");
        return;
      }

      setNote("");
      await load(); // Refresh delivery data
    } catch {
      setUpdateError("Something went wrong. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <svg className="animate-spin w-8 h-8" style={{ color: "var(--color-primary)" }} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="font-bold" style={{ color: "var(--color-primary)" }}>Delivery not found</p>
        <Link href="/driver" className="btn-primary inline-flex">Back to dashboard</Link>
      </div>
    );
  }

  const nextStatuses = VALID_TRANSITIONS[delivery.status] ?? [];
  const isTerminal   = nextStatuses.length === 0;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/driver"
        className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All Deliveries
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
            {delivery.tracking_number}
          </h1>
        </div>
        <span className={`badge text-sm px-3 py-1.5 ${STATUS_COLORS[delivery.status]}`}>
          {STATUS_LABELS[delivery.status]}
        </span>
      </div>

      {/* Status update panel */}
      {!isTerminal && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <p className="text-white font-bold text-sm">Update Status</p>

          <div>
            <label className="block text-xs text-white opacity-60 mb-1.5 font-medium">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Arrived at pickup point, traffic delay…"
              className="input text-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white", borderColor: "rgba(255,255,255,0.2)" }}
            />
          </div>

          {updateError && (
            <p className="text-sm font-medium" style={{ color: "#FCA5A5" }}>{updateError}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={updating !== null}
                className="btn-accent py-2 px-4 text-sm disabled:opacity-50"
              >
                {updating === status ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Updating…
                  </span>
                ) : (
                  `Mark as ${STATUS_LABELS[status]}`
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isTerminal && (
        <div
          className="p-4 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: delivery.status === "delivered"
              ? "rgb(16 185 129 / 0.1)"
              : "rgb(100 116 139 / 0.1)",
            color: delivery.status === "delivered"
              ? "var(--color-success)"
              : "var(--color-text-secondary)",
          }}
        >
          {delivery.status === "delivered"
            ? "✓ Delivery completed successfully."
            : `This delivery is ${STATUS_LABELS[delivery.status].toLowerCase()}.`}
        </div>
      )}

      {/* Pickup */}
      <div className="card space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Pickup
        </h3>
        <InfoBlock
          label="Address"
          value={formatAddress([
            delivery.pickup_street,
            delivery.pickup_suburb,
            delivery.pickup_city,
            delivery.pickup_province,
            delivery.pickup_postal_code,
          ])}
        />
        <InfoBlock label="Contact"   value={delivery.pickup_contact_name} />
        <InfoBlock label="Phone"     value={delivery.pickup_contact_phone} />
        <InfoBlock label="Notes"     value={delivery.pickup_notes} />
      </div>

      {/* Drop-off */}
      <div className="card space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Drop-off
        </h3>
        <InfoBlock
          label="Address"
          value={formatAddress([
            delivery.dropoff_street,
            delivery.dropoff_suburb,
            delivery.dropoff_city,
            delivery.dropoff_province,
            delivery.dropoff_postal_code,
          ])}
        />
        <InfoBlock label="Recipient" value={delivery.recipient_name} />
        <InfoBlock label="Phone"     value={delivery.recipient_phone} />
        <InfoBlock label="Notes"     value={delivery.dropoff_notes} />
      </div>

      {/* Parcel */}
      <div className="card space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Parcel
        </h3>
        <InfoBlock label="Description"          value={delivery.parcel_description} />
        <InfoBlock label="Special instructions" value={delivery.special_instructions} />
      </div>

      {/* Customer */}
      <div className="card space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Customer
        </h3>
        <InfoBlock label="Name"  value={delivery.customer_name} />
        <InfoBlock label="Phone" value={delivery.customer_phone} />
      </div>
    </div>
  );
}
