"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PaymentProvider = "payfast" | "yoco";

interface PaymentRedirect {
  provider: PaymentProvider;
  payfast_url?: string;
  form_data?: Record<string, string>;
  redirect_url?: string;
  demo_mode: boolean;
  payment_id: number;
  delivery_id: number;
}

export default function PayDeliveryPage() {
  const params = useParams<{ id: string }>();
  const formRef = useRef<HTMLFormElement>(null);
  const [redirect, setRedirect] = useState<PaymentRedirect | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("payfast");
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

      if (result.data.provider === "yoco") {
        window.location.assign(result.data.redirect_url);
        return;
      }
      if (result.data.demo_mode) {
        window.location.assign(`/dashboard/payment-demo?delivery=${result.data.delivery_id}&payment_id=${result.data.payment_id}`);
        return;
      }
      setRedirect(result.data);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to initialise payment."
      );
      setLoading(false);
    }
  }

  useEffect(() => {
    if (redirect?.provider === "payfast" && formRef.current) formRef.current.submit();
  }, [redirect]);

  return (
    <div className="max-w-md mx-auto py-16 space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: "var(--color-primary)" }}>
          Choose how to pay
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Both options use their secure sandbox checkout.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([
          { value: "payfast" as const, name: "PayFast", detail: "PayFast Sandbox" },
          { value: "yoco" as const, name: "Yoco", detail: "Yoco test checkout" },
        ]).map((option) => {
          const selected = selectedProvider === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedProvider(option.value)}
              disabled={loading}
              aria-pressed={selected}
              className="p-4 rounded-2xl text-left"
              style={{
                backgroundColor: "var(--color-surface)",
                border: selected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              }}
            >
              <strong className="block text-sm" style={{ color: "var(--color-text-primary)" }}>{option.name}</strong>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{option.detail}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="p-3 rounded-xl text-sm" style={{ backgroundColor: "rgb(239 68 68 / 0.1)", color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      <button type="button" onClick={initialisePayment} disabled={loading} className="btn-primary w-full py-3">
        {loading ? `Opening ${selectedProvider === "yoco" ? "Yoco" : "PayFast"}…` : `Continue with ${selectedProvider === "yoco" ? "Yoco" : "PayFast"}`}
      </button>

      <Link href={`/dashboard/tracking/${params.id}`} className="block text-center text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        Back to delivery
      </Link>

      {redirect?.payfast_url && redirect.form_data && (
        <form ref={formRef} method="POST" action={redirect.payfast_url} className="text-center">
          {Object.entries(redirect.form_data).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button type="submit" className="btn-primary">
            Continue to PayFast
          </button>
        </form>
      )}
    </div>
  );
}
