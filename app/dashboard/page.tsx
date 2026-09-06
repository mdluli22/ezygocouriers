"use client";

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
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  DeliveryStatus,
} from "@/lib/constants/delivery-status";

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  parcel_description: string;
  pickup_street: string;
  pickup_city: string;
  dropoff_street: string;
  dropoff_city: string;
  quote_amount: string;
  quote_currency: string;
  created_at: string;
}

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
      <span className="delivery-list-price">
        <strong>{delivery.quote_currency} {parseFloat(delivery.quote_amount).toFixed(2)}</strong>
        <ArrowRight size={17} />
      </span>
    </Link>
  );
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
  const paymentResult = searchParams.get("payment");
  const isNewCustomer = searchParams.get("welcome") === "1";

  useEffect(() => {
    let cancelled = false;

    async function loadDeliveries() {
      try {
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
  }, [paymentResult]);

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

  return (
    <div className="portal-dashboard">
      <section className="portal-hero-card customer-portal-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div className="portal-hero-orb" aria-hidden="true" />
        <div className="portal-hero-copy">
          <span className="portal-eyebrow"><Sparkles size={14} /> Customer hub</span>
          <h1>Your deliveries,<br /><em>all in one place.</em></h1>
          <p>Book, pay and follow every parcel from one calm, simple dashboard.</p>
          <Link href="/dashboard/deliveries/new" className="portal-hero-action">
            Book a delivery <Plus size={17} />
          </Link>
        </div>
        <div className="portal-pulse-card">
          <span className="portal-pulse-label"><i /> Live overview</span>
          <div className="portal-pulse-stats">
            <div><strong>{activeDeliveries.length}</strong><span>Active</span></div>
            <div><strong>{completedDeliveries.length}</strong><span>Delivered</span></div>
            <div><strong>{deliveries.length}</strong><span>Total</span></div>
          </div>
          <div className="portal-pulse-route">
            <span><i /></span><b /><span><i /></span><b /><span><Check size={12} /></span>
          </div>
          <small>From booking to their door, without the guesswork.</small>
        </div>
      </section>

      {(paymentResult || isNewCustomer || error) && (
        <div className="portal-notices">
          {paymentResult === "success" && (
            <div className="portal-notice is-success">
              <CheckCircle2 size={19} />
              <span><strong>Payment completed.</strong> Your delivery is ready for the next step.</span>
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
          {error && <div className="portal-notice is-error">{error}</div>}
        </div>
      )}

      <div className="portal-content-grid">
        <div className="portal-primary-column">
          {deliveries.length === 0 ? (
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
                title="Current deliveries"
                description="Bookings awaiting payment, collection or delivery."
                deliveries={activeDeliveries}
              />
              <DeliverySection
                title="Delivery history"
                description="Completed, cancelled and unsuccessful deliveries."
                deliveries={pastDeliveries}
                history
              />
            </>
          )}
        </div>

        <aside className="portal-side-column">
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
    </div>
  );
}
