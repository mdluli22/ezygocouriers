"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function PricingSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Pricing keeps a rich dark brand treatment in both modes —
  // light mode uses a slightly lighter teal, dark uses deep teal.
  const bg        = isDark ? "#0d2424"  : "#2F4F4F";
  const cardBg    = isDark ? "#0a1a1a"  : "#1A2F2F";
  const cardBord  = isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.35)";
  const featureBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)";
  const featBord  = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.1)";

  return (
    <section id="pricing" className="py-24 px-6" style={{ backgroundColor: bg }}>
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F59E0B" }}>Transparent pricing</p>
        <h2 className="text-4xl font-black text-white mb-4 leading-tight" style={{ letterSpacing: "-0.02em" }}>One price. No surprises.</h2>
        <p className="text-lg mb-16 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.65)" }}>
          We believe simple is better. Every delivery, anywhere in our coverage area.
        </p>

        <div className="relative inline-block rounded-3xl p-12 mb-16 shadow-2xl overflow-hidden" style={{ backgroundColor: cardBg, border: `1px solid ${cardBord}` }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-5" style={{ border: "40px solid #F59E0B" }} />
          <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Flat delivery fee</p>
          <div className="flex items-start justify-center gap-1">
            <span className="text-3xl font-black mt-4" style={{ color: "#F59E0B" }}>R</span>
            <span className="text-9xl font-black leading-none" style={{ color: "#F59E0B" }}>99</span>
            <span className="text-xl font-bold mt-6" style={{ color: "rgba(245,158,11,0.6)" }}>.00</span>
          </div>
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>per delivery · ZAR</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          {[
            { title: "No distance fees",     desc: "Same price across our whole coverage area." },
            { title: "No weight surcharges", desc: "Documents, parcels, packages — all R99." },
            { title: "No hidden charges",    desc: "What you see at quote is what you pay." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-5" style={{ backgroundColor: featureBg, border: `1px solid ${featBord}` }}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#F59E0B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-bold text-white">{f.title}</p>
              </div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
