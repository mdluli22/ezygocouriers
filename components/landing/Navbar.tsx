"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import Image from "next/image";

export default function Navbar({ scrolled }: { scrolled: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const navBg = scrolled
    ? isDark
      ? "rgba(10,26,26,0.95)"
      : "rgba(238,246,246,0.95)"
    : "transparent";

  const navBorder = scrolled
    ? isDark ? "1px solid rgba(47,79,79,0.4)" : "1px solid rgba(47,79,79,0.14)"
    : "none";

  const linkColor  = isDark ? "rgba(255,255,255,0.72)" : "rgba(13,36,36,0.65)";
  const logoText   = isDark ? "#FFFFFF" : "#0D2424";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ backgroundColor: navBg, backdropFilter: scrolled ? "blur(14px)" : "none", borderBottom: navBorder }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/EzyGoIcon.png"
            alt="EzyGo Logo"
            width={190}
            height={90}
            priority
            className="object-contain"
          />
          {/* <span className="font-black text-xl tracking-tight" style={{ color: logoText }}>EzyGo</span> */}
        </div>

        {/* Nav links */}

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "How it works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
            { label: "About", href: "../legal/aboutus" },
            // { label: "Contact", href: "#contact" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-opacity hover:opacity-100"
              style={{ color: linkColor, opacity: 0.7 }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(47,79,79,0.1)",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(47,79,79,0.18)",
              color: isDark ? "#FFFFFF" : "#0D2424",
            }}
          >
            {isDark ? (
              /* Sun icon */
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              /* Moon icon */
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>

          <Link
            href="/auth/signup"
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}
          >
            Get started
          </Link>

          {/* Sign in dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              type="button"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-100 px-3 py-2 rounded-xl"
              style={{
                color: linkColor,
                backgroundColor: dropdownOpen
                  ? isDark ? "rgba(255,255,255,0.08)" : "rgba(47,79,79,0.08)"
                  : "transparent",
              }}
            >
              {/* Mobile: show compact user icon; Desktop: full text */}
              <span className="hidden sm:inline">Sign in</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 max-w-[90vw] rounded-2xl shadow-xl overflow-hidden z-50"
                style={{
                  backgroundColor: isDark ? "#0F2020" : "#FFFFFF",
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(47,79,79,0.12)",
                }}
              >
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-bold uppercase tracking-widest px-2 mb-1" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(13,36,36,0.4)" }}>
                    Sign in as
                  </p>
                </div>
                {[
                  { label: "Customer",  href: "/auth/login",   desc: "Book deliveries" },
                  { label: "Driver",    href: "/driver/login",  desc: "Manage your trips" },
                  { label: "Admin",     href: "/admin/login",   desc: "Platform management" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.85)" : "#0D2424",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(47,79,79,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                  >
                    {/* <span className="text-lg leading-none">{item.icon}</span> */}
                    <div>
                      <p className="text-sm font-semibold leading-tight">{item.label}</p>
                      <p className="text-xs leading-tight" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(13,36,36,0.45)" }}>
                        {item.desc}
                      </p>
                    </div>
                    <svg className="w-3.5 h-3.5 ml-auto shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
                <div className="px-4 py-3 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(47,79,79,0.08)" }}>
                  <Link
                    href="/auth/signup"
                    onClick={() => setDropdownOpen(false)}
                    className="text-xs font-semibold"
                    style={{ color: "#F59E0B" }}
                  >
                    No account? Sign up free →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}
