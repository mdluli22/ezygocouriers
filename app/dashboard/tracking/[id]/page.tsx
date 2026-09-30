"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  STATUS_LABELS,
  type DeliveryStatus,
} from "@ezygo/contracts";
import { ArrowLeft, ArrowUpRight, Check, CircleAlert, Clock3, Package, Phone, ShieldCheck, Truck, UserRound } from "lucide-react";
import "./tracking.css";

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
  quote_amount: string | null;
  quote_currency: string;
  driver_name: string | null;
  driver_phone: string | null;
  driver_avatar_url: string | null;
  driver_vehicle_type: string | null;
  driver_vehicle_reg: string | null;
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

const STATUS_COPY: Record<DeliveryStatus, { title: string; description: string }> = {
  pending: { title: "Your delivery starts here.", description: "Your request is in. We’re preparing the details for your delivery." },
  quoted: { title: "Your quote is ready.", description: "Your delivery has been quoted. Confirmation is the next step." },
  confirmed: { title: "Ready when you are.", description: "Complete your payment so we can assign a driver to your delivery." },
  paid: { title: "Let’s get you moving.", description: "Payment received. We’re finding a driver for your parcel." },
  assigned: { title: "Meet your driver.", description: "A driver has been assigned. Your parcel is awaiting pickup." },
  picked_up: { title: "In good hands.", description: "Your driver has collected your parcel. Next stop: your recipient." },
  in_transit: { title: "On the way.", description: "Your parcel is on its way to the drop-off address." },
  delivered: { title: "Delivered. Just like that.", description: "Your parcel has reached its destination. Thank you for choosing EzyGo." },
  cancelled: { title: "Delivery cancelled.", description: "This delivery has been cancelled. You can book a new delivery from your dashboard." },
  failed: { title: "Delivery unsuccessful.", description: "This delivery could not be completed. Check the activity below for details." },
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <div className="tracking-detail-row"><dt>{label}</dt><dd>{value}</dd></div>;
}

