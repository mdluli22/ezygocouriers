"use client";

import { usePagedList, useRemote } from "@/components/ui/useRemote";
import ListControls from "@/components/ui/ListControls";
import EarningsPanel from "@/components/earnings/EarningsPanel";
import DeliveryEarnings, { type DeliveryEarningsData } from "@/components/earnings/DeliveryEarnings";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Navigation, Package, RefreshCw, Search, ShieldCheck, Truck } from "lucide-react";
import { STATUS_LABELS, type DeliveryStatus } from "@ezygo/contracts";
import "./deliveries.css";

interface Delivery extends DeliveryEarningsData {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  pickup_street: string;
  pickup_city: string;
  dropoff_street: string;
  dropoff_city: string;
  parcel_description: string;
  fragile: boolean;
  require_pin: boolean;
  updated_at: string;
}

const FILTERS = ["active", "history", "all"] as const;
type Filter = typeof FILTERS[number];

function RouteStops({ delivery }: { delivery: Delivery }) {
  return <ol className="dispatch-stops">
    <li><span aria-hidden="true" /><div><small>Pickup</small><strong>{delivery.pickup_street}</strong><p>{delivery.pickup_city}</p></div></li>
    <li><span aria-hidden="true" /><div><small>Drop-off</small><strong>{delivery.dropoff_street}</strong><p>{delivery.dropoff_city}</p></div></li>
  </ol>;
}

function Handling({ delivery }: { delivery: Delivery }) {
  if (!delivery.fragile && !delivery.require_pin) return null;
  return <div className="dispatch-handling">{delivery.fragile && <span><Package size={13} aria-hidden="true" />Fragile</span>}{delivery.require_pin && <span><ShieldCheck size={13} aria-hidden="true" />PIN required</span>}</div>;
}

export default function DriverDashboardPage() {
  const [driverName, setDriverName] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(response => response.json())
      .then(data => { if (data.success && !controller.signal.aborted) setDriverName(data.data.full_name.split(" ")[0]); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const list = usePagedList<Delivery>(`/api/driver/deliveries?view=${filter}&q=${encodeURIComponent(query)}`);
  const deliveries = list.items;
  const { loading, error } = list;
  const summary = useRemote<{ data: Record<string, number> }>("/api/deliveries/summary");
  const activeList = useRemote<{ data: Delivery[] }>("/api/driver/deliveries?view=active&limit=25");

  const active = activeList.data?.data ?? [];
  const currentTrip = active.find(delivery => delivery.status === "in_transit" || delivery.status === "picked_up") ?? active[0];
  const filtered = deliveries;
  const counts = summary.data?.data ?? {};

  return (
    <div className="dispatch-page">
      <header className="dispatch-header">
        <div><p className="dispatch-eyebrow">DRIVER WORKSPACE</p><h1>{driverName ? `${driverName}’s deliveries` : "Your deliveries"}</h1></div>
        <button className="dispatch-refresh" onClick={() => list.reload()} disabled={loading}><RefreshCw size={16} aria-hidden="true" />{loading ? "Refreshing…" : "Refresh"}</button>
      </header>

      <dl className="dispatch-stats" aria-label="Delivery totals">
        <div><dt><Navigation size={17} aria-hidden="true" />Active deliveries</dt><dd>{loading ? "Loading" : counts.active ?? "…"}</dd></div>
        <div><dt><Clock3 size={17} aria-hidden="true" />Awaiting pickup</dt><dd>{loading ? "Loading" : counts.assigned ?? "…"}</dd></div>
        <div><dt><CheckCircle2 size={17} aria-hidden="true" />Delivered</dt><dd>{loading ? "Loading" : counts.delivered ?? "…"}</dd></div>
      </dl>

      <EarningsPanel />
      <ListControls {...list} />

      {error && <div className="dispatch-error" role="alert"><p>{error} {deliveries.length > 0 && "Showing previously loaded deliveries."}</p><button onClick={() => list.reload()}>Try again</button></div>}
      {loading && deliveries.length === 0 ? <div className="dispatch-empty" role="status"><Truck size={30} aria-hidden="true" /><h2>Loading your deliveries</h2><p>Checking your assignments and recent updates.</p></div> : error && deliveries.length === 0 ? null :
      <div className="dispatch-layout">
        <aside className="dispatch-focus" aria-label="Current delivery">
          {currentTrip ? <>
            <div className="dispatch-focus-heading"><span className="dispatch-eyebrow">{currentTrip.status === "assigned" ? "READY FOR PICKUP" : "IN PROGRESS"}</span><Truck size={23} aria-hidden="true" /></div>
            <h2>{currentTrip.status === "assigned" ? "Your next pickup." : "Keep this delivery moving."}</h2>
            <p className="dispatch-focus-reference">{currentTrip.tracking_number}</p>
            <span className="dispatch-status">{STATUS_LABELS[currentTrip.status]}</span>
            <RouteStops delivery={currentTrip} />
            <div className="dispatch-parcel"><small>Deliver to</small><strong>{currentTrip.recipient_name}</strong>{currentTrip.parcel_description && <p>{currentTrip.parcel_description}</p>}</div>
            <Handling delivery={currentTrip} />
            <DeliveryEarnings delivery={currentTrip} />
            <Link className="dispatch-primary" href={`/driver/deliveries/${currentTrip.id}`}>{currentTrip.status === "assigned" ? "View pickup" : "Continue delivery"}<ArrowRight size={18} aria-hidden="true" /></Link>
          </> : <div className="dispatch-off-duty"><CheckCircle2 size={32} aria-hidden="true" /><h2>You’re all caught up.</h2><p>New assignments will appear here when a delivery is assigned to you.</p></div>}
        </aside>

        <section className="dispatch-queue" aria-labelledby="dispatch-queue-heading" aria-busy={loading}>
          <div className="dispatch-queue-heading"><h2 id="dispatch-queue-heading">Delivery queue</h2><span>{filtered.length} {filtered.length === 1 ? "delivery" : "deliveries"}</span></div>
          <div className="dispatch-filters" role="group" aria-label="Filter deliveries">{FILTERS.map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "active" ? "Active" : value === "history" ? "History" : "All deliveries"}<span>{counts[value]}</span></button>)}</div>
          <label className="dispatch-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search deliveries by tracking number, address or recipient</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tracking number, address or recipient" /></label>
          {filtered.length > 0 ? <ul className="dispatch-list" tabIndex={0} aria-label="Delivery queue results">{filtered.map(delivery => <li key={delivery.id}>
            <Link className="dispatch-job" href={`/driver/deliveries/${delivery.id}`}>
              <div className="dispatch-job-heading"><strong>{delivery.tracking_number}</strong><span className={`dispatch-status${delivery.status === "failed" || delivery.status === "cancelled" ? " is-ended" : ""}`}>{STATUS_LABELS[delivery.status]}</span></div>
              <RouteStops delivery={delivery} />
              <Handling delivery={delivery} />
              <DeliveryEarnings delivery={delivery} />
              <div className="dispatch-job-footer"><span>{delivery.recipient_name}</span><strong>View delivery <ArrowRight size={15} aria-hidden="true" /></strong></div>
            </Link>
          </li>)}</ul> : <div className="dispatch-empty"><Package size={28} aria-hidden="true" /><h3>{query ? "No matching deliveries" : filter === "active" ? "No active deliveries" : "No deliveries here yet"}</h3><p>{query ? "Try another address, recipient or tracking number." : "Your deliveries will appear here as they are assigned and updated."}</p>{query && <button onClick={() => setQuery("")}>Clear search</button>}</div>}
        </section>
      </div>}
    </div>
  );
}
