"use client";

import TimedNotice from "@/components/ui/TimedNotice";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Clock3, History, Package, PackageOpen, RefreshCw, Search, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { STATUS_LABELS, type DeliveryStatus } from "@ezygo/contracts";
import { STATUS_COLORS } from "@/lib/constants/delivery-status";
import "./dashboard.css";

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  pickup_city: string;
  dropoff_city: string;
  quote_amount: string | null;
  quote_currency: string;
  created_at: string;
}

const PAST_STATUSES: DeliveryStatus[] = ["delivered", "failed", "cancelled"];
const STEPS = ["Booked", "Picked up", "In transit", "Delivered"];

function ShipmentCard({ delivery }: { delivery: Delivery }) {
  const current = delivery.status === "delivered" ? 3 : delivery.status === "in_transit" ? 2 : delivery.status === "picked_up" ? 1 : 0;
  const stopped = delivery.status === "failed" || delivery.status === "cancelled";
  return (
    <Link href={`/dashboard/tracking/${delivery.id}`} className="customer-shipment" aria-label={`View ${delivery.tracking_number}, ${STATUS_LABELS[delivery.status]}`}>
      <div className="customer-shipment-top">
        <span className="customer-parcel-icon"><Package size={24} /></span>
        <div className="customer-shipment-copy">
          <h3>{delivery.tracking_number}</h3>
          <p>{delivery.pickup_city} <ArrowRight size={12} aria-label="to" /> {delivery.dropoff_city}</p>
        </div>
        <span className={`badge ${STATUS_COLORS[delivery.status]}`}>{STATUS_LABELS[delivery.status]}</span>
      </div>
      {!stopped && (
        <ol className="customer-progress" aria-label="Shipment progress">
          {STEPS.map((label, index) => (
            <li key={label} className={index <= current ? "is-complete" : ""} aria-current={index === current ? "step" : undefined}>
              <span className="customer-progress-dot">{index <= current && <Check size={12} aria-hidden="true" />}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      )}
      {PAST_STATUSES.includes(delivery.status) && (
        <p className="customer-shipment-meta">{delivery.recipient_name} · Booked {new Date(delivery.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</p>
      )}
      <div className="customer-shipment-footer">
        <span>{delivery.quote_amount === null ? "Quote pending" : `${delivery.quote_currency} ${Number(delivery.quote_amount).toFixed(2)}`}</span>
        <strong>View shipment <ArrowRight size={15} /></strong>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  return <Suspense fallback={<div className="portal-loading-state" role="status">Loading your dashboard…</div>}><DashboardContent /></Suspense>;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [firstName, setFirstName] = useState("sender");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const search = useRef<HTMLInputElement>(null);
  const paymentResult = searchParams.get("payment");
  const isNewCustomer = searchParams.get("welcome") === "1";
  const section = searchParams.get("section");
  const history = section === "history";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(response => response.json())
      .then(result => { if (result.success && result.data?.full_name) setFirstName(result.data.full_name.trim().split(/\s+/)[0]); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDeliveries() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/deliveries", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Failed to load deliveries");
        const result = await response.json();
        if (!controller.signal.aborted) setDeliveries(result.data ?? []);
      } catch {
        if (!controller.signal.aborted) setError("We couldn’t load your shipments. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadDeliveries();
    return () => controller.abort();
  }, [paymentResult, refreshKey]);

  const activeDeliveries = deliveries.filter(delivery => !PAST_STATUSES.includes(delivery.status));
  const pastDeliveries = deliveries.filter(delivery => PAST_STATUSES.includes(delivery.status));
  const filtered = (history ? pastDeliveries : activeDeliveries).filter(delivery =>
    `${delivery.tracking_number} ${delivery.pickup_city} ${delivery.dropoff_city}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  function destination(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", next);
    return `/dashboard?${params.toString()}#shipments`;
  }

  return (
    <div className="customer-dashboard" id="dashboard-home">
      <section className="customer-welcome" aria-labelledby="customer-greeting">
        <div className="customer-welcome-top">
          <div className="customer-welcome-copy">
            <span className="customer-eyebrow">Deliver anywhere in Cape Town</span>
            <h1 id="customer-greeting">Hello, {firstName}.</h1>
          </div>
          <div className="customer-parcel-art" aria-hidden="true">
            <div className="customer-orbit" />
            <div className="customer-box customer-box-back"><i /><span>↑ ↑</span></div>
            <div className="customer-box customer-box-front"><i /><span>EzyGo</span></div>
          </div>
        </div>
        <form className="customer-search" role="search" onSubmit={event => { event.preventDefault(); document.getElementById("shipments")?.scrollIntoView({ block: "start" }); }}>
          <Search size={21} aria-hidden="true" />
          <input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tracking number or city" aria-label="Search by tracking number or city" autoCapitalize="none" autoComplete="off" spellCheck={false} />
          {query && <button type="button" onClick={() => { setQuery(""); search.current?.focus(); }} aria-label="Clear search"><X size={18} /></button>}
          <button type="submit" aria-label="Search shipments"><ArrowRight size={21} /></button>
        </form>
      </section>

      <nav className="customer-shortcuts" aria-label="Quick actions">
        <Link href="/dashboard/deliveries/new"><span className="is-featured"><Send size={24} /></span>Send parcel</Link>
        <button type="button" onClick={() => search.current?.focus()}><span><Search size={24} /></span>Track order</button>
        <Link href={destination("orders")} onClick={() => setQuery("")}><span><Package size={24} /></span>Active shipments</Link>
        <Link href={destination("history")} onClick={() => setQuery("")}><span><History size={24} /></span>History</Link>
      </nav>

      {(paymentResult || isNewCustomer) && <TimedNotice key={`${paymentResult}-${isNewCustomer}`}><div className="portal-notices" role="status">
        {paymentResult === "success" && <div className="portal-notice is-success"><CheckCircle2 size={19} /><span><strong>Payment submitted.</strong> Your provider is confirming the transaction.</span></div>}
        {isNewCustomer && <div className="portal-notice is-info"><Sparkles size={19} /><span><strong>Welcome to EzyGo.</strong> Your account is verified and ready to go.</span></div>}
        {paymentResult === "cancelled" && <div className="portal-notice is-warning"><Clock3 size={19} /><span><strong>Payment paused.</strong> Your booking is safe, open it below to try again.</span></div>}
        {paymentResult === "failed" && <div className="portal-notice is-error"><Clock3 size={19} /><span><strong>Payment failed.</strong> Open your booking below to try another payment option.</span></div>}
      </div></TimedNotice>}

      <div className="customer-content">
        <section className="customer-shipments" id="shipments" aria-labelledby="shipments-heading" aria-busy={loading}>
          <div className="customer-section-heading">
            <h2 id="shipments-heading">Your deliveries</h2>
            <nav className="customer-tabs" aria-label="Shipment views">
              <Link href={destination("orders")} aria-current={!history ? "page" : undefined}>Active{!loading && !error ? ` (${activeDeliveries.length})` : ""}</Link>
              <Link href={destination("history")} aria-current={history ? "page" : undefined}>History{!loading && !error ? ` (${pastDeliveries.length})` : ""}</Link>
            </nav>
          </div>
          <div className="customer-list-intro">
            <div><h3>{query.trim() ? "Search results" : history ? "Delivery history" : "Active shipments"}</h3><p>{query.trim() ? `Matching ${history ? "past" : "active"} parcels.` : history ? "Completed, cancelled and unsuccessful deliveries." : "Follow every step, from collection to their door."}</p></div>
            <button type="button" className="customer-refresh" onClick={() => setRefreshKey(key => key + 1)} disabled={loading} aria-label="Refresh shipments"><RefreshCw size={17} /></button>
          </div>
          {loading ? <div className="customer-empty" role="status"><Package size={30} /><h3>Gathering your shipments</h3><p>One moment while we bring everything into view.</p></div>
            : error ? <div className="customer-empty" role="alert"><PackageOpen size={30} /><h3>Shipments unavailable</h3><p>{error}</p><button className="portal-primary-button" onClick={() => setRefreshKey(key => key + 1)}>Try again <RefreshCw size={16} /></button></div>
            : filtered.length === 0 ? <div className="customer-empty"><PackageOpen size={32} /><h3>{query.trim() ? "No matching parcels" : history ? "No past shipments yet." : "Ready when you are."}</h3><p>{query.trim() ? "Try another tracking number or city." : history ? "Your completed deliveries will appear here." : "Book a pickup and follow your parcel right here."}</p>{query.trim() ? <button className="portal-primary-button" onClick={() => setQuery("")}>Clear search <X size={16} /></button> : !history && <Link href="/dashboard/deliveries/new" className="portal-primary-button">{deliveries.length ? "Send a parcel" : "Send your first parcel"} <ArrowRight size={16} /></Link>}</div>
            : <div className="customer-shipment-list" tabIndex={0} role="region" aria-label="Your deliveries list">{filtered.map(delivery => <ShipmentCard key={delivery.id} delivery={delivery} />)}</div>}
        </section>

        <aside className="customer-extras" aria-label="Delivery services">
          <Link href="/dashboard/deliveries/new" className="customer-pickup"><span className="customer-eyebrow">Business or personal</span><h2>Need a pickup?</h2><p>We’ll come to you.</p><span className="customer-pickup-arrow"><ArrowRight size={23} /></span><small>From your door. To theirs.</small></Link>
          <div className="customer-promise"><ShieldCheck size={23} /><span className="customer-eyebrow">EzyGo promise</span><h2>Simple from start to finish.</h2><ul>{["One transparent flat fee", "Live status updates", "Secure online payment"].map(label => <li key={label}><Check size={15} />{label}</li>)}</ul></div>
          <Link href="/dashboard/deliveries/new" className="customer-fee"><span className="customer-eyebrow">Flat delivery fee</span><strong>R99</strong><p>One clear price for every standard Cape Town delivery.</p><span className="customer-text-link">Start a booking <ArrowRight size={15} /></span></Link>
        </aside>
      </div>

    </div>
  );
}
