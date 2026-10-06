import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

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
          This Privacy Policy explains how EzyGo Couriers (Pty) Ltd (&quot;EzyGo&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
          collects, uses, shares, and protects personal information when you use our website, app,
          or delivery services. We comply with the Protection of Personal Information Act (POPIA),
          the Electronic Communications and Transactions Act (ECTA), and other applicable South
          African laws.
        </p>
        <p className="mt-3">
          EzyGo connects customers and drivers for parcel deliveries within our Cape Town
          service area.
        </p>
      </>
    ),
  },
  {
    id: "responsible-party",
    title: "Who handles your information",
    content: (
      <>
        <p>EzyGo Couriers (Pty) Ltd is the Responsible Party under POPIA.</p>
        <div className="mt-4 bg-[var(--legal-soft)] rounded-lg p-5 text-[13px] space-y-1.5">
          <p>
            <span className="font-medium text-[var(--legal-ink)]">Email:</span>{" "}
            <a href="mailto:support@ezygocouriers.co.za" className="text-[var(--legal-accent)] underline">
              support@ezygocouriers.co.za
            </a>
          </p>
        </div>
      </>
    ),
  },
  {
    id: "information-collected",
    title: "Information we collect",
    content: (
      <>
        <p className="font-medium text-[var(--legal-ink)] mb-2">Contact and delivery details</p>
        <ul className="list-none space-y-1 mb-5">
          {[
            "Full name",
            "Email address",
            "Phone number",
            "Pickup and delivery addresses",
            "Recipient contact details and parcel instructions",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
        <p className="font-medium text-[var(--legal-ink)] mb-2">Account and app activity</p>
        <ul className="list-none space-y-1">
          {[
            "Account details and securely hashed passwords",
            "Booking history, delivery status, and proof-of-delivery details",
            "Payment status & method (we don't store full card details)",
            "Technical details such as IP address, browser, and session information",
            "Driver location when a driver enables location sharing",
            "Push notification subscription details when notifications are enabled",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "how-we-collect",
    title: "How we use your information",
    content: (
      <>
        <p>
          You provide information when you create an account, book a delivery, make a payment,
          or contact support. The app also records information needed to keep your account secure
          and your deliveries up to date.
        </p>
        <p className="mt-3 font-medium text-[var(--legal-ink)]">We use it to:</p>
        <ul className="list-none mt-2 space-y-1">
          {[
            "Provide and track your deliveries",
            "Process payments and send confirmations and updates",
            "Manage accounts and verify users",
            "Improve our platform and prevent fraud",
            "Comply with legal obligations",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-[var(--legal-muted)]">
          Legal bases under POPIA: your consent, contract performance, legal obligations, or our
          legitimate interests.
        </p>
      </>
    ),
  },
  {
    id: "who-we-share-with",
    title: "Who we share information with",
    content: (
      <>
        <ul className="list-none space-y-1 mb-4">
          {[
            "Assigned drivers, so they can collect and deliver your parcel",
            "Yoco, which handles secure checkout and payment processing",
            "Google, for address search, maps, or Google sign-in when you use those features",
            "Service providers that support hosting, email, and app operation",
            "Authorities when legally required",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] font-medium text-[var(--legal-ink)]">
          We never sell your data. All partners are required to protect it.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect your information",
    content: (
      <>
        <ul className="list-none space-y-1 mb-4">
          {[
            "Encrypted connections (HTTPS/SSL)",
            "Hashed passwords and secure sign-in",
            "Role-based access controls",
            "Secure cloud hosting",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-[var(--legal-muted)]">
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
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Send privacy requests to <a className="text-[var(--legal-accent)] underline" href="mailto:support@ezygocouriers.co.za">support@ezygocouriers.co.za</a>.
          You can also contact the <a className="text-[var(--legal-accent)] underline" href="https://inforegulator.org.za/complaints/">Information Regulator</a>.
        </p>
      </>
    ),
  },
  {
    id: "other-info",
    title: "Other privacy details",
    content: (
      <div className="space-y-5">
        {[
          {
            label: "Cookies",
            text: "We use cookies and browser storage for sign-in and app features. Our Cookie Policy explains what is stored and how to manage it.",
          },
          {
            label: "Marketing",
            text: "We only send marketing with your consent or (for existing customers) unless you opt out. Unsubscribe anytime.",
          },
          {
            label: "Children",
            text: "You must be 18 or older to open an account and use our services, as set out in our Terms and Conditions.",
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
            text: "We keep data only as long as needed for services, legal or tax reasons, or disputes, then securely delete or anonymize.",
          },
        ].map((item) => (
          <div key={item.label} className="border-l-2 border-[var(--legal-line)] pl-4">
            <p className="font-medium text-[13px] text-[var(--legal-ink)] mb-1">{item.label}</p>
            <p className="text-[13px] text-[var(--legal-muted)] leading-[1.7]">{item.text}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      path="/legal/privacy-policy"
      sections={sections}
      contactTitle="Questions about your privacy?"
    />
  );
}
