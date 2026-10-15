"use client";

import { useEffect, useState } from "react";
import Navbar         from "@/components/landing/Navbar";
import HeroSection    from "@/components/landing/HeroSection";
import HowItWorks     from "@/components/landing/HowItWorks";
import PricingSection from "@/components/landing/PricingSection";
import { CTABanner, Footer, WhyEzyGo } from "@/components/landing/sections";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="landing-page">
      <div className="coming-soon-banner" role="region" aria-label="Announcement">
        <span className="sr-only">EzyGo Couriers coming soon</span>
        <div className="coming-soon-track" aria-hidden="true">
          {[0, 1].map((group) => (
            <div className="coming-soon-group" key={group}>
              {[0, 1, 2].map((item) => (
                <span key={item}>EzyGo is coming soon</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Navbar scrolled={scrolled} />
      <HeroSection />
      <HowItWorks />
      <WhyEzyGo />
      <PricingSection />
      <CTABanner />
      <Footer />
    </main>
  );
}
