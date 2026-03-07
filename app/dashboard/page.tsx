"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  DeliveryStatus,
} from "@/lib/constants/delivery-status";

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  parcel_description: string;
  pickup_street: string;
  pickup_city: string;
  dropoff_street: string;
  dropoff_city: string;
  quote_amount: string;
  quote_currency: string;
  created_at: string;
}

interface User {
  full_name: string;
  email: string;
}

const ACTIVE_STATUSES: DeliveryStatus[] = [
  "pending", "quoted", "confirmed", "paid", "assigned", "picked_up", "in_transit",
];

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className="card-raised flex flex-col gap-1"
      style={
        accent
          ? { borderColor: "var(--color-accent)", borderWidth: 2 }
          : undefined
      }
    >
      <span
        className="text-3xl font-black"
        style={{ color: accent ? "var(--color-accent)" : "var(--color-primary)" }}
      >
        {value}
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const date = new Date(delivery.created_at).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/dashboard/tracking/${delivery.id}`}
      className="block group"
    >
      <div
        className="flex items-center justify-between p-4 rounded-xl border transition-all duration-150 hover:shadow-md hover:border-opacity-50"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--color-primary)", opacity: 0.12 }}
          >
            <svg
              className="w-5 h-5"
              style={{ color: "var(--color-primary)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>
                {delivery.tracking_number}
              </span>
              <span className={`badge ${STATUS_COLORS[delivery.status]}`}>
                {STATUS_LABELS[delivery.status]}
              </span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>
              To: {delivery.recipient_name} · {delivery.dropoff_city}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-4">
          <span className="text-sm font-bold hidden sm:block" style={{ color: "var(--color-primary)" }}>
            {delivery.quote_currency} {parseFloat(delivery.quote_amount).toFixed(2)}
          </span>
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            style={{ color: "var(--color-text-muted)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function CustomerDashboardPage() {
  const [user, setUser]               = useState<User | null>(null);
  const [deliveries, setDeliveries]   = useState<Delivery[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meRes, delRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/deliveries"),
        ]);
        if (!meRes.ok || !delRes.ok) throw new Error("Failed to load data");
        const meData  = await meRes.json();
        const delData = await delRes.json();
        setUser(meData.data);
        setDeliveries(delData.data ?? []);
      } catch {
        setError("Failed to load your dashboard. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const active    = deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status));
  const delivered = deliveries.filter((d) => d.status === "delivered");
  const total     = deliveries.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--color-primary)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>
            {user ? `Welcome back, ${user.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Track your deliveries and send new parcels.
          </p>
        </div>
        <Link href="/dashboard/deliveries/new" className="btn-accent">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Delivery
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-xl text-sm font-medium"
          style={{ backgroundColor: "rgb(239 68 68 / 0.08)", color: "var(--color-error)" }}
        >
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total deliveries"  value={total} />
        <StatCard label="Active deliveries" value={active.length} accent />
        <StatCard label="Delivered"         value={delivered.length} />
      </div>

      {/* Deliveries list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
            Your Deliveries
          </h2>
          {deliveries.length > 5 && (
            <Link
              href="/dashboard/deliveries"
              className="text-sm font-semibold hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              View all →
            </Link>
          )}
        </div>

        {deliveries.length === 0 ? (
          <div
            className="card text-center py-16 space-y-4"
            style={{ borderStyle: "dashed", borderWidth: 2 }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              <svg className="w-8 h-8" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <div>
              <p className="font-bold" style={{ color: "var(--color-primary)" }}>No deliveries yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                Send your first parcel for a flat R99.
              </p>
            </div>
            <Link href="/dashboard/deliveries/new" className="btn-accent inline-flex">
              Send a parcel
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.slice(0, 10).map((d) => (
              <DeliveryRow key={d.id} delivery={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
