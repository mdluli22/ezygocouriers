"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { ChevronDown, UserRound } from "lucide-react";

export default function Navbar({ scrolled }: { scrolled: boolean }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeDropdown(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("touchstart", closeDropdown);
    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("touchstart", closeDropdown);
    };
  }, []);

  return (
    <nav className={`landing-nav ${scrolled ? "is-scrolled" : ""}`} aria-label="Main navigation">
      <div className="landing-shell nav-inner">
        <BrandLogo priority />

        <div className="nav-links">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/legal/aboutus">About</Link>
        </div>

        <div className="nav-actions">
          <div className="signin-menu" ref={dropdownRef}>
            <button
              type="button"
              className="signin-trigger"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-label="Sign in options"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              <UserRound size={17} />
              <span>Sign in</span>
              <ChevronDown size={15} className={dropdownOpen ? "rotate-icon" : ""} />
            </button>

            {dropdownOpen && (
              <div className="signin-dropdown" role="menu">
                <span className="signin-label">Continue as</span>
                <Link href="/auth/login" onClick={() => setDropdownOpen(false)} role="menuitem">
                  <strong>Customer</strong>
                </Link>
                <Link href="/driver/login" onClick={() => setDropdownOpen(false)} role="menuitem">
                  <strong>Driver</strong>
                </Link>
              </div>
            )}
          </div>

          <Link href="/auth/signup" className="nav-cta">Get started</Link>
        </div>
      </div>
    </nav>
  );
}
