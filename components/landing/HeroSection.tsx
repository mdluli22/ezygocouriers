"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CityCanvas from "./CityCanvas";

export default function HeroSection() {
  const router = useRouter();
  const [pickup, setPickup]   = useState("");
  const [dropoff, setDropoff] = useState("");
  const [focused, setFocused] = useState<"pickup" | "dropoff" | null>(null);

  function handleQuote(e: React.FormEvent) {
    e.preventDefault();
    router.push("/auth/signup");
  }

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#0D1F1F" }}>
      <CityCanvas />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(13,31,31,0.7) 0%, rgba(13,31,31,0.2) 40%, rgba(13,31,31,0.6) 70%, rgba(13,31,31,0.95) 100%)" }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8 animate-pulse"
          style={{ backgroundColor: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B", animationDuration: "3s" }}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          Now delivering across South Africa · Flat R99
        </div>

        <h1
          className="text-center font-black leading-none mb-6"
          style={{ fontSize: "clamp(2.8rem, 8vw, 6rem)", color: "#FFFFFF", textShadow: "0 4px 40px rgba(0,0,0,0.5)", letterSpacing: "-0.03em" }}
        >
          Deliver anything.<br />
          <span style={{ color: "#F59E0B" }}>Anywhere.</span>
        </h1>

        <p className="text-center max-w-xl mb-10 leading-relaxed" style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(255,255,255,0.65)" }}>
          Fast, reliable courier delivery with real-time tracking. One flat fee — no surprises, no calculations. Just send it.
        </p>

        {/* Booking card */}
        <div className="w-full max-w-xl rounded-2xl p-5 shadow-2xl" style={{ backgroundColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#F59E0B" }}>Get an instant quote</p>

          <form onSubmit={handleQuote} className="space-y-3">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2" style={{ borderColor: "#2F4F4F", backgroundColor: "#F59E0B" }} />
              <input value={pickup} onChange={(e) => setPickup(e.target.value)} onFocus={() => setFocused("pickup")} onBlur={() => setFocused(null)} placeholder="Pickup address"
                className="w-full pl-9 pr-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none"
                style={{ backgroundColor: focused === "pickup" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)", border: focused === "pickup" ? "1.5px solid #F59E0B" : "1.5px solid rgba(255,255,255,0.1)", color: "#FFFFFF" }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)" }}
                onClick={() => { const t = pickup; setPickup(dropoff); setDropoff(t); }}
              >
                <svg className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
            </div>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2" style={{ borderColor: "#F59E0B", backgroundColor: "#2F4F4F" }} />
              <input value={dropoff} onChange={(e) => setDropoff(e.target.value)} onFocus={() => setFocused("dropoff")} onBlur={() => setFocused(null)} placeholder="Drop-off address"
                className="w-full pl-9 pr-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none"
                style={{ backgroundColor: focused === "dropoff" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)", border: focused === "dropoff" ? "1.5px solid #F59E0B" : "1.5px solid rgba(255,255,255,0.1)", color: "#FFFFFF" }}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 rounded-xl px-4 py-3 text-center" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Flat fee</p>
                <p className="text-xl font-black" style={{ color: "#F59E0B" }}>R99.00</p>
              </div>
              <button type="submit" className="flex-[2] py-3.5 rounded-xl font-black text-base transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}>
                Send a parcel →
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-6 mt-8 flex-wrap justify-center">
          {[{ icon: "🔒", label: "Secure payments" }, { icon: "📍", label: "Live tracking" }, { icon: "⚡", label: "Same-day delivery" }].map((b) => (
            <div key={b.label} className="flex items-center gap-2">
              <span className="text-base">{b.icon}</span>
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-8">
        <div className="flex flex-col items-center gap-2 opacity-40" style={{ animation: "bounce 2s infinite" }}>
          <span className="text-xs text-white font-medium tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}
