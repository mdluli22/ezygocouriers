"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const date = new Date(delivery.created_at).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/dashboard/tracking/${delivery.id}`} className="block group">
      <div
        className="flex items-center justify-between p-4 rounded-2xl border transition-all duration-150 hover:shadow-md"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--color-primary)", opacity: 0.12 }}
          >
            <svg className="w-5 h-5" style={{ color: "var(--color-primary)", opacity: 10 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm" style={{ color: "var(--color-primary)" }}>{delivery.tracking_number}</span>
              <span className={`badge ${STATUS_COLORS[delivery.status]}`}>{STATUS_LABELS[delivery.status]}</span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>
              {delivery.pickup_city} → {delivery.dropoff_city}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-sm font-bold hidden sm:block" style={{ color: "var(--color-primary)" }}>
            {delivery.quote_currency} {parseFloat(delivery.quote_amount).toFixed(2)}
          </span>
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

const PAST_STATUSES: DeliveryStatus[] = ["delivered", "failed", "cancelled"];

function DeliverySection({
  title,
  description,
  deliveries,
}: {
  title: string;
  description: string;
  deliveries: Delivery[];
}) {
  if (deliveries.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-black" style={{ color: "var(--color-primary)" }}>
          {title}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      </div>
      <div className="space-y-3">
        {deliveries.map((delivery) => (
          <DeliveryRow key={delivery.id} delivery={delivery} />
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const paymentResult = searchParams.get("payment");
  const isNewCustomer = searchParams.get("welcome") === "1";
  const paidDeliveryId = Number(searchParams.get("delivery"));
  const returnedPaymentId = Number(searchParams.get("payment_id"));

  useEffect(() => {
    let cancelled = false;

    async function loadDeliveries() {
      try {
        if (
          paymentResult === "success" &&
          Number.isInteger(paidDeliveryId) &&
          paidDeliveryId > 0 &&
          Number.isInteger(returnedPaymentId) &&
          returnedPaymentId > 0
        ) {
          // In live mode this endpoint safely refuses the request and the ITN
          // remains authoritative. In sandbox it reconciles a missed test ITN.
          await fetch("/api/payments/sandbox-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              delivery_id: paidDeliveryId,
              payment_id: returnedPaymentId,
            }),
          });
        }

        const response = await fetch("/api/deliveries", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load deliveries");
        const result = await response.json();
        if (!cancelled) setDeliveries(result.data ?? []);
      } catch {
        if (!cancelled) setError("Failed to load deliveries. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDeliveries();
    return () => {
      cancelled = true;
    };
  }, [paidDeliveryId, paymentResult, returnedPaymentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--color-primary)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Loading deliveries…</span>
        </div>
      </div>
    );
  }

  const activeDeliveries = deliveries.filter(
    (delivery) => !PAST_STATUSES.includes(delivery.status)
  );
  const pastDeliveries = deliveries.filter((delivery) =>
    PAST_STATUSES.includes(delivery.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>My Deliveries</h1>
        <Link href="/dashboard/deliveries/new" className="btn-accent">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Delivery
        </Link>
      </div>

      {paymentResult === "success" && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: "rgb(16 185 129 / 0.1)",
            color: "var(--color-success)",
            border: "1px solid rgb(16 185 129 / 0.2)",
          }}
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p>Payment completed successfully.</p>
            <p className="font-normal opacity-80 mt-0.5">
              {Number.isInteger(paidDeliveryId) && paidDeliveryId > 0
                ? "Your paid delivery appears below with your other current deliveries."
                : "Your delivery has been updated and appears below."}
            </p>
          </div>
        </div>
      )}

      {isNewCustomer && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: "rgb(59 130 246 / 0.1)",
            color: "var(--color-info)",
            border: "1px solid rgb(59 130 246 / 0.2)",
          }}
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p>Welcome to EzyGo!</p>
            <p className="font-normal opacity-80 mt-0.5">
              Your account is verified. You can view your deliveries here or create a new one.
            </p>
          </div>
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
          Payment was cancelled. Your delivery is still saved and you can open it below to try again.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgb(239 68 68 / 0.08)", color: "var(--color-error)" }}>
          {error}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="card text-center py-20 space-y-5" style={{ borderStyle: "dashed", borderWidth: 2 }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: "var(--color-surface-raised)" }}>
            <svg className="w-8 h-8" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: "var(--color-primary)" }}>No deliveries yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Book your first delivery in under a minute.</p>
          </div>
          <Link href="/dashboard/deliveries/new" className="btn-accent inline-flex">Book a delivery</Link>
        </div>
      ) : (
        <div className="space-y-8">
          <DeliverySection
            title="Current Deliveries"
            description="Bookings awaiting payment, collection, or delivery."
            deliveries={activeDeliveries}
          />
          <DeliverySection
            title="Delivery History"
            description="Completed, cancelled, and unsuccessful deliveries."
            deliveries={pastDeliveries}
          />
        </div>
      )}
    </div>
  );
}
