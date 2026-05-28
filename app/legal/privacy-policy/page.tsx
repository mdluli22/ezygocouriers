import type { Metadata } from "next";
import Link from "next/link";
import ScrollToTop from "@/components/scrollToTop";

export const metadata: Metadata = {
  title: "Privacy Policy | EzyGo Couriers",
  description:
    "How EzyGo Couriers collects, uses, and protects your personal information in line with POPIA and South African law.",
};

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "what-this-covers",
    title: "What this policy covers",
    content: (
      <>
        <p>
          This Privacy Policy explains how EzyGo Couriers (Pty) Ltd ("EzyGo", "we", "us", "our")
          collects, uses, shares, and protects personal information when you use our website, app,
          or delivery services. We comply with the Protection of Personal Information Act (POPIA),
          the Electronic Communications and Transactions Act (ECTA), and other applicable South
          African laws.
        </p>
        <p className="mt-3">
          We&apos;re proudly based in Durban, KwaZulu-Natal, and built to serve individuals,
          businesses, and drivers across South Africa with secure, reliable package delivery.
        </p>
      </>
    ),
  },
  {
    id: "responsible-party",
    title: "Who we are (Responsible Party)",
    content: (
      <>
        <p>EzyGo Couriers (Pty) Ltd is the Responsible Party under POPIA.</p>
        <div className="mt-4 bg-[#F5F3EF] rounded-lg p-5 text-[13px] space-y-1.5">
          <p>
            <span className="font-medium text-[#1A1714]">Email:</span>{" "}
            <a href="mailto:support@ezygo.co.za" className="text-[#E85A1B] underline">
              support@ezygo.co.za
            </a>
          </p>
          <p>
            <span className="font-medium text-[#1A1714]">Phone:</span> [Insert Phone Number]
          </p>
          <p>
            <span className="font-medium text-[#1A1714]">Address:</span> [Insert Business Address]
          </p>
          <p>
            <span className="font-medium text-[#1A1714]">Information Officer:</span> [Insert Name]
          </p>
        </div>
      </>
    ),
  },
  {
    id: "information-collected",
    title: "Personal information we collect",
    content: (
      <>
        <p className="font-medium text-[#1A1714] mb-2">Identity &amp; Contact</p>
        <ul className="list-none space-y-1 mb-5">
          {[
            "Full name",
            "Email address",
            "Phone number",
            "Pickup and delivery addresses",
            "ID number (for verification when required)",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="font-medium text-[#1A1714] mb-2">Account &amp; Usage</p>
        <ul className="list-none space-y-1">
          {[
            "Login credentials (encrypted)",
            "Order history & delivery status",
            "Payment status & method (we don't store full card details)",
            "Technical data (IP address, device, browser, cookies)",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "how-we-collect",
    title: "How we collect and why we use it",
    content: (
      <>
        <p>
          We collect information when you create an account, book deliveries, make payments, contact
          support, or through cookies and analytics.
        </p>
        <p className="mt-3 font-medium text-[#1A1714]">We use it to:</p>
        <ul className="list-none mt-2 space-y-1">
          {[
            "Provide and track your deliveries",
            "Process payments and send confirmations and updates",
            "Manage accounts and verify users",
            "Improve our platform and prevent fraud",
            "Comply with legal obligations",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-[#7A7670]">
          Legal bases under POPIA: your consent, contract performance, legal obligations, or our
          legitimate interests.
        </p>
      </>
    ),
  },
  {
    id: "who-we-share-with",
    title: "Who we share it with",
    content: (
      <>
        <ul className="list-none space-y-1 mb-4">
          {[
            "Assigned drivers (for delivery fulfillment)",
            "Payment providers (Ozow, etc.)",
            "Hosting, IT, and cloud providers (e.g., AfriHost)",
            "Authorities when legally required",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="text-[13px] font-medium text-[#1A1714]">
          We never sell your data. All partners are required to protect it.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we keep it safe",
    content: (
      <>
        <ul className="list-none space-y-1 mb-4">
          {[
            "Encrypted connections (HTTPS/SSL)",
            "Encrypted passwords and secure authentication",
            "Role-based access controls",
            "Secure cloud hosting",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-[#7A7670]">
          No system is 100% secure, but we take reasonable steps to protect your information.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights under POPIA",
    content: (
      <>
        <p>You have the right to:</p>
        <ul className="list-none mt-2 space-y-1">
          {[
            "Access or correct your personal information",
            "Request deletion (where legally allowed)",
            "Object to or withdraw consent for processing",
            "Lodge a complaint with the Information Regulator",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "other-info",
    title: "Other important information",
    content: (
      <div className="space-y-5">
        {[
          {
            label: "Cookies",
            text: "We use cookies for sessions, performance, and analytics. You can manage them in your browser settings.",
          },
          {
            label: "Marketing",
            text: "We only send marketing with your consent or (for existing customers) unless you opt out. Unsubscribe anytime.",
          },
          {
            label: "Children",
            text: "Our services aren't for under-18s without parental consent. We don't knowingly collect minor data.",
          },
          {
            label: "Data breaches",
            text: "We'll notify you and the Regulator if required by law and take steps to limit harm.",
          },
          {
            label: "Cross-border transfers",
            text: "If data leaves South Africa, we ensure adequate protections or obtain your consent.",
          },
          {
            label: "Retention",
            text: "We keep data only as long as needed for services, legal or tax reasons, or disputes — then securely delete or anonymize.",
          },
        ].map((item) => (
          <div key={item.label} className="border-l-2 border-[rgba(232,90,27,0.3)] pl-4">
            <p className="font-medium text-[13px] text-[#1A1714] mb-1">{item.label}</p>
            <p className="text-[13px] text-[#7A7670] leading-[1.7]">{item.text}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="bg-[#F5F3EF] text-[#1A1714] overflow-x-hidden"
    >
      {/* ── BACK HOME BUTTON ── */}
      <div className="bg-[#1A1714] px-10 pt-6">
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
          Privacy Policy
        </h1>
        <p className="text-[15px] font-light text-white/55 max-w-[480px] leading-[1.75]">
          When you use EzyGo, you trust us with your personal information. We&apos;re committed to
          keeping that trust through clear, transparent data practices — in line with POPIA and
          South African law.
        </p>
        <div className="inline-flex items-center gap-2 mt-8 bg-[rgba(232,90,27,0.12)] border border-[rgba(232,90,27,0.25)] rounded-full px-4 py-2 text-[12px] font-medium text-[#F97316]">
          Last updated: February 2026
        </div>
      </section>

      {/* ── LAYOUT: sidebar nav + content ── */}
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
        <article className="flex-1 min-w-0 space-y-10">
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

          {/* Contact card */}
          <div className="bg-[#E85A1B] rounded-xl p-8 text-white">
            <h2
              style={{ fontFamily: "'Syne', sans-serif" }}
              className="text-[18px] font-bold mb-2"
            >
              Questions about your privacy?
            </h2>
            <p className="text-[14px] text-white/75 leading-[1.75] mb-5">
              Contact our Information Officer at any time. We&apos;re here to help.
            </p>
            <a
              href="mailto:support@ezygo.co.za"
              className="inline-block text-[13px] font-medium bg-white text-[#E85A1B] px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              support@ezygo.co.za
            </a>
          </div>
        </article>
      </div>
      <ScrollToTop />
    </main>
  );
}