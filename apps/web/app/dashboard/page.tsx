"use client";

import type { CustomerDeliverySummary as Delivery } from "@ezygo/contracts";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  Package,
  PackageOpen,
  ShieldCheck,
  Search,
  Send,
  Truck,
  Home,
  Sparkles,
} from "lucide-react";
import {
  STATUS_LABELS,
  type DeliveryStatus,
} from "@ezygo/contracts";
import { STATUS_COLORS } from "@/lib/constants/delivery-status";



const PAST_STATUSES: DeliveryStatus[] = ["delivered", "failed", "cancelled"];

function DeliveryRow({ delivery }: { delivery: Delivery }) {
  const date = new Date(delivery.created_at).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/dashboard/tracking/${delivery.id}`} className="delivery-list-card group">
      <span className="delivery-list-icon"><Package size={20} /></span>
      <span className="delivery-list-copy">
        <span className="delivery-list-topline">
          <strong>{delivery.tracking_number}</strong>
          <span className={`badge ${STATUS_COLORS[delivery.status]}`}>
            {STATUS_LABELS[delivery.status]}
          </span>
        </span>
        <span className="delivery-list-route">
          <MapPin size={13} /> {delivery.pickup_city}
          <ArrowRight size={12} /> {delivery.dropoff_city}
        </span>
        <small>{date} · {delivery.recipient_name}</small>
      </span>
      {!PAST_STATUSES.includes(delivery.status) && <ShipmentProgress status={delivery.status} />}
      <span className="delivery-list-price">
        <strong>{delivery.quote_currency} {(delivery.quote_amount === null ? "Pending quote" : parseFloat(delivery.quote_amount).toFixed(2))}</strong>
        <ArrowRight size={17} />
      </span>
    </Link>
  );
}

function ShipmentProgress({ status }: { status: DeliveryStatus }) {
  const current = status === "in_transit" ? 2 : status === "picked_up" ? 1 : 0;
  return <span className="shipment-progress" aria-label={`Shipment status: ${STATUS_LABELS[status]}`}>
    {["Booked", "Picked up", "In transit", "Delivered"].map((label, index) => <span key={label} className={index <= current ? "is-complete" : ""}><i>{index <= current ? <Check size={11} /> : null}</i><small>{label}</small></span>)}
  </span>;
}

function DeliverySection({
  title,
  description,
  deliveries,
  history = false,
}: {
  title: string;
  description: string;
  deliveries: Delivery[];
  history?: boolean;
}) {
  if (deliveries.length === 0) return null;

  return (
    <section className="portal-list-section">
      <div className="portal-section-heading">
        <div>
          <span className="portal-section-kicker">
            {history ? <History size={13} /> : <Clock3 size={13} />}
            {history ? "Archive" : "In motion"}
          </span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="portal-count-badge">{deliveries.length}</span>
      </div>
      <div className="delivery-list-stack">
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
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"active" | "history">("active");
  const paymentResult = searchParams.get("payment");
  const paymentProvider = searchParams.get("provider");
  const returnedDeliveryId = Number(searchParams.get("delivery"));
  const returnedPaymentId = Number(searchParams.get("payment_id"));
  const isNewCustomer = searchParams.get("welcome") === "1";

  useEffect(() => {
    let cancelled = false;

    async function loadDeliveries() {
      try {
        if (
          paymentResult === "success" &&
          (paymentProvider === "payfast" || !paymentProvider) &&
          Number.isSafeInteger(returnedDeliveryId) && returnedDeliveryId > 0 &&
          Number.isSafeInteger(returnedPaymentId) && returnedPaymentId > 0
        ) {
          const confirmation = await fetch("/api/payments/sandbox-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              delivery_id: returnedDeliveryId,
              payment_id: returnedPaymentId,
            }),
          });

          // A 403 means this is a live checkout, where only PayFast's verified
          // ITN may complete payment. Other errors indicate a real sandbox
          // reconciliation problem and should be visible to the customer.
          if (!confirmation.ok && confirmation.status !== 403) {
            const confirmationResult = await confirmation.json();
            throw new Error(
              confirmationResult.message || "Payment could not be confirmed."
            );
          }
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
  }, [paymentProvider, paymentResult, returnedDeliveryId, returnedPaymentId]);

  if (loading) {
    return (
      <div className="portal-loading-state">
        <span><Package size={25} /></span>
        <strong>Gathering your deliveries</strong>
        <p>One moment while we bring everything into view.</p>
      </div>
    );
  }

  const activeDeliveries = deliveries.filter(
    (delivery) => !PAST_STATUSES.includes(delivery.status)
  );
  const pastDeliveries = deliveries.filter((delivery) =>
    PAST_STATUSES.includes(delivery.status)
  );
  const completedDeliveries = deliveries.filter((delivery) => delivery.status === "delivered");
  const searchQuery = query.trim().toLowerCase();
  const visibleDeliveries = (searchQuery ? deliveries : view === "active" ? activeDeliveries : pastDeliveries).filter(
    d => `${d.tracking_number} ${d.pickup_city} ${d.dropoff_city}`.toLowerCase().includes(searchQuery)
  );

  return (
    <div className="portal-dashboard">
      <section className="dispatch-hero">
        <div className="dispatch-hero-content">
          <span className="portal-eyebrow">DELIVER ANYWHERE IN CAPE TOWN</span>
          <h1>Hello, sender<span>.</span></h1>
          <p>Send, track and receive.<br />A little less effort. A lot more EzyGo.</p>
        </div>
        <div className="dispatch-art" aria-hidden="true"><span className="dispatch-orbit" /><MapPin className="dispatch-pin" size={36} /><div className="dispatch-parcel parcel-back"><Package size={76} strokeWidth={1} /></div><div className="dispatch-parcel parcel-front"><Package size={60} strokeWidth={1} /></div><span className="dispatch-art-note">From your door.<br />To theirs.</span></div>
        <label className="dispatch-search"><Search size={20} /><input id="parcel-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find your parcel by tracking number or city" aria-label="Search your deliveries" /><span>{deliveries.length} parcels</span></label>
      </section>

      <nav className="dispatch-shortcuts" aria-label="Delivery actions">
        <Link href="/dashboard/deliveries/new"><span className="is-featured"><Send size={24} /></span><strong>Send parcel</strong><small>Book a collection</small></Link>
        <button onClick={() => document.getElementById("parcel-search")?.focus()}><span><Package size={24} /></span><strong>Track order</strong><small>Find your shipment</small></button>
        <button onClick={() => { setView("active"); document.getElementById("shipments")?.scrollIntoView({ behavior: "smooth" }); }}><span><Truck size={24} /></span><strong>Active shipments</strong><small>{activeDeliveries.length} in progress</small></button>
        <button onClick={() => { setView("history"); document.getElementById("shipments")?.scrollIntoView({ behavior: "smooth" }); }}><span><History size={24} /></span><strong>History</strong><small>{completedDeliveries.length} delivered</small></button>
      </nav>

      {(paymentResult || isNewCustomer || error) && (
        <div className="portal-notices">
          {paymentResult === "success" && (
            <div className="portal-notice is-success">
              <CheckCircle2 size={19} />
              <span><strong>Payment submitted.</strong> Your provider is confirming the transaction.</span>
            </div>
          )}
          {isNewCustomer && (
            <div className="portal-notice is-info">
              <Sparkles size={19} />
              <span><strong>Welcome to EzyGo.</strong> Your account is verified and ready to go.</span>
            </div>
          )}
          {paymentResult === "cancelled" && (
            <div className="portal-notice is-warning">
              <Clock3 size={19} />
              <span><strong>Payment paused.</strong> Your booking is safe—open it below to try again.</span>
            </div>
          )}
          {paymentResult === "failed" && (
            <div className="portal-notice is-error">
              <Clock3 size={19} />
              <span><strong>Payment failed.</strong> Open your booking below to try another payment option.</span>
            </div>
          )}
          {error && <div className="portal-notice is-error">{error}</div>}
        </div>
      )}

      <div className="portal-content-grid">
        <div className="portal-primary-column" id="shipments">
          <div className="dispatch-list-heading"><h2>Your shipments</h2><div className="dispatch-tabs" role="group" aria-label="Shipment view"><button aria-pressed={view === "active"} onClick={() => setView("active")}>Active ({activeDeliveries.length})</button><button aria-pressed={view === "history"} onClick={() => setView("history")}>History</button></div></div>
          {deliveries.length === 0 && !error ? (
            <div className="portal-empty-state">
              <span className="portal-empty-icon"><PackageOpen size={30} /></span>
              <span className="portal-section-kicker"><Sparkles size={13} /> Fresh start</span>
              <h2>Your first delivery starts here.</h2>
              <p>Tell us where it needs to go. We’ll handle the route, updates and delivery.</p>
              <Link href="/dashboard/deliveries/new" className="portal-primary-button">
                Book your first delivery <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <>
              <DeliverySection
                title={query ? "Search results" : view === "active" ? "Active shipments" : "Delivery history"}
                description={query ? "Matching parcels across your bookings." : view === "active" ? "Follow every step, from collection to their door." : "All your previous journeys, in one place."}
                deliveries={visibleDeliveries}
                history={view === "history" && !query}
              />
              {!error && visibleDeliveries.length === 0 && <div className="portal-empty-state"><PackageOpen size={32} /><h2>{query ? "No matching parcels" : view === "active" ? "You’re all caught up." : "No past shipments yet."}</h2><p>{query ? "Try another tracking number or city." : "Your shipments will appear here when they’re ready."}</p></div>}
            </>
          )}
        </div>

        <aside className="portal-side-column">
          <Link href="/dashboard/deliveries/new" className="dispatch-pickup"><span className="portal-section-kicker">BUSINESS OR PERSONAL</span><h3>Need a pickup?</h3><p>We’ll come to you.</p><Truck size={70} strokeWidth={1.2} /><span className="dispatch-pickup-arrow"><ArrowRight size={20} /></span></Link>
          <div className="portal-side-card portal-side-card-accent">
            <span className="portal-side-icon"><ShieldCheck size={20} /></span>
            <span className="portal-section-kicker">EzyGo promise</span>
            <h3>Simple from start to finish.</h3>
            <ul>
              <li><Check size={14} /> One transparent flat fee</li>
              <li><Check size={14} /> Live status updates</li>
              <li><Check size={14} /> Secure online payment</li>
            </ul>
          </div>
          <div className="portal-side-card portal-flat-fee-card">
            <span>Flat delivery fee</span>
            <strong>R99</strong>
            <p>One clear price for every standard Cape Town delivery.</p>
            <Link href="/dashboard/deliveries/new">Start a booking <ArrowRight size={15} /></Link>
          </div>
        </aside>
      </div>
      <nav className="dispatch-mobile-nav" aria-label="Dashboard navigation"><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Home size={20} />Home</button><button onClick={() => { setView("active"); document.getElementById("shipments")?.scrollIntoView({ behavior: "smooth" }); }}><Package size={20} />Orders</button><Link href="/dashboard/deliveries/new" className="dispatch-nav-send"><Send size={23} />Send</Link><button onClick={() => { setView("history"); document.getElementById("shipments")?.scrollIntoView({ behavior: "smooth" }); }}><History size={20} />History</button></nav>
    </div>
  );
}
