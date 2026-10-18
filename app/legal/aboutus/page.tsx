import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CreditCard, MapPin, Package, Route, ShieldCheck, Truck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import "./about.css";

export const metadata: Metadata = {
  title: "About EzyGo Couriers",
  description: "Get to know EzyGo, the Cape Town courier service for easy parcel booking, secure Yoco payments, and delivery tracking.",
};

const commitments = [
  { title: "Simple booking", icon: Package },
  { title: "Clear pricing", icon: CreditCard },
  { title: "Delivery updates", icon: Route },
  { title: "Secure checkout", icon: ShieldCheck },
];

const audiences = [
  { label: "For customers", title: "Send with EzyGo.", icon: Package, items: ["Book a pickup in our Cape Town service area", "Review your delivery quote before paying", "Pay securely through Yoco", "Follow your parcel’s delivery status"], href: "/dashboard/deliveries/new", action: "Book a delivery" },
  { label: "For drivers", title: "Your deliveries, organised.", icon: Truck, items: ["View assigned deliveries in your driver portal", "Open pickup and drop-off directions", "Share your location when you are available", "Update trip status and confirm handovers"], href: "/driver/login", action: "Driver sign in" },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-header landing-shell">
        <BrandLogo priority />
        <Link href="/" className="about-home"><ArrowLeft size={16} aria-hidden="true" />Back to home</Link>
      </header>
      <main className="landing-shell">
        <section className="about-hero" aria-labelledby="about-title">
          <div className="about-hero-title">
            <span className="section-kicker">About EzyGo</span>
            <h1 id="about-title">Your city.<br />Your people.<br /><em>Your delivery.</em></h1>
          </div>
          <div className="about-hero-intro">
            <p>For the parcels that keep your business growing and your everyday life moving.</p>
            <span className="about-location"><MapPin size={16} aria-hidden="true" />Cape Town, South Africa</span>
            <Link className="about-primary" href="/dashboard/deliveries/new">Send a parcel<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>

        </section>
        <figure className="about-team-photo">
          <Image src="/images/about-courier-team.webp" alt="Two courier colleagues preparing a parcel beside a delivery van on a Cape Town street" fill sizes="(max-width: 1200px) 100vw, 1200px" />
          <figcaption><span>Rooted in Cape Town.</span><span>Built around your day.</span></figcaption>
        </figure>
        <section className="about-story" aria-labelledby="about-purpose">
          <div><span className="section-kicker">Our purpose</span><h2 id="about-purpose">Keep your day moving.</h2></div>
          <p>EzyGo connects people and businesses with parcel delivery across Cape Town. We bring booking, payment, and delivery updates into one place, with a dedicated workspace for drivers.</p>
        </section>
        <section className="about-commitments" aria-label="What you can expect">
          {commitments.map(({title,icon:Icon}, index) => <div key={title} className="about-commitment"><span className="about-commitment-number">0{index + 1}</span><Icon size={22} aria-hidden="true" /><h2>{title}</h2></div>)}
        </section>
        <section className="about-audiences" aria-label="EzyGo for customers and drivers">
          {audiences.map(({label,title,icon:Icon,items,href,action}) => <article key={label} className="about-audience">
            <div className="about-audience-top"><span className="section-kicker">{label}</span><Icon size={25} aria-hidden="true" /></div>
            <h2>{title}</h2>
            <ul>{items.map(item => <li key={item}><Check size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul>
            <Link href={href}>{action}<ArrowRight size={17} aria-hidden="true" /></Link>
          </article>)}
        </section>
        <section className="about-contact" aria-labelledby="about-contact-title">
          <div className="about-contact-copy"><span className="section-kicker">Let’s get moving</span><h2 id="about-contact-title">Good things<br /><em>are on the way.</em></h2></div>
          <div><a href="mailto:support@ezygocouriers.co.za" className="about-primary">Contact us<ArrowRight size={17} aria-hidden="true" /></a><a href="mailto:support@ezygocouriers.co.za?subject=Driver%20application" className="about-secondary">Become a driver</a></div>
        </section>
      </main>
      <footer className="about-footer landing-shell">
        <span>© {new Date().getFullYear()} EzyGo Couriers</span>
        <nav aria-label="Legal policies"><Link href="/legal/privacy-policy">Privacy</Link><Link href="/legal/cookies">Cookies</Link><Link href="/legal/terms-conditions">Terms & conditions</Link></nav>
      </footer>
    </div>
  );
}
