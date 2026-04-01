import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | EzyGo Couriers",
  description:
    "We reimagine how South Africa moves packages — for the better. Born in Cape Town, built for the way our communities actually live, work, and shop.",
};

const pillars = [
  {
    num: "01",
    title: "Speed",
    body: "Delivering when you need it — urgent same-day or scheduled. We respect your time as much as you do.",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" className="w-[18px] h-[18px]">
        <path
          d="M9 2L11.5 7H16L12.5 10.5L14 15.5L9 12.5L4 15.5L5.5 10.5L2 7H6.5L9 2Z"
          fill="#E85A1B"
        />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Reliability",
    body: "Every parcel tracked live, every status update clear, every hand-off accountable — no guesswork, no surprises.",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" className="w-[18px] h-[18px]">
        <circle cx="9" cy="9" r="6.5" stroke="#E85A1B" strokeWidth="1.5" />
        <path
          d="M6 9l2 2 4-4"
          stroke="#2F4F4F"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Accessibility",
    body: "Starting at just R100 — fair pricing for individuals and growing businesses throughout South Africa.",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" className="w-[18px] h-[18px]">
        <rect x="2" y="5" width="14" height="10" rx="2" stroke="#E85A1B" strokeWidth="1.5" />
        <path d="M6 5V4a3 3 0 016 0v1" stroke="#E85A1B" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Local innovation",
    body: "Built for South African roads, powered by real-time tech and genuine driver insight from the Western Cape and beyond.",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" className="w-[18px] h-[18px]">
        <path
          d="M9 2C5.134 2 2 5.134 2 9s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7z"
          stroke="#E85A1B"
          strokeWidth="1.5"
        />
        <path d="M9 5v4l2.5 2.5" stroke="#E85A1B" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const senderFeatures = [
  "Easy quoting in seconds",
  "Instant PayFast or card payments",
  "Live real-time tracking",
  "Clear statuses from pending to delivered",
];

const driverFeatures = [
  "Accept jobs that suit your schedule",
  "Share live location seamlessly",
  "Mark deliveries complete easily",
  "Dedicated driver portal",
];

export default function AboutPage() {
  return (
    <main
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="bg-[#F5F3EF] text-[#1A1714] overflow-x-hidden"
    >
      {/* ── HERO ── */}
      <section className="bg-[#1A1714] px-10 pt-[72px] pb-20 relative overflow-hidden">
        {/* decorative rings */}
        <span className="absolute right-[-60px] top-[-60px] w-[360px] h-[360px] rounded-full border border-[rgba(232,90,27,0.18)] pointer-events-none" />
        <span className="absolute right-[-20px] top-[-20px] w-[200px] h-[200px] rounded-full border border-[rgba(232,90,27,0.30)] pointer-events-none" />

        <p className="flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#2F4F4F] mb-6">
          <span className="inline-block w-7 h-px bg-[#2F4F4F]" />
          About EzyGo
        </p>

        <h1
          style={{ fontFamily: "'Syne', sans-serif" }}
          className="text-[clamp(36px,6vw,58px)] font-extrabold leading-[1.08] text-white max-w-[620px] mb-7"
        >
          We reimagine how South Africa{" "}
          <em className="not-italic text-[#2F4F4F]">moves</em> packages.
        </h1>

        <p className="text-[15px] font-light text-white/55 max-w-[480px] leading-[1.75]">
          Delivery is what powers us. It's in our DNA. Born in Cape Town — built for the way our
          communities actually live, work, and shop.
        </p>

        <div className="inline-flex items-center gap-1.5 mt-10 bg-[#0d2424] border border-[#2F4F4F] rounded-full px-[18px] py-2 text-[12px] font-medium text-[#2F4F4F] tracking-[0.04em]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2F4F4F]" />
          Proudly South African &nbsp;·&nbsp; Cape Town, Western Cape
        </div>
      </section>

      {/* ── STAT STRIP ── */}
      <div className="bg-[#0d2424] grid grid-cols-3 border-b border-black/6 max-sm:grid-cols-1">
        {[
          { num: "R99", label: "Flat base fee" },
          { num: "Live", label: "Real-time tracking" },
          { num: "SA", label: "Built local, built right" },
        ].map((s, i) => (
          <div
            key={i}
            className="py-7 px-8 text-center border-r border-white/20 last:border-r-0 max-sm:border-r-0 max-sm:border-b max-sm:last:border-b-0"
          >
            <span
              style={{ fontFamily: "'Syne', sans-serif" }}
              className="block text-[28px] font-extrabold text-white"
            >
              {s.num}
            </span>
            <span className="block text-[11px] font-medium text-white/72 tracking-[0.08em] uppercase mt-1">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── MESSAGE FROM THE TEAM ── */}
      <section className="bg-white px-10 py-16 border-t border-b border-black/8">
        <div className="max-w-[640px]">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E85A1B] mb-3">
            A message from the team
          </p>
          <h2
            style={{ fontFamily: "'Syne', sans-serif" }}
            className="text-[clamp(24px,4vw,34px)] font-bold leading-[1.18] text-[#1A1714] mb-4"
          >
            More than a courier service
          </h2>
          <p className="text-[14px] font-light leading-[1.85] text-[#7A7670]">
            At EzyGo, we&apos;re building a platform that connects people and businesses with
            reliable, tech-powered delivery. Our commitment is simple: help every sender move
            forward, give every driver meaningful opportunities, and make every delivery feel
            seamless and trustworthy.
          </p>
          <blockquote className="font-light italic text-[clamp(16px,2.5vw,20px)] leading-[1.72] text-[#3A3530] border-l-[3px] border-[#E85A1B] pl-6 my-7">
            "We&apos;re constantly rethinking how to make sending anything from A to B faster, more
            transparent, and more accessible — for senders, for receivers, for drivers, right here
            in Cape Town. In real time. At the speed life demands."
          </blockquote>
          <div className="flex items-center gap-3.5 mt-7">
            <div className="w-[42px] h-[42px] rounded-full bg-[#E85A1B] flex items-center justify-center flex-shrink-0">
              <span
                style={{ fontFamily: "'Syne', sans-serif" }}
                className="text-[14px] font-bold text-white"
              >
                EG
              </span>
            </div>
            <div>
              <p
                style={{ fontFamily: "'Syne', sans-serif" }}
                className="text-[13px] font-semibold text-[#1A1714]"
              >
                The EzyGo Team
              </p>
              <p className="text-[12px] text-[#7A7670] mt-0.5">Cape Town, Western Cape</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION PILLARS ── */}
      <section className="px-10 py-16">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#E85A1B] mb-3">
          Our mission
        </p>
        <h2
          style={{ fontFamily: "'Syne', sans-serif" }}
          className="text-[clamp(24px,4vw,34px)] font-bold leading-[1.18] text-[#1A1714] mb-4"
        >
          Our mission is clear
        </h2>
        <p className="text-[14px] font-light leading-[1.85] text-[#7A7670] max-w-[560px]">
          Four commitments that guide every delivery we make, every driver we empower, and every
          feature we build.
        </p>

        <div className="grid grid-cols-2 gap-px bg-black/8 border border-black/8 rounded-xl overflow-hidden mt-10 max-sm:grid-cols-1">
          {pillars.map((p) => (
            <div key={p.num} className="bg-white p-8 relative">
              <span className="absolute top-4 right-5 text-[11px] font-bold text-[rgba(232,90,27,0.25)] tracking-[0.06em]">
                {p.num}
              </span>
              <div className="w-9 h-9 rounded-lg bg-[rgba(232,90,27,0.08)] flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <h3
                style={{ fontFamily: "'Syne', sans-serif" }}
                className="text-[14px] font-bold text-[#1A1714] mb-2"
              >
                {p.title}
              </h3>
              <p className="text-[13px] font-light leading-[1.72] text-[#7A7670]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHO WE SERVE ── */}
      <section className="bg-[#1A1714] px-10 py-16">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[rgba(232,90,27,0.85)] mb-3">
          Delivery — and so much more
        </p>
        <h2
          style={{ fontFamily: "'Syne', sans-serif" }}
          className="text-[clamp(24px,4vw,34px)] font-bold leading-[1.18] text-white mb-4"
        >
          Who we serve
        </h2>
        <p className="text-[14px] font-light leading-[1.85] text-white/45 max-w-[560px]">
          We started with parcels. Now we enable fast, secure last-mile delivery for e-commerce,
          personal needs, urgent documents — while creating flexible earning opportunities for
          drivers.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-9 max-sm:grid-cols-1">
          {[
            { tag: "For Senders", title: "Move anything, effortlessly", items: senderFeatures },
            { tag: "For Drivers", title: "Earn on your own terms", items: driverFeatures },
          ].map((card) => (
            <div
              key={card.tag}
              className="bg-white/4 border border-white/8 rounded-xl p-7"
            >
              <span className="inline-block text-[10px] font-semibold tracking-[0.14em] uppercase text-[#E85A1B] bg-[rgba(232,90,27,0.12)] rounded-full px-3 py-1 mb-4">
                {card.tag}
              </span>
              <h3
                style={{ fontFamily: "'Syne', sans-serif" }}
                className="text-[16px] font-bold text-white mb-3"
              >
                {card.title}
              </h3>
              <ul className="space-y-0">
                {card.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[13px] font-light text-white/50 leading-[1.7] py-1.5 border-b border-white/5 last:border-b-0"
                  >
                    <span className="inline-block w-1 h-1 rounded-full bg-[#E85A1B] mt-[7px] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#0d2424] px-10 py-14 flex flex-col items-start gap-6">
        <h2
          style={{ fontFamily: "'Syne', sans-serif" }}
          className="text-[clamp(22px,4vw,32px)] font-extrabold text-white max-w-[480px] leading-[1.2]"
        >
          Moving forward — together
        </h2>
        <div className="flex gap-3 flex-wrap">
          <a
            href="/quote"
            className="text-[13px] font-medium px-6 py-3 rounded-lg bg-white text-[#0d2424] hover:opacity-88 transition-opacity"
          >
            Send a parcel
          </a>
          <a
            href="/driver/register"
            className="text-[13px] font-medium px-6 py-3 rounded-lg bg-white/15 text-white border border-white/30 hover:opacity-88 transition-opacity"
          >
            Become a driver
          </a>
        </div>
      </section>
    </main>
  );
}