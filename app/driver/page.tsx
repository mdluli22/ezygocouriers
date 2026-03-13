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

const ACTIVE_STATUSES: DeliveryStatus[] = ["assigned", "picked_up", "in_transit"];

const STATUS_STEP: Record<DeliveryStatus, number> = {
  assigned: 1, picked_up: 2, in_transit: 3, delivered: 4,
  pending: 0, quoted: 0, confirmed: 0, paid: 0, failed: 0, cancelled: 0,
};

function TripProgress({ status }: { status: DeliveryStatus }) {
  const steps = [
    { label: "Assigned",   icon: "📋" },
    { label: "Picked Up",  icon: "📦" },
    { label: "In Transit", icon: "🚚" },
    { label: "Delivered",  icon: "✅" },
  ];
  const current = STATUS_STEP[status] ?? 0;

  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const done    = stepNum < current;
        const active  = stepNum === current;
        const isLast  = i === steps.length - 1;
        return (
          <div key={step.label} className="flex items-center" style={{ flex: isLast ? "0 0 auto" : 1 }}>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all"
                style={{
                  backgroundColor: done || active ? "#F59E0B" : "rgba(255,255,255,0.12)",
                  color:           done || active ? "#111"    : "rgba(255,255,255,0.4)",
                  boxShadow:       active         ? "0 0 0 4px rgba(245,158,11,0.3)" : "none",
                  transform:       active         ? "scale(1.15)" : "scale(1)",
                }}
              >
                {done ? "✓" : step.icon}
              </div>
              <span className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: done || active ? "#F59E0B" : "rgba(255,255,255,0.35)" }}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full"
                style={{ backgroundColor: done ? "#F59E0B" : "rgba(255,255,255,0.12)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActiveTripCard({ d }: { d: Delivery }) {
  return (
    <Link href={`/driver/deliveries/${d.id}`} className="block">
      <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#1A2F2F" }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                Active Trip
              </span>
              <p className="text-white font-black text-lg mt-2 leading-none">{d.tracking_number}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: "rgba(245,158,11,0.15)" }}>
              🚚
            </div>
          </div>
          <TripProgress status={d.status} />
        </div>

        {/* Route */}
        <div className="mx-5 my-3 rounded-2xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex gap-3 items-stretch">
            <div className="flex flex-col items-center pt-1 gap-1">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#F59E0B" }} />
              <div className="flex-1 w-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)", minHeight: 20 }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Pick up</p>
                <p className="text-sm font-semibold text-white leading-tight">{d.pickup_street}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{d.pickup_city}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Drop off</p>
                <p className="text-sm font-semibold text-white leading-tight">{d.dropoff_street}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{d.dropoff_city}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
              style={{ backgroundColor: "#F59E0B", color: "#111" }}>
              {d.recipient_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{d.recipient_name}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Recipient</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold"
            style={{ backgroundColor: "#F59E0B", color: "#111" }}>
            View details
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TripRow({ d }: { d: Delivery }) {
  const isActive = ACTIVE_STATUSES.includes(d.status);
  const emoji = d.status === "delivered" ? "✅"
    : d.status === "cancelled" || d.status === "failed" ? "❌" : "📦";

  return (
    <Link href={`/driver/deliveries/${d.id}`} className="block group">
      <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all"
        style={{
          backgroundColor: isActive ? "rgba(245,158,11,0.06)" : "var(--color-surface)",
          border: `1px solid ${isActive ? "rgba(245,158,11,0.2)" : "var(--color-border)"}`,
        }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: isActive ? "rgba(245,158,11,0.12)" : "var(--color-surface-raised)" }}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-sm font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
              {d.dropoff_street}, {d.dropoff_city}
            </p>
            <span className={`shrink-0 badge text-xs ${STATUS_COLORS[d.status]}`}>
              {STATUS_LABELS[d.status]}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
            {d.tracking_number} · {d.recipient_name}
          </p>
        </div>
        <svg className="w-4 h-4 shrink-0 opacity-25 transition-all group-hover:opacity-60 group-hover:translate-x-0.5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function StatPill({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex-1 rounded-2xl p-4 flex flex-col items-center gap-1"
      style={{
        backgroundColor: highlight ? "#1A2F2F" : "var(--color-surface)",
        border: `1px solid ${highlight ? "rgba(245,158,11,0.2)" : "var(--color-border)"}`,
      }}>
      <span className="text-3xl font-black"
        style={{ color: highlight ? "#F59E0B" : "var(--color-primary)" }}>
        {value}
      </span>
      <span className="text-xs font-medium text-center leading-tight"
        style={{ color: highlight ? "rgba(255,255,255,0.55)" : "var(--color-text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

export default function DriverDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [driverName, setDriverName] = useState("");
  const [tab, setTab]               = useState<"active" | "all">("active");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.success) setDriverName(d.data.full_name.split(" ")[0]);
    });
    fetch("/api/driver/deliveries")
      .then(r => r.json())
      .then(d => { if (d.success) setDeliveries(d.data); else setError(d.message); })
      .catch(() => setError("Failed to load deliveries."))
      .finally(() => setLoading(false));
  }, []);

  const active    = deliveries.filter(d => ACTIVE_STATUSES.includes(d.status));
  const completed = deliveries.filter(d => d.status === "delivered");
  const pending   = deliveries.filter(d => d.status === "assigned");
  const currentTrip = active[0] ?? null;

  const tabDeliveries = tab === "active"
    ? deliveries.filter(d => ACTIVE_STATUSES.includes(d.status) || d.status === "assigned")
    : deliveries;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
          style={{ backgroundColor: "#1A2F2F" }}>
          <span className="text-2xl">🚚</span>
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>Loading your trips…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-6">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-black mt-0.5" style={{ color: "var(--color-primary)" }}>
            {driverName ? `Hey, ${driverName} 👋` : "My Dashboard"}
          </h1>
        </div>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg"
          style={{ backgroundColor: "#1A2F2F", color: "#F59E0B" }}>
          {driverName ? driverName.charAt(0).toUpperCase() : "D"}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <StatPill value={active.length}    label="Active"          highlight />
        <StatPill value={pending.length}   label="Awaiting Pickup" />
        <StatPill value={completed.length} label="Delivered"       />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: "rgb(239 68 68 / 0.08)", color: "var(--color-error)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Active trip card */}
      {currentTrip && <ActiveTripCard d={currentTrip} />}

      {/* Tabs + list */}
      <div>
        <div className="flex gap-1 p-1 rounded-2xl mb-4"
          style={{ backgroundColor: "var(--color-surface)" }}>
          {(["active", "all"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                backgroundColor: tab === t ? "var(--color-bg)" : "transparent",
                color:           tab === t ? "var(--color-primary)" : "var(--color-text-muted)",
                boxShadow:       tab === t ? "var(--shadow-card)" : "none",
              }}>
              {t === "active" ? `Active (${active.length})` : `All (${deliveries.length})`}
            </button>
          ))}
        </div>

        {tabDeliveries.length === 0 ? (
          <div className="rounded-3xl p-10 flex flex-col items-center gap-3 text-center"
            style={{ backgroundColor: "var(--color-surface)", border: "2px dashed var(--color-border)" }}>
            <span className="text-5xl">🛵</span>
            <p className="font-bold text-base" style={{ color: "var(--color-primary)" }}>
              {tab === "active" ? "No active trips" : "No trips yet"}
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {tab === "active"
                ? "You're all caught up. New trips will appear here."
                : "An admin will assign deliveries to you shortly."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tabDeliveries.map(d => <TripRow key={d.id} d={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}
