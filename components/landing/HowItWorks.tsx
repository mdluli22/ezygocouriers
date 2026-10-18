"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  { title: "Add your addresses.", description: "Tell us where to collect your parcel and where it needs to go." },
  { title: "Tell us about your parcel.", description: "Add the parcel details and any special handling instructions." },
  { title: "Confirm and pay securely.", description: "Review your delivery price before paying through Yoco." },
  { title: "Follow every step.", description: "Track your delivery from booking through to the final handover." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="process-section how-section">
      <div className="landing-shell">
        <div className="how-heading">
          <div>
            <span className="section-kicker">Simple process</span>
            <h2>How EzyGo <em>works.</em></h2>
          </div>
        </div>

        <div className="how-editorial-layout">
          <div className="how-editorial-copy">
            <ol className="how-editorial-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="how-editorial-number" aria-hidden="true">0{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/auth/signup" className="how-editorial-cta">
              Start a delivery <ArrowRight size={18} />
            </Link>
          </div>

          <figure className="how-editorial-photo">
            <Image
              src="/images/flower-delivery.webp"
              alt="Courier delivering a bouquet of fresh flowers to a customer at her Cape Town home"
              fill
              sizes="(max-width: 760px) 100vw, 55vw"
            />
            <figcaption>You book it.<br />We take it from here.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
