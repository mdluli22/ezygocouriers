"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider } from "@vis.gl/react-google-maps";
import CityCanvas from "./CityCanvas";
import { useTheme } from "@/components/ThemeProvider";
import AddressAutocomplete, { PlaceResult } from "@/components/ui/AddressAutocomplete";

export default function HeroSection() {
  const router = useRouter();
  const { theme } = useTheme();
  const [pickup,  setPickup]  = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupPlace,  setPickupPlace]  = useState<PlaceResult | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceResult | null>(null);
  const [focused, setFocused] = useState<"pickup" | "dropoff" | null>(null);

  const isDark = theme === "dark";

  // ── Unified hero palette ───────────────────────────────────────────
  // All values are derived from a single base so everything matches.
  const heroBg        = isDark ? "#0D1F1F" : "#EEF6F6";
  const heroGradFrom  = isDark ? "#0D1F1F" : "#EEF6F6";
  const heroGradMid   = isDark ? "#0a1a1a" : "#e4f0f0";
  const heroGradTo    = isDark ? "#081414" : "#d6ebeb";
  const textPrimary   = isDark ? "#FFFFFF"          : "#0D2424";
  const textSecondary = isDark ? "rgba(255,255,255,0.62)" : "rgba(13,36,36,0.62)";
  const badgeBg       = isDark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.12)";
  const badgeBorder   = isDark ? "rgba(245,158,11,0.4)"  : "rgba(245,158,11,0.45)";
  const cardBg        = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.72)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.1)"  : "rgba(47,79,79,0.14)";
  const inputBg       = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.6)";
  const inputBgFocus  = isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)";
  const inputBorder   = isDark ? "rgba(255,255,255,0.12)" : "rgba(47,79,79,0.18)";
  const inputColor    = isDark ? "#FFFFFF" : "#0D2424";
  const dividerBg     = isDark ? "rgba(255,255,255,0.08)" : "rgba(47,79,79,0.1)";
  const swapBg        = isDark ? "rgba(245,158,11,0.18)"  : "rgba(245,158,11,0.12)";
  const priceBg       = isDark ? "rgba(245,158,11,0.1)"   : "rgba(245,158,11,0.08)";
  const priceBorder   = isDark ? "rgba(245,158,11,0.25)"  : "rgba(245,158,11,0.3)";
  const priceLabel    = isDark ? "rgba(255,255,255,0.5)"  : "rgba(13,36,36,0.5)";

  function handleQuote(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup)  params.set("pickup",  pickup);
    if (dropoff) params.set("dropoff", dropoff);
    if (pickupPlace)  { params.set("pickupLat",  String(pickupPlace.lat));  params.set("pickupLng",  String(pickupPlace.lng)); }
    if (dropoffPlace) { params.set("dropoffLat", String(dropoffPlace.lat)); params.set("dropoffLng", String(dropoffPlace.lng)); }
    router.push(`/auth/signup?${params.toString()}`);
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={["places"]}>
    <section
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: heroBg }}
    >
      {/*
        ── Unified hero gradient ───────────────────────────────────────
        One single gradient fills the whole section — the canvas is
        transparent so it renders on top of this same gradient.
      */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 72% 55%, ${isDark ? "rgba(47,79,79,0.28)" : "rgba(47,79,79,0.10)"} 0%, transparent 65%),
            linear-gradient(160deg, ${heroGradFrom} 0%, ${heroGradMid} 50%, ${heroGradTo} 100%)
          `,
        }}
      />

      {/*
        ── City canvas — full-bleed, transparent bg ───────────────────
        Its own stampEdgeFade() call fades all four edges into heroBg,
        so it looks like one continuous painted background.
      */}
      <div className="absolute inset-0 pointer-events-none">
        <CityCanvas fadeColor={heroBg} theme={theme} />
      </div>

      {/*
        ── Top & bottom vignette ─────────────────────────────────────
        Softens the sky and the bottom edge toward the next section.
      */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: `linear-gradient(to bottom,
            ${heroGradFrom} 0%,
            transparent 14%,
            transparent 78%,
            ${heroGradTo} 100%
          )`,
        }}
      />

      {/* ── Main layout row ─────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-6 pt-24 pb-16">

        {/* Left panel — content */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start justify-center lg:pr-10 max-w-xl mx-auto lg:mx-0">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8"
            style={{
              backgroundColor: badgeBg,
              border: `1px solid ${badgeBorder}`,
              color: "#F59E0B",
              animation: "pulse 3s ease-in-out infinite",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            Now delivering across South Africa · Flat R99
          </div>

          {/* Headline */}
          <h1
            className="text-center lg:text-left font-black leading-none mb-6"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 5rem)",
              color: textPrimary,
              textShadow: isDark ? "0 4px 40px rgba(0,0,0,0.5)" : "0 2px 20px rgba(13,36,36,0.08)",
              letterSpacing: "-0.03em",
            }}
          >
            Deliver anything.<br />
            <span style={{ color: "#F59E0B" }}>Anywhere.</span>
          </h1>

          {/* Sub-copy */}
          <p
            className="text-center lg:text-left max-w-lg mb-10 leading-relaxed"
            style={{ fontSize: "clamp(1rem, 1.6vw, 1.15rem)", color: textSecondary }}
          >
            Fast, reliable courier delivery with real-time tracking.
            One flat fee — no surprises, no calculations. Just send it.
          </p>

          {/* Booking card */}
          <div
            className="w-full rounded-2xl p-5 shadow-2xl"
            style={{
              backgroundColor: cardBg,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#F59E0B" }}
            >
              Get an instant quote
            </p>

            <form onSubmit={handleQuote} className="space-y-3">
              {/* Pickup */}
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 z-10"
                  style={{ borderColor: "#2F4F4F", backgroundColor: "#F59E0B" }}
                />
                <AddressAutocomplete
                  value={pickup}
                  onChange={setPickup}
                  onPlaceSelect={(p) => { setPickupPlace(p); setPickup(p.address); }}
                  onFocus={() => setFocused("pickup")}
                  onBlur={() => setFocused(null)}
                  placeholder="Pickup address"
                  inputStyle={{
                    width: "100%",
                    paddingLeft: "2.25rem",
                    paddingRight: "1rem",
                    paddingTop: "0.875rem",
                    paddingBottom: "0.875rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    outline: "none",
                    transition: "all 0.2s",
                    backgroundColor: focused === "pickup" ? inputBgFocus : inputBg,
                    border: `1.5px solid ${focused === "pickup" ? "#F59E0B" : inputBorder}`,
                    color: inputColor,
                  }}
                />
              </div>

              {/* Swap row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: dividerBg }} />
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: swapBg, border: `1px solid ${badgeBorder}` }}
                  onClick={() => {
                    const tAddr = pickup; setPickup(dropoff); setDropoff(tAddr);
                    const tPlace = pickupPlace; setPickupPlace(dropoffPlace); setDropoffPlace(tPlace);
                  }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <div className="flex-1 h-px" style={{ backgroundColor: dividerBg }} />
              </div>

              {/* Dropoff */}
              <div className="relative">
                <div
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 z-10"
                  style={{ borderColor: "#F59E0B", backgroundColor: "#2F4F4F" }}
                />
                <AddressAutocomplete
                  value={dropoff}
                  onChange={setDropoff}
                  onPlaceSelect={(p) => { setDropoffPlace(p); setDropoff(p.address); }}
                  onFocus={() => setFocused("dropoff")}
                  onBlur={() => setFocused(null)}
                  placeholder="Drop-off address"
                  inputStyle={{
                    width: "100%",
                    paddingLeft: "2.25rem",
                    paddingRight: "1rem",
                    paddingTop: "0.875rem",
                    paddingBottom: "0.875rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    outline: "none",
                    transition: "all 0.2s",
                    backgroundColor: focused === "dropoff" ? inputBgFocus : inputBg,
                    border: `1.5px solid ${focused === "dropoff" ? "#F59E0B" : inputBorder}`,
                    color: inputColor,
                  }}
                />
              </div>

              {/* Price + CTA */}
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="flex-1 rounded-xl px-4 py-3 text-center"
                  style={{ backgroundColor: priceBg, border: `1px solid ${priceBorder}` }}
                >
                  <p className="text-xs" style={{ color: priceLabel }}>Flat fee</p>
                  <p className="text-xl font-black" style={{ color: "#F59E0B" }}>R99.00</p>
                </div>
                <button
                  type="submit"
                  className="flex-[2] py-3.5 rounded-xl font-black text-base transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                  style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}
                >
                  Send a parcel →
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right spacer — city canvas shows through */}
        <div className="hidden lg:block lg:w-1/2" />
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex justify-center pb-8">
        <div
          className="flex flex-col items-center gap-2"
          style={{ opacity: 0.38, animation: "bounce 2s infinite" }}
        >
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: textPrimary }}>
            Scroll
          </span>
          <svg className="w-4 h-4" style={{ color: textPrimary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
    </APIProvider>
  );
}
