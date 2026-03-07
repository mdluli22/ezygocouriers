export default function HowItWorks() {
  const steps = [
    { num: "01", title: "Enter your addresses", desc: "Tell us where to pick up and where to deliver. Add parcel details and any special instructions.", icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) },
    { num: "02", title: "Confirm your R99 quote", desc: "One flat fee for every delivery. No distance calculations, no weight surcharges. Just R99.", icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
    { num: "03", title: "Pay securely via PayFast", desc: "Safe, encrypted payment processing. Card, EFT, or SnapScan — whatever works for you.", icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>) },
    { num: "04", title: "Track in real time", desc: "A driver is assigned and you can follow every step of the journey from pickup to doorstep.", icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>) },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6" style={{ backgroundColor: "#F8FAFC" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#F59E0B" }}>Simple process</p>
          <h2 className="text-4xl font-black leading-tight" style={{ color: "#2F4F4F", letterSpacing: "-0.02em" }}>How EzyGo works</h2>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: "#475569" }}>From booking to delivery in four simple steps.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.num} className="relative group">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(100%-8px)] w-full h-px z-0" style={{ backgroundColor: "#E2E8F0" }} />
              )}
              <div className="relative z-10 rounded-2xl p-6 h-full transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "#2F4F4F", color: "#F59E0B" }}>{s.icon}</div>
                <p className="text-4xl font-black mb-2 opacity-10" style={{ color: "#2F4F4F" }}>{s.num}</p>
                <h3 className="font-bold text-lg mb-2" style={{ color: "#2F4F4F" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
