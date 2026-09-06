"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface PaymentRedirect {
  payfast_url: string;
  form_data: Record<string, string>;
  demo_mode: boolean;
  payment_id: number;
  delivery_id: number;
}

export default function PayDeliveryPage() {
  const params = useParams<{ id: string }>();
  const formRef = useRef<HTMLFormElement>(null);
  const [redirect, setRedirect] = useState<PaymentRedirect | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialisePayment() {
      try {
        const response = await fetch("/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delivery_id: Number(params.id) }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to initialise payment.");
        }

        if (!cancelled) {
          if (result.data.demo_mode) {
            window.location.assign(`/dashboard/payment-demo?delivery=${result.data.delivery_id}&payment_id=${result.data.payment_id}`);
            return;
          }
          setRedirect(result.data);
        }
      } catch (paymentError) {
        if (!cancelled) {
          setError(
            paymentError instanceof Error
              ? paymentError.message
              : "Unable to initialise payment."
          );
        }
      }
    }

    initialisePayment();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (redirect && formRef.current) formRef.current.submit();
  }, [redirect]);

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h1 className="text-xl font-black" style={{ color: "var(--color-primary)" }}>
          Payment could not start
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {error}
        </p>
        <Link href={`/dashboard/tracking/${params.id}`} className="btn-primary inline-flex">
          Back to delivery
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-5">
      <div
        className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto"
        style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }}
      />
      <div>
        <h1 className="text-xl font-black" style={{ color: "var(--color-primary)" }}>
          Opening PayFast Sandbox
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          You will be redirected to PayFast to complete the test payment.
        </p>
      </div>

      {redirect && (
        <form ref={formRef} method="POST" action={redirect.payfast_url}>
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
