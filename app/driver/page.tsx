"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Package,
  Route,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, DeliveryStatus } from "@/lib/constants/delivery-status";

interface Delivery {
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
  updated_at: string;
}

const ACTIVE_STATUSES: DeliveryStatus[] = ["assigned", "picked_up", "in_transit"];

const STATUS_STEP: Record<DeliveryStatus, number> = {
  assigned: 1,
  picked_up: 2,
  in_transit: 3,
  delivered: 4,
  pending: 0,
  quoted: 0,
  confirmed: 0,
  paid: 0,
  failed: 0,
  cancelled: 0,
};

function TripProgress({ status }: { status: DeliveryStatus }) {
  const steps = ["Assigned", "Picked up", "In transit", "Delivered"];
  const current = STATUS_STEP[status] ?? 0;

  return (
    <div className="driver-progress" aria-label={`Current delivery status: ${STATUS_LABELS[status]}`}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const done = stepNumber < current;
        const active = stepNumber === current;

        return (
          <div key={step} className={`driver-progress-step ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}>
            <span>{done ? <Check size={13} /> : stepNumber}</span>
            <small>{step}</small>
            {index < steps.length - 1 && <i />}
          </div>
        );
      })}
    </div>
  );
}

function ActiveTripCard({ delivery }: { delivery: Delivery }) {
  return (
    <Link href={`/driver/deliveries/${delivery.id}`} className="driver-active-card group">
      <div className="driver-card-grid" aria-hidden="true" />
      <div className="driver-active-heading">
        <div>
          <span className="portal-eyebrow"><Navigation size={14} /> Active trip</span>
          <h2>{delivery.tracking_number}</h2>
          <p>Next stop: {delivery.dropoff_city}</p>
        </div>
        <span className="driver-truck-icon"><Truck size={24} /></span>
      </div>

      <TripProgress status={delivery.status} />

      <div className="driver-route-card">
        <span className="driver-route-rail"><i /><b /><i /></span>
        <div>
          <small>Pick up</small>
          <strong>{delivery.pickup_street}</strong>
          <span>{delivery.pickup_city}</span>
        </div>
        <div>
          <small>Drop off</small>
          <strong>{delivery.dropoff_street}</strong>
          <span>{delivery.dropoff_city}</span>
        </div>
      </div>

      <div className="driver-active-footer">
        <span className="driver-recipient">
          <i>{delivery.recipient_name.charAt(0).toUpperCase()}</i>
          <span><strong>{delivery.recipient_name}</strong><small>Recipient</small></span>
        </span>
        <span className="driver-view-link">View trip <ArrowRight size={16} /></span>
      </div>
    </Link>
  );
}

function TripRow({ delivery }: { delivery: Delivery }) {
  const isActive = ACTIVE_STATUSES.includes(delivery.status);
  const Icon = delivery.status === "delivered"
    ? CheckCircle2
    : delivery.status === "cancelled" || delivery.status === "failed"
      ? XCircle
      : isActive
        ? Route
        : Package;

  return (
    <Link href={`/driver/deliveries/${delivery.id}`} className="driver-trip-row group">
      <span className={`driver-trip-icon ${isActive ? "is-active" : ""}`}><Icon size={19} /></span>
      <span className="driver-trip-copy">
        <span>
          <strong>{delivery.dropoff_street}, {delivery.dropoff_city}</strong>
          <i className={`badge ${STATUS_COLORS[delivery.status]}`}>{STATUS_LABELS[delivery.status]}</i>
        </span>
        <small>{delivery.tracking_number} · {delivery.recipient_name}</small>
      </span>
      <ArrowRight size={16} className="driver-trip-arrow" />
    </Link>
  );
}

function DriverStat({
  value,
  label,
  icon: Icon,
  highlight = false,
}: {
  value: number;
  label: string;
  icon: typeof Truck;
  highlight?: boolean;
}) {
  return (
    <div className={`driver-stat-card ${highlight ? "is-highlighted" : ""}`}>
      <span><Icon size={17} /></span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

export default function DriverDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [driverName, setDriverName] = useState("");
  const [tab, setTab] = useState<"active" | "all">("active");

  useEffect(() => {
    fetch("/api/auth/me").then((response) => response.json()).then((data) => {
      if (data.success) setDriverName(data.data.full_name.split(" ")[0]);
    });
    fetch("/api/driver/deliveries")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setDeliveries(data.data);
        else setError(data.message);
      })
      .catch(() => setError("Failed to load deliveries."))
      .finally(() => setLoading(false));
  }, []);

  const active = deliveries.filter((delivery) => ACTIVE_STATUSES.includes(delivery.status));
  const completed = deliveries.filter((delivery) => delivery.status === "delivered");
  const pending = deliveries.filter((delivery) => delivery.status === "assigned");
  const currentTrip = active[0] ?? null;
  const tabDeliveries = tab === "active"
    ? deliveries.filter((delivery) => ACTIVE_STATUSES.includes(delivery.status))
    : deliveries;

  if (loading) {
    return (
      <div className="portal-loading-state">
        <span><Truck size={25} /></span>
        <strong>Preparing your route</strong>
        <p>Checking assignments and delivery updates.</p>
      </div>
    );
  }

  return (
    <div className="portal-dashboard driver-dashboard">
      <section className="driver-welcome-card">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div className="driver-welcome-copy">
          <span className="portal-eyebrow"><Sparkles size={14} /> Driver workspace</span>
          <p>{new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1>{driverName ? `Ready to move, ${driverName}?` : "Ready to move?"}</h1>
          <span>See what needs your attention and keep every trip moving.</span>
        </div>
        <div className="driver-stat-grid">
          <DriverStat value={active.length} label="Active trips" icon={Navigation} highlight />
          <DriverStat value={pending.length} label="Awaiting pickup" icon={Clock3} />
          <DriverStat value={completed.length} label="Delivered" icon={CheckCircle2} />
        </div>
      </section>

      {error && <div className="portal-notice is-error">{error}</div>}

      <div className={`driver-dashboard-grid ${currentTrip ? "has-active-trip" : ""}`}>
        {currentTrip && <ActiveTripCard delivery={currentTrip} />}

        <section className="driver-trip-panel">
          <div className="portal-section-heading">
            <div>
              <span className="portal-section-kicker"><MapPin size={13} /> Dispatch queue</span>
              <h2>Your trips</h2>
              <p>Every assignment and delivery update in one place.</p>
            </div>
          </div>

          <div className="driver-tabs" role="tablist" aria-label="Filter trips">
            {(["active", "all"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTab(filter)}
                className={tab === filter ? "is-active" : ""}
                role="tab"
                aria-selected={tab === filter}
              >
                {filter === "active" ? `Active (${active.length})` : `All trips (${deliveries.length})`}
              </button>
            ))}
          </div>

          {tabDeliveries.length === 0 ? (
            <div className="driver-empty-state">
              <span><Truck size={25} /></span>
              <strong>{tab === "active" ? "No active trips" : "No trips yet"}</strong>
              <p>{tab === "active" ? "You’re all caught up. New assignments will appear here." : "Your delivery history will appear here."}</p>
            </div>
          ) : (
            <div className="driver-trip-list">
              {tabDeliveries.map((delivery) => <TripRow key={delivery.id} delivery={delivery} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
