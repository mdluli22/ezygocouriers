"use client";

import PublishedPrice from "@/components/PublishedPrice";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export default function PricingSection() {
  return (
    <section id="pricing" className="pricing-section pricing-redesign">
      <div className="landing-shell">
        <div className="pricing-redesign-head">
          <div>
            <span className="section-kicker section-kicker-light">Transparent pricing</span>
            <h2>One delivery.<br /><em>One clear price.</em></h2>
          </div>
        </div>

        <div className="pricing-photo-layout">
          <figure className="pricing-photo">
            <Image
              src="/images/pricing-parcel.webp"
              alt="A wrapped parcel ready for delivery on a sunlit studio counter"
              fill
              sizes="(max-width: 760px) 100vw, 55vw"
            />
            <figcaption>Ready to go.<br />One clear price.</figcaption>
          </figure>

          <div className="pricing-photo-copy">
            <span className="pricing-photo-label">Flat delivery fee</span>
            <div className="pricing-photo-amount"><PublishedPrice /></div>
            <p>Per eligible delivery across our Cape Town coverage area. No distance calculations. No monthly fee.</p>

            <h3>Everything needed for a smooth delivery.</h3>
            <ul>
              <li><Check size={17} /> Collection and delivery</li>
              <li><Check size={17} /> Live status tracking</li>
              <li><Check size={17} /> Secure Yoco checkout</li>
              <li><Check size={17} /> Clear delivery updates</li>
            </ul>

            <Link href="/auth/signup" className="pricing-photo-cta">
              Get started <ArrowRight size={18} />
            </Link>
            <p className="pricing-photo-note">The confirmed amount is shown before secure checkout.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
