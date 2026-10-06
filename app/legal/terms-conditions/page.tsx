import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions | EzyGo Couriers",
  description:
    "The terms governing your use of EzyGo Couriers' website, app, and delivery services, written to be clear and fair.",
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
          These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of EzyGo Couriers
          (Pty) Ltd (&quot;EzyGo&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) website, web and mobile applications, and courier
          and delivery services.
        </p>
        <p className="mt-3">
          We provide parcel delivery within our Cape Town service area. These terms explain
          what customers, recipients, and drivers can expect. By booking or using our services,
          you accept these terms.
        </p>
      </>
    ),
  },
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <div className="bg-[var(--legal-soft)] rounded-lg p-5 text-[13px] space-y-1.5">
        <p>
          <span className="font-medium text-[var(--legal-ink)]">Company:</span> EzyGo Couriers (Pty) Ltd
        </p>
        <p>
          <span className="font-medium text-[var(--legal-ink)]">Email:</span>{" "}
          <a href="mailto:support@ezygocouriers.co.za" className="text-[var(--legal-accent)] underline">
            support@ezygocouriers.co.za
          </a>
        </p>
      </div>
    ),
  },
  {
    id: "eligibility",
    title: "Your account",
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
            "Notify us immediately of any unauthorised access",
          ].map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-[var(--legal-muted)]">
          We are not responsible for losses resulting from your failure to protect your account
          credentials.
        </p>
      </>
    ),
  },
  {
    id: "delivery-services",
    title: "Booking a delivery",
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
    title: "Items you cannot send",
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
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--legal-accent)] mt-[7px] flex-shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "pricing-payment",
    title: "Pricing and payment",
    content: (
      <>
        <ul className="list-none space-y-1 mb-4">
          {[
            "Your delivery quote shows the amount payable before you confirm and pay",
            "Pay securely through Yoco using the methods available at checkout. Payment is required before a driver is assigned",
            "We may update our prices. Changes apply only to future bookings",
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
          <div key={item.who} className="bg-[var(--legal-soft)] rounded-lg p-4">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--legal-accent)] mb-2">
              Cancellation by {item.who}
            </p>
            <p className="text-[13px] text-[var(--legal-muted)] leading-[1.7]">{item.text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "liability",
    title: "Delivery, risk, and liability",
    content: (
      <>
        <p>
          Risk passes to the recipient (or per your instructions) on delivery. We are not liable for
          delays caused by traffic, weather, force majeure, incorrect addresses, or recipient
          absence.
        </p>
        <p className="mt-3">
          To the extent allowed by the Consumer Protection Act (CPA), our liability is limited to
          the delivery fee or declared parcel value, whichever is lower. We have no liability for
          indirect or consequential losses.
        </p>
        <p className="mt-3 text-[13px] text-[var(--legal-muted)]">
          Nothing in these Terms limits rights you hold under the CPA or where exclusion is
          prohibited by law.
        </p>
      </>
    ),
  },
  {
    id: "your-responsibilities",
    title: "Your responsibilities",
    content: (
      <p>
        You indemnify EzyGo against any claims, losses, or damages arising from unlawful parcel
        contents, inaccurate information you provide, or your breach of these Terms.
      </p>
    ),
  },
  {
    id: "refunds",
    title: "Refunds and consumer rights",
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
    title: "Other terms",
    content: (
      <div className="space-y-4">
        {[
          {
            label: "Privacy",
            text: "Your use of EzyGo is also governed by our Privacy Policy, which is incorporated into these Terms by reference.",
          },
          {
            label: "Intellectual property",
            text: "All content, logos, and branding belong to EzyGo Couriers (Pty) Ltd. No unauthorised use is permitted.",
          },
          {
            label: "Events beyond our control",
            text: "We have no liability for events beyond our reasonable control, including load shedding, civil unrest, or natural disasters.",
          },
          {
            label: "Suspension",
            text: "We may suspend or terminate your access for violations of these Terms or suspected fraudulent activity.",
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
  {
    id: "disputes",
    title: "Disputes and governing law",
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
    title: "Changes to these terms",
    content: (
      <p>
        We may update these Terms from time to time. Any changes will be posted on this page with
        a revised &quot;last updated&quot; date. Your continued use of EzyGo after changes are posted
        constitutes your acceptance of the updated Terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      path="/legal/terms-conditions"
      sections={termSections}
      contactTitle="Need clarification?"
      summary={<p><strong>Important: </strong>By booking or using our delivery services, you confirm that you have read, understood, and agreed to these Terms and Conditions.</p>}
    />
  );
}
