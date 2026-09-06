"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  MapPin,
  MapPinned,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

export default function PricingSection() {
  return (
    <section id="pricing" className="pricing-section pricing-redesign pricing-bento-section">
      <div className="pricing-orb" aria-hidden="true" />
      <div className="landing-shell">
        <div className="pricing-redesign-head">
          <div>
            <span className="section-kicker section-kicker-light">Transparent pricing</span>
            <h2>One delivery.<br /><em>One clear price.</em></h2>
          </div>
          <p>
            No quote calculators or unexpected additions. Eligible deliveries within our
            Cape Town service area stay refreshingly simple.
          </p>
        </div>

        <div className="price-bento">
          <article className="price-bento-card price-bento-main">
            <div className="price-bento-topline">
              <span>Flat delivery fee</span>
              <PackageCheck size={23} />
            </div>
            <div className="price-bento-amount">
              <sup>R</sup><strong>99</strong><small>.00</small>
            </div>
            <p>Per eligible delivery across our Cape Town coverage area.</p>
            <div className="price-bento-stamp"><Check size={13} /> No monthly fee</div>
          </article>

          <article className="price-bento-card price-bento-included">
            <div className="price-bento-card-head">
              <span><ShieldCheck size={20} /></span>
              <small>Included as standard</small>
            </div>
            <h3>Everything needed<br />for a smooth delivery.</h3>
            <ul>
              <li><Check size={15} /> Collection and delivery</li>
              <li><Check size={15} /> Live status tracking</li>
              <li><Check size={15} /> Secure PayFast checkout</li>
              <li><Check size={15} /> Clear delivery updates</li>
            </ul>
          </article>

          <article className="price-bento-card price-bento-coverage">
            <div>
              <span className="price-bento-icon"><MapPinned size={20} /></span>
              <small>Cape Town-wide simplicity</small>
              <h3>No distance calculations.</h3>
              <p>One rate wherever your eligible delivery starts and ends inside our service area.</p>
            </div>
            <div className="coverage-route" aria-hidden="true">
              <MapPin size={15} /><i /><span><PackageCheck size={16} /></span><i /><MapPin size={15} />
            </div>
          </article>

          <article className="price-bento-card price-bento-action">
            <span className="price-bento-icon"><CreditCard size={21} /></span>
            <small>Ready when you are</small>
            <h3>Send it for R99.</h3>
            <p>Create your account free and book your first delivery.</p>
            <Link href="/auth/signup">
              Get started <ArrowRight size={18} />
            </Link>
          </article>
        </div>

        <p className="pricing-fineprint">
          Clear from the start: the confirmed amount is shown before secure checkout.
        </p>
      </div>
    </section>
  );
}
