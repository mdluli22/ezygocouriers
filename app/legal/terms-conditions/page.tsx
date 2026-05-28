import type { Metadata } from "next";
import Link from "next/link";
import ScrollToTop from "@/components/scrollToTop";

export const metadata: Metadata = {
  title: "Terms & Conditions | EzyGo Couriers",
  description:
    "The terms governing your use of EzyGo Couriers' website, app, and delivery services — written to be clear and fair.",
};

interface TermSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const termSections: TermSection[] = [
  {
    id: "what-these-cover",
    title: "What these terms cover",
    content: (
      <>
        <p>
          These Terms and Conditions ("Terms") govern your access to and use of EzyGo Couriers
          (Pty) Ltd ("EzyGo", "we", "us", "our") website, web and mobile applications, and courier
          and delivery services.
        </p>
        <p className="mt-3">
          We&apos;re a Durban-based South African company committed to transparent, reliable
          last-mile delivery — and these Terms help ensure everyone (senders, receivers, drivers)
          has a clear understanding. By booking or using our services, you accept these Terms.
        </p>
      </>
    ),
  },
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <div className="bg-[#F5F3EF] rounded-lg p-5 text-[13px] space-y-1.5">
        <p>
          <span className="font-medium text-[#1A1714]">Company:</span> EzyGo Couriers (Pty) Ltd
        </p>
        <p>
          <span className="font-medium text-[#1A1714]">Registration:</span> [Insert Registration
          Number]
        </p>
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
          <span className="font-medium text-[#1A1714]">Address:</span> [Insert Physical Address]
        </p>
      </div>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility & Account",
    content: (
      <>
        <p>
          You must be 18 years or older and have legal capacity to use our services. When creating
          an account, you agree to:
        </p>
        <ul className="list-none mt-3 space-y-1">
          {[
            "Provide accurate and truthful information",
            "Keep your login credentials secure",
            "Notify us immediately of any unauthorized access",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-[#7A7670]">
          We are not responsible for losses resulting from your failure to protect your account
          credentials.
        </p>
      </>
    ),
  },
  {
    id: "delivery-services",
    title: "Our Delivery Services",
    content: (
      <>
        <p>
          We offer on-demand and scheduled parcel deliveries. When booking, you confirm that the
          contents are lawful, accurately described, and that all details provided are correct. We
          may refuse or inspect any parcel at our discretion.
        </p>
      </>
    ),
  },
  {
    id: "prohibited-items",
    title: "Prohibited Items",
    content: (
      <>
        <p className="mb-3">The following items may not be sent via EzyGo under any circumstances:</p>
        <ul className="list-none space-y-1">
          {[
            "Illegal substances or stolen goods",
            "Firearms, weapons, or explosives",
            "Hazardous or dangerous materials",
            "Live animals",
            "Perishables (unless pre-agreed in writing)",
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
    id: "pricing-payment",
    title: "Pricing & Payment",
    content: (
      <>
        <ul className="list-none space-y-1 mb-4">
          {[
            "A clear price is shown before you confirm your booking (starting at R100 base fee)",
            "Payment via Ozow, card, or other approved methods — required before or upon service",
            "We may adjust pricing; changes apply to future bookings only",
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
    id: "cancellations",
    title: "Cancellations",
    content: (
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {[
          {
            who: "You",
            text: "You may cancel any time before driver dispatch. After assignment or dispatch, a cancellation fee may apply.",
          },
          {
            who: "EzyGo",
            text: "We may cancel for incorrect parcel details, prohibited items, payment issues, or safety reasons.",
          },
        ].map((item) => (
          <div key={item.who} className="bg-[#F5F3EF] rounded-lg p-4">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#E85A1B] mb-2">
              Cancellation by {item.who}
            </p>
            <p className="text-[13px] text-[#7A7670] leading-[1.7]">{item.text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "liability",
    title: "Delivery, Risk & Liability",
    content: (
      <>
        <p>
          Risk passes to the recipient (or per your instructions) on delivery. We are not liable for
          delays caused by traffic, weather, force majeure, incorrect addresses, or recipient
          absence.
        </p>
        <p className="mt-3">
          To the extent allowed by the Consumer Protection Act (CPA), our liability is limited to
          the delivery fee or declared parcel value — whichever is lower. We have no liability for
          indirect or consequential losses.
        </p>
        <p className="mt-3 text-[13px] text-[#7A7670]">
          Nothing in these Terms limits rights you hold under the CPA or where exclusion is
          prohibited by law.
        </p>
      </>
    ),
  },
  {
    id: "your-responsibilities",
    title: "Your Responsibilities",
    content: (
      <p>
        You indemnify EzyGo against any claims, losses, or damages arising from unlawful parcel
        contents, inaccurate information you provide, or your breach of these Terms.
      </p>
    ),
  },
  {
    id: "refunds",
    title: "Refunds & Consumer Rights",
    content: (
      <>
        <p>
          Refunds may be issued for services not rendered, duplicate charges, or errors on our
          part. Eligible refunds are processed within 7–14 business days.
        </p>
        <p className="mt-3">
          As a CPA consumer, you have rights to fair terms, advance booking cancellation under
          section 17 of the CPA, and the ability to raise complaints with the National Consumer
          Commission.
        </p>
      </>
    ),
  },
  {
    id: "other-terms",
    title: "Other Important Terms",
    content: (
      <div className="space-y-4">
        {[
          {
            label: "Privacy",
            text: "Your use of EzyGo is also governed by our Privacy Policy, which is incorporated into these Terms by reference.",
          },
          {
            label: "Intellectual Property",
            text: "All content, logos, and branding belong to EzyGo Couriers (Pty) Ltd. No unauthorised use is permitted.",
          },
          {
            label: "Force Majeure",
            text: "We have no liability for events beyond our reasonable control, including load shedding, civil unrest, or natural disasters.",
          },
          {
            label: "Suspension",
            text: "We may suspend or terminate your access for violations of these Terms or suspected fraudulent activity.",
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
  {
    id: "disputes",
    title: "Disputes & Governing Law",
    content: (
      <>
        <p>
          We prefer to resolve any issues directly and amicably. If a dispute cannot be resolved
          informally, these Terms are governed by South African law and the courts of South Africa
          have jurisdiction.
        </p>
        <p className="mt-3">
          Consumers may also approach the National Consumer Commission for assistance.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    content: (
      <p>
        We may update these Terms from time to time. Any changes will be posted on this page with
        a revised "last updated" date. Your continued use of EzyGo after changes are posted
        constitutes your acceptance of the updated Terms.
      </p>
    ),
  },
];

export default function TermsPage() {
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
          Terms &amp; Conditions
        </h1>
        <p className="text-[15px] font-light text-white/55 max-w-[480px] leading-[1.75]">
          When you use EzyGo, you&apos;re agreeing to these terms. We&apos;ve written them to be
          clear and fair — outlining what we provide, your responsibilities, and how we work
          together. Please read them carefully.
        </p>
        <div className="inline-flex items-center gap-2 mt-8 bg-[rgba(232,90,27,0.12)] border border-[rgba(232,90,27,0.25)] rounded-full px-4 py-2 text-[12px] font-medium text-[#F97316]">
          Last updated: February 2026
        </div>
      </section>

      {/* ── ACCEPTANCE BANNER ── */}
      <div className="bg-[#E85A1B]/10 border-b border-[#E85A1B]/20 px-10 py-4">
        <p className="text-[13px] text-[#7A7670] max-w-[860px]">
          <span className="font-medium text-[#1A1714]">Important: </span>
          By booking or using our delivery services, you confirm that you have read, understood, and
          agreed to these Terms and Conditions.
        </p>
      </div>

      {/* ── LAYOUT ── */}
      <div className="max-w-[1100px] mx-auto px-10 py-16 flex gap-12 items-start max-lg:flex-col max-lg:gap-0">
        {/* Sticky nav */}
        <aside className="w-56 flex-shrink-0 sticky top-8 max-lg:hidden">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#7A7670] mb-4">
            Contents
          </p>
          <nav className="space-y-1">
            {termSections.map((s) => (
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
          {termSections.map((s, idx) => (
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
                Need clarification?
              </h3>
              <p className="text-[13px] text-white/50">
                Reach our team — we&apos;re happy to explain any part of these Terms.
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
                href="/privacy"
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