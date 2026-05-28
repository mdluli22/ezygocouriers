"use client";

import { useTheme } from "@/components/ThemeProvider";

// export function StatsSection() {
//   const { theme } = useTheme();
//   const isDark = theme === "dark";
//   const bg   = isDark ? "#0a1a1a"  : "#F1F5F9";
//   const val  = isDark ? "#4a9090"  : "#2F4F4F";
//   const lbl  = isDark ? "#64748B"  : "#64748B";

//   // const stats = [
//   //   { value: "R99",  label: "Flat fee always" },
//   //   { value: "4",    label: "Delivery status updates" },
//   //   { value: "100%", label: "Transparent pricing" },
//   //   { value: "24/7", label: "Order anytime" },
//   // ];
//   // return (
//   //   <section className="py-16 px-6" style={{ backgroundColor: bg }}>
//   //     <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
//   //       {stats.map((s) => (
//   //         <div key={s.label} className="text-center">
//   //           <p className="text-5xl font-black leading-none mb-2" style={{ color: val }}>{s.value}</p>
//   //           <p className="text-sm font-medium" style={{ color: lbl }}>{s.label}</p>
//   //         </div>
//   //       ))}
//   //     </div>
//   //   </section>
//   // );
// }

// export function Testimonials() {
//   const { theme } = useTheme();
//   const isDark = theme === "dark";
//   const bg        = isDark ? "#0d1f1f"          : "#FFFFFF";
//   const cardBg    = isDark ? "#0f2424"          : "#F8FAFC";
//   const cardBord  = isDark ? "#1e3535"          : "#E2E8F0";
//   const quoteCol  = isDark ? "rgba(255,255,255,0.58)" : "#475569";
//   const nameBord  = isDark ? "#1e3535"          : "#E2E8F0";
//   const nameCol   = isDark ? "#4a9090"          : "#2F4F4F";
//   const roleCol   = isDark ? "#4a6060"          : "#94A3B8";
//   const headCol   = isDark ? "#4a9090"          : "#2F4F4F";

//   // const reviews = [
//   //   { name: "Thabo M.",  role: "Small business owner, Johannesburg", avatar: "TM", rating: 5, text: "EzyGo is the most straightforward courier service I've used. Book it, pay R99, done. No calling around for quotes." },
//   //   { name: "Priya N.",  role: "Online seller, Durban",               avatar: "PN", rating: 5, text: "The tracking is brilliant. My customers love being able to see exactly where their order is. Real-time updates are a game changer." },
//   //   { name: "Ruan V.",   role: "Freelancer, Cape Town",               avatar: "RV", rating: 5, text: "I was sending documents across town and expected to pay double. R99 flat? I've booked five deliveries this month already." },
//   // ];

//   // return (
//   //   <section className="py-24 px-6" style={{ backgroundColor: bg }}>
//   //     <div className="max-w-5xl mx-auto">
//   //       <div className="text-center mb-14">
//   //         <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F59E0B" }}>Customer stories</p>
//   //         <h2 className="text-4xl font-black leading-tight" style={{ color: headCol, letterSpacing: "-0.02em" }}>People love EzyGo</h2>
//   //       </div>
//   //       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//   //         {reviews.map((r) => (
//   //           <div key={r.name} className="rounded-2xl p-6 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-lg" style={{ border: `1px solid ${cardBord}`, backgroundColor: cardBg }}>
//   //             <div className="flex gap-1">
//   //               {Array.from({ length: r.rating }).map((_, i) => (
//   //                 <svg key={i} className="w-4 h-4" style={{ color: "#F59E0B" }} viewBox="0 0 20 20" fill="currentColor">
//   //                   <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
//   //                 </svg>
//   //               ))}
//   //             </div>
//   //             <p className="text-sm leading-relaxed flex-1" style={{ color: quoteCol }}>&ldquo;{r.text}&rdquo;</p>
//   //             <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: nameBord }}>
//   //               <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#2F4F4F" }}>{r.avatar}</div>
//   //               <div>
//   //                 <p className="text-sm font-bold" style={{ color: nameCol }}>{r.name}</p>
//   //                 <p className="text-xs" style={{ color: roleCol }}>{r.role}</p>
//   //               </div>
//   //             </div>
//   //           </div>
//   //         ))}
//   //       </div>
//   //     </div>
//   //   </section>
//   // );
// }

export function CTABanner() {
  // CTA is always dark-on-brand — intentionally not theme-inverted
  return (
    <section className="py-24 px-6 relative overflow-hidden" style={{ backgroundColor: "#1A2F2F" }}>
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-5" style={{ backgroundColor: "#F59E0B" }} />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-5" style={{ backgroundColor: "#F59E0B" }} />
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-5xl font-black text-white mb-6 leading-none" style={{ letterSpacing: "-0.03em" }}>
          Ready to send<br /><span style={{ color: "#F59E0B" }}>your first parcel?</span>
        </h2>
        <p className="text-small mb-10" style={{ color: "rgba(255,255,255,0.6)" }}>Sign up free in 30 seconds. No credit card required to get started.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/auth/signup" className="px-8 py-4 rounded-xl font-black text-lg transition-all hover:scale-105 hover:shadow-xl" style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}>
            Create free account →
          </a>
          <a href="/auth/login" className="px-8 py-4 rounded-xl font-bold text-lg border-2 text-white transition-all hover:bg-white hover:text-gray-900" style={{ borderColor: "rgba(255,255,255,0.3)" }}>
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
}

// Footer for the landing page
export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bg        = isDark ? "#0D1F1F"               : "#0D2424";
  const border    = isDark ? "rgba(61,102,102,0.3)"  : "rgba(61,102,102,0.25)";
  const bodyText  = isDark ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.45)";
  const linkText  = isDark ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.42)";
  const badgeBg   = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.07)";
  const badgeBord = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.1)";

  return (
    <footer className="py-12 px-6 border-t" style={{ backgroundColor: bg, borderColor: border }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}>E</div>
              <span className="font-black text-xl text-white tracking-tight">EzyGo</span>
            </div>
            <p className="text-sm" style={{ color: bodyText }}>Fast, reliable courier delivery across Cape Town. One flat fee — no surprises.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            {[
              { heading: "Product", links: [
                { label: "How it works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
                { label: "Sign up", href: "/auth/signup" }, 
              ]},
              
              { heading: "Company", links: [
                { label: "About us", href: "../legal/aboutus" },
                { label: "Careers", href: "../legal/careers" },
                { label: "Contact", href: "../legal/contact" },
                ]},

              { heading: "Legal",   links: [
                { label: "Terms of Service", href: "../legal/terms-conditions" },
                { label: "Privacy Policy", href: "../legal/privacy-policy" },
                { label: "Cookie Policy", href: "../legal/cookies" },
              ]},
            ].map((col) => (
              <div key={col.heading}>
                <p className="font-bold mb-3 text-xs uppercase tracking-widest" style={{ color: "#F59E0B" }}>{col.heading}</p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}><a href={l.href} className="transition-opacity hover:opacity-100" style={{ color: linkText }}>{l.label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t gap-4" style={{ borderColor: border }}>
          <p className="text-xs" style={{ color: bodyText }}>© {new Date().getFullYear()} EzyGo. All rights reserved. Built in South Africa 🇿🇦</p>
          <div className="flex items-center gap-4">
            {["PayFast", "SSL Secured"].map((b) => (
              <span key={b} className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: badgeBg, color: bodyText, border: `1px solid ${badgeBord}` }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
