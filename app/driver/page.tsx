"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, STATUS_COLORS, DeliveryStatus } from "@/lib/constants/delivery-status";

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  pickup_street: string;
  pickup_city: string;
  dropoff_street: string;
  dropoff_city: string;
  parcel_description: string;
  updated_at: string;
}

const ACTIVE: DeliveryStatus[] = ["assigned", "picked_up", "in_transit"];

function DeliveryCard({ d }: { d: Delivery }) {
  const isActive = ACTIVE.includes(d.status);
  return (
    <Link href={`/driver/deliveries/${d.id}`} className="block group">
      <div
        className="p-4 rounded-xl border transition-all duration-150 hover:shadow-md"
        style={{
          borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
          backgroundColor: "var(--color-surface)",
          borderWidth: isActive ? 2 : 1,
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>
              {d.tracking_number}
            </span>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {new Date(d.updated_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
            </p>
          </div>
          <span className={`badge ${STATUS_COLORS[d.status]}`}>{STATUS_LABELS[d.status]}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "var(--color-primary)" }} />
            <p className="truncate" style={{ color: "var(--color-text-secondary)" }}>
              {d.pickup_street}, {d.pickup_city}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "var(--color-accent)" }} />
            <p className="truncate" style={{ color: "var(--color-text-secondary)" }}>
              {d.dropoff_street}, {d.dropoff_city}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            To: {d.recipient_name}
          </span>
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            style={{ color: "var(--color-text-muted)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function DriverDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    fetch("/api/driver/deliveries")
      .then((r) => r.json())
      .then((d) => { if (d.success) setDeliveries(d.data); else setError(d.message); })
      .catch(() => setError("Failed to load deliveries."))
      .finally(() => setLoading(false));
  }, []);

  const active    = deliveries.filter((d) => ACTIVE.includes(d.status));
  const completed = deliveries.filter((d) => d.status === "delivered");
  const pending   = deliveries.filter((d) => d.status === "assigned");

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>My Deliveries</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          All deliveries currently assigned to you.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "In progress",  value: active.length,    accent: true },
          { label: "Awaiting pickup", value: pending.length },
          { label: "Delivered",    value: completed.length },
        ].map((s) => (
          <div
            key={s.label}
            className="card-raised flex flex-col gap-1"
            style={s.accent ? { borderColor: "var(--color-accent)", borderWidth: 2 } : undefined}
          >
            <span
              className="text-3xl font-black"
              style={{ color: s.accent ? "var(--color-accent)" : "var(--color-primary)" }}
            >
              {s.value}
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: "rgb(239 68 68 / 0.08)", color: "var(--color-error)" }}>
          {error}
        </div>
      )}

      {/* Active deliveries first */}
      {active.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3" style={{ color: "var(--color-primary)" }}>
            In Progress
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {active.map((d) => <DeliveryCard key={d.id} d={d} />)}
          </div>
        </div>
      )}

      {/* All deliveries */}
      <div>
        <h2 className="text-base font-bold mb-3" style={{ color: "var(--color-primary)" }}>
          All Assigned Deliveries
        </h2>
        {deliveries.length === 0 ? (
          <div className="card text-center py-16 space-y-3" style={{ borderStyle: "dashed", borderWidth: 2 }}>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              <svg className="w-7 h-7" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <p className="font-bold" style={{ color: "var(--color-primary)" }}>No deliveries assigned yet</p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              An admin will assign deliveries to you shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deliveries.map((d) => <DeliveryCard key={d.id} d={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}
