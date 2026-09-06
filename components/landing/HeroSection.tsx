"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider } from "@vis.gl/react-google-maps";
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AddressAutocomplete, { PlaceResult } from "@/components/ui/AddressAutocomplete";

export default function HeroSection() {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupPlace, setPickupPlace] = useState<PlaceResult | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceResult | null>(null);

  function handleQuote(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set("pickup", pickup);
    if (dropoff) params.set("dropoff", dropoff);
    if (pickupPlace) {
      params.set("pickupLat", String(pickupPlace.lat));
      params.set("pickupLng", String(pickupPlace.lng));
    }
    if (dropoffPlace) {
      params.set("dropoffLat", String(dropoffPlace.lat));
      params.set("dropoffLng", String(dropoffPlace.lng));
    }
    router.push(`/auth/signup?${params.toString()}`);
  }

  function swapAddresses() {
    setPickup(dropoff);
    setDropoff(pickup);
    setPickupPlace(dropoffPlace);
    setDropoffPlace(pickupPlace);
  }

  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      libraries={["places"]}
      version="weekly"
    >
      <section className="landing-hero">
        <div className="hero-noise" aria-hidden="true" />
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />

        <div className="landing-shell hero-layout">
          <div className="hero-copy">
            <div className="eyebrow-pill">
              <Sparkles size={15} strokeWidth={2.4} />
              Cape Town&apos;s simple courier service
            </div>

            <h1>
              From your door
              <span>to theirs. Fast.</span>
            </h1>

            <p className="hero-lede">
              Reliable same-city delivery without the complicated quotes. Book in minutes,
              pay one flat fee, and follow your parcel all the way.
            </p>

            <div className="hero-actions">
              <a href="#quick-quote" className="hero-primary-action">
                Book a delivery <ArrowRight size={18} />
              </a>
              <a href="#how-it-works" className="hero-secondary-action">
                See how it works
              </a>
            </div>

            <div className="hero-assurances" aria-label="Service benefits">
              <span><ShieldCheck size={17} /> Secure payment</span>
              <span><Clock3 size={17} /> Real-time updates</span>
              <span><MapPin size={17} /> Cape Town-wide</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="route-backdrop" aria-hidden="true">
              <div className="route-grid" />
              <div className="route-line route-line-one" />
              <div className="route-line route-line-two" />
              <span className="route-pin route-pin-start"><MapPin size={17} /></span>
              <span className="route-pin route-pin-end"><Navigation size={17} /></span>
            </div>

            <div className="delivery-status-card" aria-hidden="true">
              <span className="status-icon"><PackageCheck size={20} /></span>
              <span>
                <small>Delivery status</small>
                <strong>Driver en route</strong>
              </span>
              <span className="status-live"><i /> Live</span>
            </div>

            <div id="quick-quote" className="quote-card">
              <div className="quote-card-heading">
                <div>
                  <span className="quote-kicker">Quick quote</span>
                  <h2>Where can we take it?</h2>
                </div>
                <div className="flat-fee-badge">
                  <small>Flat fee</small>
                  <strong>R99</strong>
                </div>
              </div>

              <form onSubmit={handleQuote} className="quote-form">
                <div className="route-inputs">
                  <div className="route-rail" aria-hidden="true">
                    <i />
                    <span />
                    <i />
                  </div>

                  <label className="quote-field">
                    <span>Pick-up address</span>
                    <AddressAutocomplete
                      value={pickup}
                      onChange={setPickup}
                      onPlaceSelect={(place) => {
                        setPickupPlace(place);
                        setPickup(place.address);
                      }}
                      placeholder="e.g. Sea Point, Cape Town"
                      className="quote-autocomplete"
                    />
                  </label>

                  <button
                    type="button"
                    className="swap-addresses"
                    onClick={swapAddresses}
                    aria-label="Swap pick-up and drop-off addresses"
                  >
                    <ArrowDownUp size={16} />
                  </button>

                  <label className="quote-field">
                    <span>Drop-off address</span>
                    <AddressAutocomplete
                      value={dropoff}
                      onChange={setDropoff}
                      onPlaceSelect={(place) => {
                        setDropoffPlace(place);
                        setDropoff(place.address);
                      }}
                      placeholder="e.g. Woodstock, Cape Town"
                      className="quote-autocomplete"
                    />
                  </label>
                </div>

                <button type="submit" className="quote-submit">
                  Get started for R99 <ArrowRight size={19} />
                </button>

                <p className="quote-footnote">
                  <Check size={15} /> No hidden charges. Pay securely with PayFast.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </APIProvider>
  );
}
