"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

type PaymentProvider = "paystack";

interface PaymentRedirect {
  provider: PaymentProvider;
  redirect_url?: string;
  demo_mode: boolean;
  payment_id: number;
  delivery_id: number;
}

export default function PayDeliveryPage() {
  const params = useParams<{ id: string }>();
  const selectedProvider: PaymentProvider = "paystack";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function initialisePayment() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_id: Number(params.id),
          payment_method: selectedProvider,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to initialise payment.");
      }

      const redirect = result.data as PaymentRedirect;
      if (!redirect.redirect_url) throw new Error("Paystack did not return a checkout URL.");
      window.location.assign(redirect.redirect_url);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to initialise payment."
      );
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-16 space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: "var(--color-primary)" }}>
          Choose how to pay
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Paystack is enabled in test mode for this integration trial.
        </p>
      </div>

      <div className="p-4 rounded-2xl text-left" style={{ backgroundColor: "var(--color-surface)", border: "2px solid var(--color-primary)" }}>
        <strong className="block text-sm" style={{ color: "var(--color-text-primary)" }}>Paystack</strong>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Secure test checkout</span>
      </div>

      {error && (
        <p className="p-3 rounded-xl text-sm" style={{ backgroundColor: "rgb(239 68 68 / 0.1)", color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      <button type="button" onClick={initialisePayment} disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Opening Paystack…" : "Continue with Paystack"}
      </button>

      <Link href={`/dashboard/tracking/${params.id}`} className="block text-center text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        Back to delivery
      </Link>
    </div>
  );
}
