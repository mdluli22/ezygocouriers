"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar({ scrolled }: { scrolled: boolean }) {
  const { theme, toggle } = useTheme();
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
        <Link href="/" className="brand-lockup" aria-label="EzyGo home">
          <span className="brand-logo-surface">
            <Image src="/GoLogo.png" alt="" width={92} height={25} priority />
          </span>
          <span className="brand-name">EzyGo</span>
        </Link>

        <div className="nav-links">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/legal/aboutus">About</Link>
        </div>

        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggle} aria-label="Toggle colour theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="signin-menu" ref={dropdownRef}>
            <button
              type="button"
              className="signin-trigger"
              onClick={() => setDropdownOpen((open) => !open)}
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
                  <small>Book and track deliveries</small>
                </Link>
                <Link href="/driver/login" onClick={() => setDropdownOpen(false)} role="menuitem">
                  <strong>Driver</strong>
                  <small>View and manage trips</small>
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
