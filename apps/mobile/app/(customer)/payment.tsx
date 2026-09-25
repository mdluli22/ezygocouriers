import { useAuth } from "../../lib/auth/provider";
import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { customerApi, deliveryId } from "../../lib/customer-api";
import { PAYMENT_RETURN_URL, parsePaymentLink, secureCheckoutUrl } from "../../lib/payment-links";
import { Page, Title, Card, Notice, Action, errorMessage } from "../../components/customer/UI";
export default function Payment() {
  const { phase } = useAuth();
  const params = useLocalSearchParams<{ id?: string; token?: string }>();
  const [id, setId] = useState<number | null>(deliveryId(params.id));
  const [status, setStatus] = useState("checking");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(true);
  const [retry, setRetry] = useState(0);
  const opening = useRef(false);
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    if (phase !== "authenticated") return;
    setStatus("checking");
    setPrice("");
    setError("");
    setId(deliveryId(params.id));
    let active = true;
    const current = ++generation.current;
    let timer: ReturnType<typeof setTimeout>;
    let checks = 0;
    async function check() {
      setPolling(true);
      try {
        const token = typeof params.token === "string" ? params.token : undefined;
        const requested = deliveryId(params.id);
        if (!requested && !token) throw new Error("Invalid payment link. Open a delivery from your dashboard.");
        const verified = await customerApi.verify(token ? { token, ...(requested ? { delivery_id: requested } : {}) } : { delivery_id: requested! });
        if (!active || current !== generation.current) return;
        setId(verified.delivery_id); setStatus(verified.status); setError("");
        const detail = await customerApi.detail(verified.delivery_id);
        if (!active || current !== generation.current) return;
        setPrice(`${detail.delivery.quote_currency ?? "ZAR"} ${Number(detail.delivery.quote_amount ?? 0).toFixed(2)}`);
        if (verified.status === "pending" && ++checks < 12) timer = setTimeout(() => void check(), 5000);
        else setPolling(false);
      } catch (e) { if (active && current === generation.current) { setError(errorMessage(e)); setPolling(false); } }
    }
    void check();
    return () => { active = false; generation.current++; clearTimeout(timer); };
  }, [params.id, params.token, retry, phase]));
  async function open() {
    if (!id || opening.current) return;
    opening.current = true; setBusy(true); setError("");
    try {
      const checkout = await customerApi.checkout(id);
      const result = await WebBrowser.openAuthSessionAsync(secureCheckoutUrl(checkout.redirect_url), PAYMENT_RETURN_URL, { preferEphemeralSession: true });
      if (result.type === "success") {
        const token = parsePaymentLink(result.url);
        // Return content is untrusted until the authenticated backend verifies it.
        router.replace({ pathname: "/payment", params: { id, token } });
      }
      setRetry(value => value + 1);
    } catch (e) { setError(errorMessage(e)); }
    finally { opening.current = false; setBusy(false); }
  }
  const paid = status === "complete";
  return <Page><Title>{paid ? "Payment confirmed" : "Payment"}</Title><Card>
    <Notice message={price} />
    <Notice message={paid ? "The backend has confirmed your payment. Your delivery is ready for dispatch." : status === "not_started" ? "Your quote is ready. Open Paystack when you are ready to pay." : status === "pending" ? "Awaiting payment confirmation. Closing checkout or returning to the app does not confirm payment." : status === "checking" ? "Checking payment with the server…" : `Payment ${status}. Open your delivery for the next steps.`} />
    {polling ? <Notice message="Verifying payment status…" /> : null}
    <Notice message={error} error />
    {!paid ? <Action label="Check payment again" secondary disabled={busy} onPress={() => setRetry(value => value + 1)} /> : null}
    {["pending", "not_started"].includes(status) && id ? <Action label="Open secure Paystack checkout" busy={busy} onPress={() => void open()} /> : null}
  </Card>{id ? <Action label="View delivery" secondary onPress={() => router.replace({ pathname: "/deliveries/[id]", params: { id } })} /> : null}<Action label="Back to dashboard" secondary onPress={() => router.replace("/dashboard")} /></Page>;
}
