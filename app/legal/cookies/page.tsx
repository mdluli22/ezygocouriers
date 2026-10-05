import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy | EzyGo Couriers",
  description:
    "How EzyGo Couriers uses cookies and similar technologies on our website and app, and how you can manage them.",
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
          app. They allow the site to remember information about your visit, such as whether
          you&apos;re logged in, your preferences, or how you interact with our platform.
        </p>
        <p className="mt-3">
          Similar technologies like local storage and session storage work in a comparable way and
          are covered by this policy. We refer to all of these collectively as &quot;cookies&quot;.
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
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              {i}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-[var(--legal-muted)]">
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
            className="rounded-lg border border-[var(--legal-line)] p-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-[13px] font-medium text-[var(--legal-ink)]">{c.name}</p>
                <span
                  className={`text-[10px] font-semibold tracking-[0.1em] uppercase rounded-full px-2.5 py-0.5 ${
                    c.essential
                      ? "bg-[var(--legal-soft)] text-[var(--legal-accent)]"
                      : "bg-[var(--legal-soft)] text-[var(--legal-muted)]"
                  }`}
                >
                  {c.essential ? "Essential" : "Optional"}
                </span>
              </div>
              <p className="text-[13px] text-[var(--legal-muted)] leading-[1.65]">{c.purpose}</p>
            </div>
            <div className="flex-shrink-0 text-right max-sm:text-left">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--legal-muted)] mb-0.5">
                Duration
              </p>
              <p className="text-[12px] text-[var(--legal-ink)] font-medium whitespace-nowrap">
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
            <div key={b.browser} className="bg-[var(--legal-soft)] rounded-lg p-4">
              <p className="text-[12px] font-semibold text-[var(--legal-ink)] mb-1">{b.browser}</p>
              <p className="text-[12px] text-[var(--legal-muted)] leading-snug">{b.path}</p>
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
        or how we operate. Any updates will be posted on this page with a revised &quot;last updated&quot;
        date. Continued use of EzyGo after changes are posted constitutes your acceptance.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      path="/legal/cookies"
      sections={sections}
      contactTitle="Questions about cookies?"
      summary={<dl>{[
        { label: "Essential cookies", value: "3 types" },
        { label: "Optional cookies", value: "3 types" },
        { label: "Ad cookies", value: "None" },
        { label: "Data sold", value: "Never" },
      ].map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}
    />
  );
}
