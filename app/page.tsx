"use client";

import { useEffect, useState } from "react";
import Navbar         from "@/components/landing/Navbar";
import HeroSection    from "@/components/landing/HeroSection";
import HowItWorks     from "@/components/landing/HowItWorks";
import PricingSection from "@/components/landing/PricingSection";
import { StatsSection, Testimonials, CTABanner, Footer } from "@/components/landing/sections";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main>
      <Navbar scrolled={scrolled} />
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <PricingSection />
      <Testimonials />
      <CTABanner />
      <Footer />
    </main>
  );
}
