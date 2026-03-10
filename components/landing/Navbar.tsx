"use client";

import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar({ scrolled }: { scrolled: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-lg" style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}>
            E
          </div>
          <span className="font-black text-xl tracking-tight" style={{ color: logoText }}>EzyGo</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {["How it works", "Pricing", "About", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
              className="text-sm font-medium transition-opacity hover:opacity-100"
              style={{ color: linkColor, opacity: undefined }}
            >
              {item}
            </a>
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
            href="/auth/login"
            className="text-sm font-semibold transition-opacity hover:opacity-100 hidden sm:block"
            style={{ color: linkColor }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105"
            style={{ backgroundColor: "#F59E0B", color: "#1A2F2F" }}
          >
            Get started
          </Link>
        </div>

      </div>
    </nav>
  );
}
