"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  STATUS_LABELS,
  VALID_TRANSITIONS,
  type DeliveryStatus,
} from "@ezygo/contracts";
import { ArrowLeft, ArrowRight, CheckCircle2, Navigation, Package, Phone, ShieldCheck, Truck } from "lucide-react";
import "./delivery.css";

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  parcel_description: string;
  special_instructions: string | null;
  fragile: boolean;
  require_pin: boolean;
  pin_verified_at: string | null;
  pickup_street: string;
  pickup_suburb: string | null;
  pickup_city: string;
  pickup_province: string | null;
  pickup_postal_code: string | null;
  pickup_notes: string | null;
  dropoff_street: string;
  dropoff_suburb: string | null;
  dropoff_city: string;
  dropoff_province: string | null;
  dropoff_postal_code: string | null;
  dropoff_notes: string | null;
  customer_name: string;
  customer_phone: string | null;
}

function fmt(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(", ");
}

const ACTION_LABELS: Partial<Record<DeliveryStatus, string>> = {
  picked_up: "Confirm pickup",
  in_transit: "Start delivery",
  delivered: "Complete delivery",
  cancelled: "Cancel delivery",
};

export default function DriverDeliveryDetailPage() {
  const params = useParams();

  const [delivery, setDelivery]     = useState<Delivery | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [updating, setUpdating]     = useState<DeliveryStatus | null>(null);
  const [note, setNote]             = useState("");
  const [updateError, setUpdateError] = useState("");
  const [showNote, setShowNote]     = useState(false);
  const [deliveryPin, setDeliveryPin] = useState("");
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/driver/deliveries/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Not found");
      setDelivery(data.data.delivery);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function handleStatusUpdate(newStatus: DeliveryStatus) {
    if (!delivery) return;
    if (!navigator.onLine) {
      setUpdateError("Reconnect before changing trip status. Your note and PIN will stay on this screen.");
      return;
    }
    if (
      newStatus === "cancelled" &&
      !window.confirm("Cancel this trip? This cannot be undone.")
    ) return;

    setUpdating(newStatus);
    setUpdateError("");
    try {
      const res = await fetch("/api/driver/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_id: delivery.id,
          status: newStatus,
          note: note || undefined,
          pin: newStatus === "delivered" && delivery.require_pin ? deliveryPin : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setUpdateError(data.message || "Update failed."); return; }
      setNote("");
      setDeliveryPin("");
      setShowNote(false);
      await load();
    } catch {
      setUpdateError("Something went wrong. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return <div className="driver-detail"><section className="trip-detail-panel trip-detail-empty" role="status"><Truck size={30} aria-hidden="true" /><h1>Loading your delivery</h1><p>Getting the route and delivery details.</p></section></div>;
  }

  if (error || !delivery) {
    return <div className="driver-detail"><Link href="/driver" className="trip-back"><ArrowLeft size={16} />All deliveries</Link><section className="trip-detail-panel trip-detail-empty" role="alert"><h1>Unable to load delivery</h1><p>{error || "This delivery is unavailable."}</p><button className="trip-button" onClick={() => void load()}>Try again</button></section></div>;
  }

  const nextStatuses = VALID_TRANSITIONS[delivery.status] ?? [];
  const isTerminal = nextStatuses.length === 0;
  const primaryNext = nextStatuses.filter(status => status !== "cancelled")[0];
  const canCancel = nextStatuses.includes("cancelled");
  const pickupNext = delivery.status === "assigned";
  const headline = isTerminal
    ? delivery.status === "delivered" ? "Delivery complete." : "This delivery has ended."
    : pickupNext ? "Head to pickup." : delivery.status === "picked_up" ? "Ready for the road." : "On to the drop-off.";
  const statusDescription = isTerminal
    ? delivery.status === "delivered" ? "The parcel has reached its recipient." : `This delivery is ${STATUS_LABELS[delivery.status].toLowerCase()}.`
    : pickupNext ? "Collect the parcel, then confirm pickup below." : delivery.status === "picked_up" ? "Start the delivery when you’re ready to leave." : "Complete the delivery once the parcel is handed over.";

  return (
    <div className="driver-detail">
      <Link href="/driver" className="trip-back"><ArrowLeft size={16} />All deliveries</Link>
      <header className="trip-detail-header"><div><span className="trip-eyebrow">DELIVERY DETAILS</span><h1>{headline}</h1><p>{statusDescription}</p></div><div className="trip-reference"><span>Tracking number</span><strong>{delivery.tracking_number}</strong></div></header>

      <div className="trip-detail-grid">
        <div className="trip-detail-main">
          <section className="trip-detail-panel" aria-labelledby="trip-route-title">
            <div className="trip-section-heading"><h2 id="trip-route-title">Your route</h2><Navigation size={20} aria-hidden="true" /></div>
            <ol className="trip-route-stops">
              {(["pickup", "dropoff"] as const).map(stop => {
                const pickup = stop === "pickup";
                const name = pickup ? delivery.pickup_contact_name : delivery.recipient_name;
                const phone = pickup ? delivery.pickup_contact_phone : delivery.recipient_phone;
                const address = pickup
                  ? fmt([delivery.pickup_street, delivery.pickup_suburb, delivery.pickup_city, delivery.pickup_province, delivery.pickup_postal_code])
                  : fmt([delivery.dropoff_street, delivery.dropoff_suburb, delivery.dropoff_city, delivery.dropoff_province, delivery.dropoff_postal_code]);
                const notes = pickup ? delivery.pickup_notes : delivery.dropoff_notes;
                return <li key={stop}>
                  <span className={`trip-stop-marker${pickup ? " is-pickup" : ""}`} aria-hidden="true" />
                  <div className="trip-stop-content"><span className="trip-eyebrow">{pickup ? "PICKUP" : "DROP-OFF"}</span><h3>{pickup ? delivery.pickup_street : delivery.dropoff_street}</h3><p>{address}</p>
                    <div className="trip-stop-contact"><span>{name || "Contact not provided"}</span>{phone && <a href={`tel:${phone}`}><Phone size={14} aria-hidden="true" />{phone}</a>}</div>
                    {notes && <p className="trip-stop-note">{notes}</p>}
                    <a className="trip-directions" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" />Directions to {pickup ? "pickup" : "drop-off"}<ArrowRight size={14} aria-hidden="true" /><span className="sr-only"> (opens Google Maps in a new tab)</span></a>
                  </div>
                </li>;
              })}
            </ol>
          </section>

          <section className="trip-detail-panel"><div className="trip-section-heading"><h2>Parcel details</h2><Package size={20} aria-hidden="true" /></div>
            <dl className="trip-info"><div><dt>Description</dt><dd>{delivery.parcel_description || "Not provided"}</dd></div>{delivery.special_instructions && <div><dt>Instructions</dt><dd>{delivery.special_instructions}</dd></div>}{delivery.fragile && <div><dt>Handling</dt><dd>Fragile · handle with care</dd></div>}{delivery.require_pin && <div><dt>Handover</dt><dd>{delivery.pin_verified_at ? "Recipient PIN verified" : "Recipient PIN required"}</dd></div>}</dl>
          </section>
          <section className="trip-detail-panel"><div className="trip-section-heading"><h2>Customer</h2></div><div className="trip-customer"><strong>{delivery.customer_name}</strong>{delivery.customer_phone && <a href={`tel:${delivery.customer_phone}`}><Phone size={15} aria-hidden="true" />{delivery.customer_phone}</a>}</div></section>
        </div>

        <aside className="trip-action-panel" aria-label="Delivery status and actions">
          <div className="trip-action-status"><span className="trip-eyebrow">{isTerminal ? "FINAL STATUS" : "CURRENT STATUS"}</span>{isTerminal && delivery.status === "delivered" ? <CheckCircle2 size={23} aria-hidden="true" /> : <Truck size={23} aria-hidden="true" />}</div>
          <h2>{STATUS_LABELS[delivery.status]}</h2>
          <p>{statusDescription}</p>
          {!isTerminal && <>
            <div className="trip-next-stop"><span className="trip-eyebrow">{pickupNext ? "PICKUP ADDRESS" : "DROP-OFF ADDRESS"}</span><strong>{pickupNext ? delivery.pickup_street : delivery.dropoff_street}</strong><p>{pickupNext ? delivery.pickup_city : delivery.dropoff_city}</p></div>
            {updateError && <p className="trip-action-error" role="alert">{updateError}</p>}
            {!online && <p className="trip-offline" role="status">Status actions are paused until you reconnect. Your note and PIN will stay on this screen.</p>}
            <button className="trip-note-toggle" onClick={() => setShowNote(value => !value)} aria-expanded={showNote} aria-controls="trip-note-field">{showNote ? "Hide note" : "Add a note (optional)"}</button>
            {showNote && <div id="trip-note-field" className="trip-field"><label htmlFor="trip-update-note">Delivery note</label><textarea id="trip-update-note" value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Add a pickup or delivery update…" /></div>}
            {primaryNext === "delivered" && delivery.require_pin && <div className="trip-field trip-pin-field"><label htmlFor="delivery-pin"><ShieldCheck size={16} aria-hidden="true" />Recipient handover PIN</label><input id="delivery-pin" value={deliveryPin} onChange={event => setDeliveryPin(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit PIN" aria-describedby="delivery-pin-help" /><p id="delivery-pin-help">Ask the recipient for their emailed PIN. Complete delivery only after handover.</p></div>}
            {primaryNext && <button className="trip-button trip-primary" onClick={() => handleStatusUpdate(primaryNext)} disabled={!online || updating !== null || (primaryNext === "delivered" && delivery.require_pin && deliveryPin.length !== 6)}>{updating === primaryNext ? "Updating…" : ACTION_LABELS[primaryNext] ?? `Mark as ${STATUS_LABELS[primaryNext]}`}<ArrowRight size={17} aria-hidden="true" /></button>}
            {canCancel && <button className="trip-button trip-cancel" onClick={() => handleStatusUpdate("cancelled")} disabled={!online || updating !== null}>{updating === "cancelled" ? "Cancelling…" : "Cancel delivery"}</button>}
          </>}
          {isTerminal && <Link href="/driver" className="trip-button trip-primary">Back to deliveries<ArrowRight size={17} aria-hidden="true" /></Link>}
        </aside>
      </div>
    </div>
  );
}
