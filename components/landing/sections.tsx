"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BellRing,
  Check,
  Clock3,
  FileText,
  Gift,
  LockKeyhole,
  MapPin,
  Package,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

export function WhyEzyGo() {
  return (
    <section className="value-section">
      <div className="landing-shell">
        <div className="value-heading">
          <span className="section-kicker">Built around your peace of mind</span>
          <h2>The city moves fast.<br /><em>So does EzyGo.</em></h2>
          <p>Clear pricing, useful updates, and a delivery experience designed for everyday Cape Town life.</p>
        </div>

        <div className="value-grid">
          <article className="value-card value-card-tracking">
            <div className="value-card-copy">
              <span className="value-icon"><MapPin size={21} /></span>
              <span className="value-label">Live visibility</span>
              <h3>Know where it is.<br />Every step of the way.</h3>
              <p>Follow progress from collection through to the final handover.</p>
            </div>
            <div className="tracking-preview" aria-hidden="true">
              <div className="tracking-preview-top">
                <span><i /> Driver en route</span>
                <small>Live</small>
              </div>
              <div className="tracking-map">
                <span className="tracking-road road-one" />
                <span className="tracking-road road-two" />
                <i className="tracking-dot dot-one" />
                <i className="tracking-dot dot-two" />
                <span className="tracking-vehicle"><PackageCheck size={18} /></span>
              </div>
              <div className="tracking-timeline">
                <span className="complete"><Check size={11} /> Booked</span>
                <span className="complete"><Check size={11} /> Collected</span>
                <span className="active"><i /> In transit</span>
              </div>
            </div>
          </article>

          <article className="value-card value-card-amber">
            <span className="value-icon"><Clock3 size={21} /></span>
            <span className="value-label">Less friction</span>
            <h3>Book in minutes.</h3>
            <p>A focused flow that gets your parcel moving without unnecessary calls or calculations.</p>
          </article>

          <article className="value-card value-card-cream">
            <span className="value-icon"><ShieldCheck size={21} /></span>
            <span className="value-label">Protected checkout</span>
            <h3>Pay with confidence.</h3>
            <p>Secure PayFast payment and a clear total before you confirm.</p>
            <span className="secure-pill"><LockKeyhole size={13} /> Secure checkout</span>
          </article>

          <article className="value-card value-card-green">
            <span className="value-icon"><BellRing size={21} /></span>
            <span className="value-label">Useful updates</span>
            <h3>No wondering.<br />No chasing.</h3>
            <p>See the milestones that matter, from pickup to doorstep.</p>
          </article>
        </div>

        <div className="parcel-strip">
          <span>Made for everyday sends</span>
          <div><FileText size={17} /> Documents</div>
          <div><ShoppingBag size={17} /> Online orders</div>
          <div><Gift size={17} /> Gifts</div>
          <div><Package size={17} /> Essentials</div>
        </div>
      </div>
    </section>
  );
}

export function CTABanner() {
  return (
    <section className="closing-section">
      <div className="landing-shell closing-card">
        <div className="closing-route" aria-hidden="true">
          <MapPin size={19} />
          <span />
          <PackageCheck size={22} />
        </div>
        <div className="closing-copy">
          <span className="section-kicker">Ready when you are</span>
          <h2>Your parcel has places to be.</h2>
          <p>Create your free EzyGo account and book your first Cape Town delivery in minutes.</p>
        </div>
        <div className="closing-actions">
          <Link href="/auth/signup" className="closing-primary">
            Get started free <ArrowRight size={19} />
          </Link>
          <Link href="/auth/login" className="closing-secondary">I have an account</Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-shell">
        <div className="footer-main">
          <div className="footer-brand">
            <Link href="/" className="brand-lockup footer-logo" aria-label="EzyGo home">
              <span className="brand-logo-surface footer-logo-surface">
                <Image src="/GoLogo.png" alt="" width={98} height={27} />
              </span>
              <span className="brand-name">EzyGo</span>
            </Link>
            <p>Simple, reliable courier delivery across Cape Town.</p>
            <span className="footer-location"><MapPin size={14} /> Cape Town, South Africa</span>
          </div>

          <div className="footer-links">
            <div>
              <strong>Explore</strong>
              <Link href="#how-it-works">How it works</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="/auth/signup">Create an account</Link>
            </div>
            <div>
              <strong>Company</strong>
              <Link href="/legal/aboutus">About us</Link>
              <Link href="/auth/login">Customer sign in</Link>
              <Link href="/driver/login">Driver sign in</Link>
            </div>
            <div>
              <strong>Legal</strong>
              <Link href="/legal/terms-conditions">Terms & conditions</Link>
              <Link href="/legal/privacy-policy">Privacy policy</Link>
              <Link href="/legal/cookies">Cookie policy</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} EzyGo Couriers. All rights reserved.</span>
          <span><LockKeyhole size={14} /> Secure payments by PayFast</span>
        </div>
      </div>
    </footer>
  );
}
