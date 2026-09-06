import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ScrollToTop from "@/components/scrollToTop";

export const metadata: Metadata = {
  title: "Cookie Policy | EzyGo Couriers",
  description:
    "How EzyGo Couriers uses cookies and similar technologies on our website and app — and how you can manage them.",
};

interface CookieType {
  name: string;
  purpose: string;
  duration: string;
  essential: boolean;
}

const cookieTypes: CookieType[] = [
  {
    name: "Session cookies",
    purpose: "Keep you logged in while you navigate the app. Required for core functionality.",
    duration: "End of browser session",
    essential: true,
  },
  {
    name: "Authentication token",
    purpose: "Store your secure JWT session so you stay authenticated between page visits.",
    duration: "7 days",
    essential: true,
  },
  {
    name: "CSRF protection",
    purpose: "Prevent cross-site request forgery attacks on form submissions.",
    duration: "Session",
    essential: true,
  },
  {
    name: "Preference cookies",
    purpose: "Remember your settings such as language and display preferences.",
    duration: "30 days",
    essential: false,
  },
  {
    name: "Analytics cookies",
    purpose: "Help us understand how visitors use our platform so we can improve the experience.",
    duration: "Up to 12 months",
    essential: false,
  },
  {
    name: "Performance cookies",
    purpose: "Measure page load times and errors to keep the platform running smoothly.",
    duration: "Up to 6 months",
    essential: false,
  },
];