function DriverPhoto({ name, url }: { name: string; url: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const usableUrl = url && (/^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//")));
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return usableUrl && failedUrl !== url ? (
    <Image className="tracking-driver-photo" src={url} alt={`${name}, your delivery driver`} width={64} height={64} unoptimized onError={() => setFailedUrl(url)} />
  ) : (
    <span className="tracking-driver-initials" role="img" aria-label={`${name} — photo unavailable`}>{initials || "—"}</span>
  );
}

function StatusTimeline({ current, logs }: { current: DeliveryStatus; logs: StatusLog[] }) {
  const terminal = current === "cancelled" || current === "failed";
  const orderedLogs = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const currentLog = orderedLogs.find((log) => log.status === current);
  const history = orderedLogs.filter((log) => log !== currentLog);
  const currentIndex = TIMELINE_STEPS.indexOf(current);
  const upcoming = terminal || currentIndex < 0 ? [] : TIMELINE_STEPS.slice(currentIndex + 1);

  return (
    <section className="tracking-panel tracking-activity" aria-labelledby="delivery-activity-heading">
      <div className="tracking-activity-heading">
        <div><h2 id="delivery-activity-heading">Delivery activity</h2><p>Your parcel’s progress, step by step.</p></div>
        <span className="tracking-activity-icon"><Clock3 size={21} aria-hidden="true" /></span>
      </div>

      <div className={`tracking-activity-current${terminal ? " is-terminal" : ""}`}>
        <span className="tracking-activity-current-icon" aria-hidden="true">{terminal ? <CircleAlert size={22} /> : current === "delivered" ? <Check size={22} /> : <Package size={22} />}</span>
        <div className="tracking-activity-current-copy">
          <span className="tracking-eyebrow">{terminal || current === "delivered" ? "FINAL STATUS" : "CURRENT STATUS"}</span>
          <h3>{STATUS_LABELS[current]}</h3>
          <p>{currentLog?.note || STATUS_COPY[current].description}</p>
          {currentLog && <time dateTime={currentLog.created_at}>{formatDate(currentLog.created_at)}</time>}
        </div>
      </div>

      <div className="tracking-activity-history-heading"><h3>Previous updates</h3><span>Newest first</span></div>
      {history.length > 0 ? (
        <ol className="tracking-activity-feed">
          {history.map((log) => (
            <li key={log.id}>
              <time dateTime={log.created_at}>
                <span>{new Date(log.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>
                <strong>{new Date(log.created_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</strong>
              </time>
              <span className="tracking-activity-feed-dot" aria-hidden="true" />
              <div><h4>{STATUS_LABELS[log.status]}</h4>{log.note && <p>{log.note}</p>}</div>
            </li>
          ))}
        </ol>
      ) : <p className="tracking-activity-empty">No earlier updates yet. Recorded delivery updates will appear here.</p>}

      {upcoming.length > 0 && <details className="tracking-activity-upcoming">
        <summary><span>Up next <strong>{STATUS_LABELS[upcoming[0]]}</strong></span><span className="tracking-activity-expand" aria-hidden="true">+</span></summary>
        <ol aria-label="Upcoming delivery steps">{upcoming.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span>{STATUS_LABELS[step]}</li>)}</ol>
      </details>}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  return (
    <Suspense fallback={<TrackingLoading />}>
      <TrackingContent />
    </Suspense>
  );
}

function TrackingLoading() {
  return (
    <div className="tracking-page tracking-loading" role="status" aria-live="polite">
      <span className="tracking-eyebrow">YOUR DELIVERY</span>
      <h1>Getting your delivery details</h1>
      <p>Just a moment while we check your parcel.</p>
      <div className="tracking-loading-grid" aria-hidden="true"><div /><div /></div>
    </div>
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
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  async function handleCancel() {
    if (!delivery) return;
    const confirmed = window.confirm(
      "Cancel this delivery? This cannot be undone."
    );
    if (!confirmed) return;

    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/deliveries/${delivery.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Cancellation failed.");

      setDelivery((current) => current ? { ...current, status: "cancelled", updated_at: new Date().toISOString() } : current);
      setLogs((current) => [
        ...current,
        {
          id: Date.now(),
          status: "cancelled",
          note: "Delivery cancelled by customer",
          created_at: new Date().toISOString(),
          updated_by_name: "You",
        },
      ]);
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : "Cancellation failed. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const res = await fetch(`/api/deliveries/${params.id}`, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Delivery not found.");
        if (!controller.signal.aborted) {
          setDelivery(data.data.delivery);
          setLogs(data.data.logs);
        }
      } catch (e: unknown) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Failed to load delivery.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [params.id]);

  if (loading) return <TrackingLoading />;

  if (error || !delivery) {
    return (
      <div className="tracking-page">
        <Link href="/dashboard" className="tracking-back"><ArrowLeft size={17} /> All deliveries</Link>
        <section className="tracking-panel tracking-error" role="alert">
          <CircleAlert size={32} aria-hidden="true" />
          <h1>We couldn’t load this delivery.</h1>
          <p>{error || "This delivery is unavailable. Return to your deliveries to try again."}</p>
          <Link href="/dashboard" className="tracking-primary-button">Back to deliveries <ArrowUpRight size={18} /></Link>
        </section>
      </div>
    );
  }

  const terminal = delivery.status === "cancelled" || delivery.status === "failed";
  const copy = STATUS_COPY[delivery.status];
  const progress = TIMELINE_STEPS.indexOf(delivery.status);
  const canCancel = (["pending", "quoted", "confirmed", "paid", "assigned"] as DeliveryStatus[]).includes(delivery.status);
  const fee = delivery.quote_amount === null ? "Quote pending" : `${delivery.quote_currency} ${Number(delivery.quote_amount).toFixed(2)}`;
  const milestones = [
    { label: "Booked", reached: progress >= 2 },
    { label: "Driver assigned", reached: progress >= 4 },
    { label: "On the way", reached: progress >= 5 },
    { label: "Delivered", reached: progress >= 7 },
  ];

  return (
    <div className="tracking-page">
      <Link href="/dashboard" className="tracking-back"><ArrowLeft size={17} /> All deliveries</Link>
      <header className="tracking-header">
        <div><p className="tracking-eyebrow">YOUR DELIVERY</p><h1>Track your parcel</h1></div>
        <div className="tracking-reference"><span>Tracking number</span><strong>{delivery.tracking_number}</strong></div>
      </header>

      {justConfirmed && delivery.status === "confirmed" && <div className="tracking-notice" role="status"><Check size={18} />Delivery confirmed. Complete payment to get a driver assigned.</div>}
      {paymentResult === "success" && <div className="tracking-notice" role="status">Checkout completed. Your payment provider is confirming the transaction.</div>}
      {paymentResult === "cancelled" && <div className="tracking-notice" role="status">Payment was cancelled. You can try again when you are ready.</div>}
      {paymentResult === "failed" && <div className="tracking-notice tracking-notice-error" role="alert"><CircleAlert size={18} />Payment failed. You can try Yoco again when you are ready.</div>}

      <div className="tracking-grid">
        <div className="tracking-main-column">
          <section className="tracking-status" aria-labelledby="delivery-status-title">
            <div className="tracking-status-top"><span className={`tracking-status-badge${terminal ? " is-terminal" : ""}`}><span />{STATUS_LABELS[delivery.status]}</span><Package size={28} strokeWidth={1.5} aria-hidden="true" /></div>
            <h2 id="delivery-status-title">{copy.title}</h2><p>{copy.description}</p>
            {!terminal && <ol className="tracking-progress" aria-label="Delivery progress">{milestones.map((milestone) => <li key={milestone.label} className={milestone.reached ? "is-reached" : ""}><span aria-hidden="true" /><span>{milestone.label}{milestone.reached && <span className="sr-only"> — completed</span>}</span></li>)}</ol>}
            <div className="tracking-updated"><Clock3 size={14} aria-hidden="true" /> Last updated {formatDate(delivery.updated_at)}</div>
          </section>

          <section className="tracking-panel tracking-route">
            <div className="tracking-section-title"><h2>The journey</h2><span>Pickup to drop-off</span></div>
            <ol className="tracking-stops">
              {(["pickup", "dropoff"] as const).map((stop) => <li key={stop}>
                <span className={`tracking-stop-marker ${stop}`} aria-hidden="true" />
                <div><p className="tracking-eyebrow">{stop === "pickup" ? "PICKUP" : "DROP-OFF"}</p><h3>{stop === "pickup" ? delivery.pickup_street : delivery.dropoff_street}</h3>
                  <p>{formatAddress(delivery, stop)}</p>
                  <div className="tracking-contact"><UserRound size={14} aria-hidden="true" /><span>{stop === "pickup" ? delivery.pickup_contact_name : delivery.recipient_name}</span><span>{stop === "pickup" ? delivery.pickup_contact_phone : delivery.recipient_phone}</span></div>
                </div>
              </li>)}
            </ol>
          </section>

          <section className="tracking-panel">
            <div className="tracking-section-title"><h2>Parcel details</h2><Package size={20} aria-hidden="true" /></div>
            <dl><InfoRow label="Description" value={delivery.parcel_description} /><InfoRow label="Special instructions" value={delivery.special_instructions} />{delivery.fragile && <InfoRow label="Handling" value="Fragile · handle with care" />}</dl>
            {delivery.require_pin && <div className="tracking-security"><ShieldCheck size={21} aria-hidden="true" /><div><strong>Secure handover</strong><p>{delivery.delivery_pin_sent_at ? "Delivery PIN sent to the recipient." : "A delivery PIN will be sent after payment."}</p></div></div>}
          </section>
        </div>

        <aside className="tracking-sidebar" aria-label="Driver and payment details">
          <section className="tracking-panel">
            <div className="tracking-section-title"><h2>Your driver</h2><Truck size={20} aria-hidden="true" /></div>
            <div className="tracking-driver">
              {delivery.driver_name ? <DriverPhoto name={delivery.driver_name} url={delivery.driver_avatar_url} /> : <div className="tracking-avatar"><UserRound size={25} aria-hidden="true" /></div>}
              <div><h3>{delivery.driver_name || (terminal ? "No driver assigned" : "Awaiting assignment")}</h3><p>{delivery.driver_name ? "Your delivery partner" : terminal ? "This delivery has ended." : "Driver details will appear here."}</p></div>
            </div>
            {delivery.driver_name && <dl className="tracking-driver-vehicle">
              <InfoRow label="Vehicle" value={delivery.driver_vehicle_type || "Not provided yet"} />
              <div className="tracking-detail-row"><dt>Number plate</dt><dd>{delivery.driver_vehicle_reg ? <span className="tracking-number-plate">{delivery.driver_vehicle_reg}</span> : "Not provided yet"}</dd></div>
            </dl>}
            {delivery.driver_phone && delivery.driver_name && <a className="tracking-secondary-button" href={`tel:${delivery.driver_phone}`}><Phone size={16} />Call driver</a>}
          </section>
          <section className="tracking-panel tracking-payment">
            <div className="tracking-section-title"><h2>Delivery summary</h2></div>
            <div className="tracking-fee"><span>Delivery fee <small>Flat rate</small></span><strong>{fee}</strong></div>
            <p className="tracking-booked">Booked {formatDate(delivery.created_at)}</p>
            {delivery.status === "confirmed" && <><Link href={`/dashboard/tracking/${delivery.id}/pay`} className="tracking-primary-button">Pay now <ArrowUpRight size={18} /></Link><p className="tracking-payment-note"><ShieldCheck size={14} />Secure payment via Yoco</p></>}
          </section>
          {canCancel && <div className="tracking-cancel"><p>Change of plans? You can cancel before your parcel is picked up.</p>{cancelError && <p role="alert" className="tracking-cancel-error">{cancelError}</p>}<button type="button" onClick={handleCancel} disabled={cancelling}>{cancelling ? "Cancelling…" : "Cancel delivery"}</button></div>}
        </aside>
        <StatusTimeline current={delivery.status} logs={logs} />
      </div>
    </div>
  );
}
