"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";

function PaymentDemoContent() {
  const searchParams = useSearchParams();
  const deliveryId = Number(searchParams.get("delivery"));
  const paymentId = Number(searchParams.get("payment_id"));
  const validIds = Number.isSafeInteger(deliveryId) && deliveryId > 0 && Number.isSafeInteger(paymentId) && paymentId > 0;
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function confirmDemoPayment() {
    if (!validIds) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/sandbox-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_id: deliveryId, payment_id: paymentId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Demo payment could not be confirmed.");
      setComplete(true);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Demo payment could not be confirmed.");
    } finally {
      setLoading(false);
    }
  }

  if (!validIds) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h1 className="text-2xl font-black" style={{ color: "var(--color-primary)" }}>Invalid demo payment</h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>This payment link is missing its delivery details.</p>
        <Link href="/dashboard" className="btn-primary inline-flex">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 sm:py-20">
      <section className="rounded-3xl overflow-hidden shadow-xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="p-6 text-white" style={{ backgroundColor: "var(--color-primary)" }}>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70"><ShieldCheck size={15} /> PayFast sandbox</span>
          <h1 className="text-2xl font-black mt-3">Demo payment</h1>
          <p className="text-sm mt-1 opacity-75">No real money will be charged.</p>
        </div>
        <div className="p-6 space-y-5">
          {complete ? (
            <div className="text-center space-y-4">
              <CheckCircle2 size={52} className="mx-auto" style={{ color: "var(--color-success)" }} />
              <div>
                <h2 className="text-xl font-black" style={{ color: "var(--color-primary)" }}>Payment confirmed</h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>Your delivery is paid and ready for dispatch.</p>
              </div>
              <Link href="/dashboard?payment=success" className="btn-primary w-full inline-flex justify-center">View deliveries</Link>
            </div>
          ) : (
            <>
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgb(16 185 129 / 0.12)", color: "var(--color-success)" }}><CreditCard size={21} /></span>
                <div><strong className="block text-sm" style={{ color: "var(--color-text-primary)" }}>Sandbox transaction</strong><span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Payment attempt #{paymentId}</span></div>
              </div>
              {error && <p className="text-sm p-3 rounded-xl" style={{ backgroundColor: "rgb(239 68 68 / 0.1)", color: "var(--color-error)" }}>{error}</p>}
              <button type="button" onClick={confirmDemoPayment} disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? "Confirming…" : "Confirm demo payment"}
              </button>
              <Link href={`/dashboard/tracking/${deliveryId}`} className="block text-center text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Cancel and return</Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PaymentDemoPage() {
  return <Suspense><PaymentDemoContent /></Suspense>;
}