interface PolicySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: PolicySection[] = [
  {
    id: "what-are-cookies",
    title: "What are cookies?",
    content: (
      <>
        <p>
          Cookies are small text files placed on your device when you visit a website or use a web
          app. They allow the site to remember information about your visit — such as whether
          you&apos;re logged in, your preferences, or how you interact with our platform.
        </p>
        <p className="mt-3">
          Similar technologies like local storage and session storage work in a comparable way and
          are covered by this policy. We refer to all of these collectively as "cookies".
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use cookies",
    content: (
      <>
        <p>EzyGo uses cookies to:</p>
        <ul className="list-none mt-3 space-y-1.5">
          {[
            "Keep you securely signed in during your session",
            "Protect your account from unauthorised actions",
            "Remember your preferences across visits",
            "Understand how our platform is used so we can improve it",
            "Measure and improve page load performance",
            "Comply with legal and security obligations",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-[#7A7670]">
          We do not use cookies to serve third-party advertising or sell your data to any external
          parties.
        </p>
      </>
    ),
  },
  {
    id: "types-of-cookies",
    title: "Types of cookies we use",
    content: (
      <div className="space-y-3 -mx-1">
        {cookieTypes.map((c) => (
          <div
            key={c.name}
            className="rounded-lg border border-black/8 p-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-[13px] font-medium text-[#1A1714]">{c.name}</p>
                <span
                  className={`text-[10px] font-semibold tracking-[0.1em] uppercase rounded-full px-2.5 py-0.5 ${
                    c.essential
                      ? "bg-[rgba(232,90,27,0.10)] text-[#E85A1B]"
                      : "bg-[#F5F3EF] text-[#7A7670]"
                  }`}
                >
                  {c.essential ? "Essential" : "Optional"}
                </span>
              </div>
              <p className="text-[13px] text-[#7A7670] leading-[1.65]">{c.purpose}</p>
            </div>
            <div className="flex-shrink-0 text-right max-sm:text-left">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#7A7670] mb-0.5">
                Duration
              </p>
              <p className="text-[12px] text-[#1A1714] font-medium whitespace-nowrap">
                {c.duration}
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "third-party",
    title: "Third-party cookies",
    content: (
      <>
        <p>
          Some cookies may be set by trusted third-party services we use to run EzyGo, such as
          payment processors (Ozow) and cloud infrastructure providers. These third parties have
          their own privacy and cookie policies, and we recommend reviewing them.
        </p>
        <p className="mt-3">
          We do not permit third-party advertising networks to place cookies through our platform.
        </p>
      </>
    ),
  },
  {
    id: "managing-cookies",
    title: "Managing your cookies",
    content: (
      <>
        <p>
          You have control over non-essential cookies. You can manage or disable cookies through
          your browser settings. Note that disabling essential cookies will affect your ability to
          sign in and use the platform.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          {[
            {
              browser: "Google Chrome",
              path: "Settings → Privacy and security → Cookies",
            },
            {
              browser: "Mozilla Firefox",
              path: "Settings → Privacy & Security → Cookies",
            },
            {
              browser: "Safari",
              path: "Preferences → Privacy → Manage Website Data",
            },
            {
              browser: "Microsoft Edge",
              path: "Settings → Cookies and site permissions",
            },
          ].map((b) => (
            <div key={b.browser} className="bg-[#F5F3EF] rounded-lg p-4">
              <p className="text-[12px] font-semibold text-[#1A1714] mb-1">{b.browser}</p>
              <p className="text-[12px] text-[#7A7670] leading-snug">{b.path}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "consent",
    title: "Your consent",
    content: (
      <>
        <p>
          When you first visit EzyGo, we ask for your consent to use non-essential cookies. You
          may withdraw this consent at any time by adjusting your browser settings or contacting
          us directly.
        </p>
        <p className="mt-3">
          Essential cookies do not require your consent as they are strictly necessary for the
          platform to function securely and correctly. This is consistent with POPIA and the
          Electronic Communications and Transactions Act (ECTA).
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this Cookie Policy from time to time to reflect changes in technology, law,
        or how we operate. Any updates will be posted on this page with a revised "last updated"
        date. Continued use of EzyGo after changes are posted constitutes your acceptance.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <main
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="bg-[#F5F3EF] text-[#1A1714] overflow-x-hidden"
    >
      {/* ── BRAND BAR ── */}
      <div className="flex items-center justify-between bg-[#1A1714] px-6 pt-6 sm:px-10">
        <BrandLogo variant="dark" size="sm" priority />
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] font-medium text-white/50 hover:text-white transition-colors group"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
          >
            <path
              d="M10 3L5 8L10 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* ── HERO ── */}
      <section className="bg-[#1A1714] px-10 pt-16 pb-20 relative overflow-hidden">
        <span className="absolute right-[-60px] top-[-60px] w-[360px] h-[360px] rounded-full border border-[rgba(232,90,27,0.18)] pointer-events-none" />
        <span className="absolute right-[-20px] top-[-20px] w-[200px] h-[200px] rounded-full border border-[rgba(232,90,27,0.30)] pointer-events-none" />

        <p className="flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#E85A1B] mb-6">
          <span className="inline-block w-7 h-px bg-[#E85A1B]" />
          Legal
        </p>
        <h1
          style={{ fontFamily: "'Syne', sans-serif" }}
          className="text-[clamp(32px,5vw,50px)] font-extrabold leading-[1.1] text-white max-w-[560px] mb-5"
        >
          Cookie Policy
        </h1>
        <p className="text-[15px] font-light text-white/55 max-w-[480px] leading-[1.75]">
          We use cookies to keep EzyGo secure, functional, and improving. This page explains
          exactly what we use, why, and how you can manage your preferences.
        </p>
        <div className="inline-flex items-center gap-2 mt-8 bg-[rgba(232,90,27,0.12)] border border-[rgba(232,90,27,0.25)] rounded-full px-4 py-2 text-[12px] font-medium text-[#F97316]">
          Last updated: February 2026
        </div>
      </section>

      {/* ── QUICK SUMMARY STRIP ── */}
      <div className="bg-white border-b border-black/8 px-10 py-6">
        <div className="max-w-[860px] flex flex-wrap gap-6">
          {[
            { label: "Essential cookies", value: "3 types", accent: true },
            { label: "Optional cookies", value: "3 types", accent: false },
            { label: "Ad cookies", value: "None", accent: false },
            { label: "Data sold", value: "Never", accent: false },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span
                style={{ fontFamily: "'Syne', sans-serif" }}
                className={`text-[18px] font-bold ${s.accent ? "text-[#E85A1B]" : "text-[#1A1714]"}`}
              >
                {s.value}
              </span>
              <span className="text-[12px] text-[#7A7670]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className="max-w-[1100px] mx-auto px-10 py-16 flex gap-12 items-start max-lg:flex-col max-lg:gap-0">
        {/* Sticky nav */}
        <aside className="w-56 flex-shrink-0 sticky top-8 max-lg:hidden">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#7A7670] mb-4">
            Contents
          </p>
          <nav className="space-y-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-[13px] text-[#7A7670] hover:text-[#E85A1B] py-1 transition-colors leading-snug"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <article className="flex-1 min-w-0 space-y-6">
          {sections.map((s, idx) => (
            <div
              key={s.id}
              id={s.id}
              className="bg-white rounded-xl border border-black/8 p-8"
            >
              <div className="flex items-start gap-4 mb-5">
                <span
                  style={{ fontFamily: "'Syne', sans-serif" }}
                  className="text-[11px] font-bold text-[rgba(232,90,27,0.4)] tracking-[0.08em] mt-1 flex-shrink-0"
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h2
                  style={{ fontFamily: "'Syne', sans-serif" }}
                  className="text-[18px] font-bold text-[#1A1714] leading-snug"
                >
                  {s.title}
                </h2>
              </div>
              <div className="pl-8 text-[14px] font-light leading-[1.85] text-[#7A7670]">
                {s.content}
              </div>
            </div>
          ))}

          {/* Footer links */}
          <div className="bg-[#1A1714] rounded-xl p-8 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
            <div>
              <h3
                style={{ fontFamily: "'Syne', sans-serif" }}
                className="text-[16px] font-bold text-white mb-1"
              >
                Questions about cookies?
              </h3>
              <p className="text-[13px] text-white/50">
                Get in touch — we&apos;re happy to explain how we use your data.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a
                href="mailto:support@ezygo.co.za"
                className="text-[13px] font-medium bg-[#E85A1B] text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Contact us
              </a>
              <a
                href="/legal/privacy-policy"
                className="text-[13px] font-medium bg-white/8 text-white border border-white/15 px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </article>
      </div>
      <ScrollToTop />
    </main>
  );
}
