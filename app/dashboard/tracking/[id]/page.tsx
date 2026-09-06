"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  DeliveryStatus,
} from "@/lib/constants/delivery-status";

interface StatusLog {
  id: number;
  status: DeliveryStatus;
  note: string;
  created_at: string;
  updated_by_name: string;
}

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  parcel_description: string;
  special_instructions: string;
  fragile: boolean;
  require_pin: boolean;
  delivery_pin_sent_at: string | null;
  pickup_street: string;
  pickup_suburb: string;
  pickup_city: string;
  pickup_province: string;
  pickup_postal_code: string;
  dropoff_street: string;
  dropoff_suburb: string;
  dropoff_city: string;
  dropoff_province: string;
  dropoff_postal_code: string;
  quote_amount: string;
  quote_currency: string;
  driver_name: string | null;
  driver_phone: string | null;
  created_at: string;
  updated_at: string;
}

// The ordered steps shown in the timeline (excludes terminal states)
const TIMELINE_STEPS: DeliveryStatus[] = [
  "pending", "quoted", "confirmed", "paid",
  "assigned", "picked_up", "in_transit", "delivered",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatAddress(d: Delivery, type: "pickup" | "dropoff") {
  const p = type === "pickup" ? "pickup" : "dropoff";
  return [
    d[`${p}_street` as keyof Delivery],
    d[`${p}_suburb` as keyof Delivery],
    d[`${p}_city` as keyof Delivery],
    d[`${p}_province` as keyof Delivery],
    d[`${p}_postal_code` as keyof Delivery],
  ].filter(Boolean).join(", ");
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span className="font-medium text-right" style={{ color: "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

function StatusTimeline({
  current,
  logs,
}: {
  current: DeliveryStatus;
  logs: StatusLog[];
}) {
  const isCancelled = current === "cancelled";
  const isFailed    = current === "failed";
  const isTerminal  = isCancelled || isFailed;

  // Build a map of status → log for timestamps
  const logMap = new Map(logs.map((l) => [l.status, l]));
  const currentIndex = TIMELINE_STEPS.indexOf(current);

  return (
    <div className="card">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: "var(--color-text-muted)" }}>
        Delivery Timeline
      </h3>

      {isTerminal && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl mb-5 text-sm font-semibold"
          style={{
            backgroundColor: isCancelled ? "rgb(100 116 139 / 0.1)" : "rgb(239 68 68 / 0.08)",
            color: isCancelled ? "var(--color-text-secondary)" : "var(--color-error)",
          }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          This delivery has been {isCancelled ? "cancelled" : "marked as failed"}.
        </div>
      )}

      <div className="space-y-0">
        {TIMELINE_STEPS.map((step, i) => {
          const log        = logMap.get(step);
          const isComplete = !isTerminal && currentIndex > i;
          const isCurrent  = !isTerminal && current === step;
          return (
            <div key={step} className="flex gap-4">
              {/* Dot + line */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 z-10"
                  style={{
                    backgroundColor: isComplete
                      ? "var(--color-primary)"
                      : isCurrent
                      ? "var(--color-accent)"
                      : "var(--color-surface-raised)",
                    border: isCurrent ? "3px solid var(--color-primary)" : "none",
                  }}
                >
                  {isComplete ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--color-primary)" }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-text-muted)", opacity: 0.4 }} />
                  )}
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    className="w-0.5 flex-1 my-1 min-h-[20px] transition-all duration-300"
                    style={{
                      backgroundColor: isComplete ? "var(--color-primary)" : "var(--color-border)",
                      opacity: isComplete ? 0.4 : 1,
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pb-5 pt-1 flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: isComplete || isCurrent
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {STATUS_LABELS[step]}
                </p>
                {log && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {formatDate(log.created_at)}
                    {log.note ? ` · ${log.note}` : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  return (
    <Suspense>
      <TrackingContent />
    </Suspense>
  );
}

function TrackingContent() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const justConfirmed = searchParams.get("confirmed") === "1";
  const paymentResult = searchParams.get("payment");

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [logs, setLogs]         = useState<StatusLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/deliveries/${params.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Not found");
        setDelivery(data.data.delivery);
        setLogs(data.data.logs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load delivery.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
        <p className="font-bold text-lg" style={{ color: "var(--color-primary)" }}>Delivery not found</p>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{error}</p>
        <Link href="/dashboard" className="btn-primary inline-flex">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Just confirmed banner */}
      {justConfirmed && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: "rgb(16 185 129 / 0.1)",
            color: "var(--color-success)",
            border: "1px solid rgb(16 185 129 / 0.2)",
          }}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Delivery confirmed! Proceed to payment to get a driver assigned.
        </div>
      )}

      {paymentResult === "success" && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: "rgb(16 185 129 / 0.1)",
            color: "var(--color-success)",
            border: "1px solid rgb(16 185 129 / 0.2)",
          }}
        >
          Test payment completed. PayFast is confirming the transaction.
        </div>
      )}

      {paymentResult === "cancelled" && (
        <div
          className="p-4 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: "rgb(245 158 11 / 0.1)",
            color: "var(--color-warning)",
            border: "1px solid rgb(245 158 11 / 0.2)",
          }}
        >
          Payment was cancelled. You can try again when you are ready.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold flex items-center gap-1 mb-2 hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
            {delivery.tracking_number}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Created {formatDate(delivery.created_at)}
          </p>
        </div>
        <span className={`badge text-sm px-3 py-1.5 ${STATUS_COLORS[delivery.status]}`}>
          {STATUS_LABELS[delivery.status]}
        </span>
      </div>

      {/* Timeline */}
      <StatusTimeline current={delivery.status} logs={logs} />

      {/* Quote */}
      <InfoCard title="Delivery Fee">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Flat rate</span>
          <span className="text-2xl font-black" style={{ color: "var(--color-accent)" }}>
            {delivery.quote_currency} {parseFloat(delivery.quote_amount).toFixed(2)}
          </span>
        </div>
      </InfoCard>

      {/* Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard title="Pickup">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {delivery.pickup_contact_name}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {formatAddress(delivery, "pickup")}
          </p>
          <InfoRow label="Phone" value={delivery.pickup_contact_phone} />
        </InfoCard>

        <InfoCard title="Drop-off">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {delivery.recipient_name}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {formatAddress(delivery, "dropoff")}
          </p>
          <InfoRow label="Phone" value={delivery.recipient_phone} />
        </InfoCard>
      </div>

      {/* Parcel */}
      <InfoCard title="Parcel Details">
        <InfoRow label="Description"         value={delivery.parcel_description} />
        <InfoRow label="Special instructions" value={delivery.special_instructions} />
        {delivery.fragile && <InfoRow label="Handling" value="Fragile · handle with care" />}
        {delivery.require_pin && (
          <InfoRow
            label="Handover security"
            value={delivery.delivery_pin_sent_at ? "PIN sent to recipient" : "PIN will be sent after payment"}
          />
        )}
      </InfoCard>

      {/* Driver (only if assigned) */}
      {delivery.driver_name && (
        <InfoCard title="Assigned Driver">
          <InfoRow label="Name"  value={delivery.driver_name} />
          <InfoRow label="Phone" value={delivery.driver_phone} />
        </InfoCard>
      )}

      {/* Pay CTA — show when confirmed and not yet paid */}
      {delivery.status === "confirmed" && (
        <div
          className="p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <div>
            <p className="font-bold text-white">Ready to pay?</p>
            <p className="text-sm text-white opacity-70 mt-0.5">
              Secure payment via PayFast · R{parseFloat(delivery.quote_amount).toFixed(2)}
            </p>
          </div>
          <Link
            href={`/dashboard/tracking/${delivery.id}/pay`}
            className="btn-accent"
          >
            Pay now →
          </Link>
        </div>
      )}
    </div>
  );
}
