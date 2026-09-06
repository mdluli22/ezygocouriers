"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  MapPin,
  MapPinned,
  Navigation,
  PackagePlus,
} from "lucide-react";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="process-section how-section">
      <div className="landing-shell">
        <div className="how-heading">
          <div>
            <span className="section-kicker">Simple process</span>
            <h2>How EzyGo <em>works.</em></h2>
          </div>
          <div>
            <p>Four straightforward steps. One smooth delivery from your door to theirs.</p>
            <span className="how-heading-note"><Check size={15} /> Entirely online from booking to tracking</span>
          </div>
        </div>

        <div className="how-bento">
          <article className="how-card how-card-route">
            <div className="how-card-top">
              <span className="how-step-number">01</span>
              <span className="how-card-icon"><MapPinned size={23} /></span>
            </div>
            <span className="how-card-label">Choose the route</span>
            <h3>Add your addresses.</h3>
            <p>Tell us where to collect and where the parcel needs to go.</p>

            <div className="address-preview" aria-hidden="true">
              <div className="address-rail"><i /><span /><i /></div>
              <div>
                <small>Pick up</small>
                <strong>Sea Point, Cape Town</strong>
              </div>
              <div>
                <small>Drop off</small>
                <strong>Woodstock, Cape Town</strong>
              </div>
              <MapPin className="address-pin" size={22} />
            </div>
          </article>

          <article className="how-card how-card-parcel">
            <div className="how-card-top">
              <span className="how-step-number">02</span>
              <span className="how-card-icon"><PackagePlus size={22} /></span>
            </div>
            <span className="how-card-label">Parcel details</span>
            <h3>Tell us about it.</h3>
            <p>Add the essentials and any helpful notes for your driver.</p>
            <div className="parcel-preview" aria-hidden="true">
              <span>Small parcel</span><span>Handle with care</span>
            </div>
          </article>

          <article className="how-card how-card-payment">
            <div className="how-card-top">
              <span className="how-step-number">03</span>
              <span className="how-card-icon"><CreditCard size={22} /></span>
            </div>
            <span className="how-card-label">Secure checkout</span>
            <h3>Confirm your price.</h3>
            <p>Review the clear total and pay securely through PayFast.</p>
            <div className="payment-preview" aria-hidden="true">
              <span>Flat delivery fee</span><strong>R99.00</strong>
            </div>
          </article>

          <article className="how-card how-card-track">
            <div className="how-track-copy">
              <div className="how-card-top">
                <span className="how-step-number">04</span>
                <span className="how-card-icon"><Navigation size={22} /></span>
              </div>
              <span className="how-card-label">Live progress</span>
              <h3>Follow every step.</h3>
              <p>Stay updated from successful collection through to the final handover.</p>
            </div>

            <div className="delivery-preview" aria-hidden="true">
              <div className="delivery-preview-head">
                <span>Delivery status</span><strong><i /> In transit</strong>
              </div>
              <div className="delivery-progress"><i /><i /><i /><i /></div>
              <div className="delivery-labels">
                <span>Booked</span><span>Assigned</span><span>Collected</span><span>Delivered</span>
              </div>
            </div>
          </article>
        </div>

        <div className="how-footer">
          <p><strong>That&apos;s it.</strong> No complicated forms, confusing calculations, or follow-up calls.</p>
          <Link href="/auth/signup">Start a delivery <ArrowRight size={17} /></Link>
        </div>
      </div>
    </section>
  );
}
