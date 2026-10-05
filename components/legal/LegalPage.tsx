import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Mail } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ScrollToTop from "@/components/scrollToTop";
import "./legal.css";

type LegalPageProps = {
  title: string;
  path: string;
  sections: { id: string; title: string; content: ReactNode }[];
  contactTitle: string;
  summary?: ReactNode;
};

const policies = [
  { href: "/legal/privacy-policy", label: "Privacy" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/terms-conditions", label: "Terms & conditions" },
];

export default function LegalPage({ title, path, sections, contactTitle, summary }: LegalPageProps) {
  return (
    <div className="legal-page">
      <header className="legal-header landing-shell">
        <BrandLogo priority />
        <Link href="/" className="legal-home"><ArrowLeft size={16} aria-hidden="true" />Back to home</Link>
      </header>
      <main className="landing-shell">
        <section className="legal-hero" aria-labelledby="policy-title">
          <span className="section-kicker">Legal</span>
          <h1 id="policy-title">{title}</h1>
          <span className="legal-updated"><CalendarDays size={15} aria-hidden="true" />Last updated: 5 October 2026</span>
        </section>
        <nav className="legal-policy-nav" aria-label="Legal policies">
          {policies.map(policy => <Link key={policy.href} href={policy.href} aria-current={path === policy.href ? "page" : undefined}>{policy.label}</Link>)}
        </nav>
        {summary && <div className="legal-summary">{summary}</div>}
        <div className="legal-layout">
          <aside className="legal-contents">
            <details open>
              <summary>On this page</summary>
              <nav aria-label="Policy contents">
                {sections.map((section, index) => <a key={section.id} href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>)}
              </nav>
            </details>
          </aside>
          <article className="legal-article" aria-label={title}>
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="legal-card" aria-labelledby={`${section.id}-title`}>
                <div className="legal-card-heading">
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h2 id={`${section.id}-title`}>{section.title}</h2>
                </div>
                <div className="legal-content">{section.content}</div>
              </section>
            ))}
            <section className="legal-contact">
              <div><Mail size={22} aria-hidden="true" /><h2>{contactTitle}</h2></div>
              <a href="mailto:support@ezygocouriers.co.za">Contact support<ArrowUpRight size={17} aria-hidden="true" /></a>
            </section>
          </article>
        </div>
      </main>
      <footer className="legal-footer landing-shell">
        <span>© {new Date().getFullYear()} EzyGo Couriers</span>
        <Link href="/">EzyGo home<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </footer>
      <ScrollToTop />
    </div>
  );
}
