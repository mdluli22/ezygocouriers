import type { Metadata } from "next";
import Link from "next/link";
import DriverNav from "@/components/driver/DriverNav";

export const metadata: Metadata = { title: "Driver Portal" };

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-surface)" }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
      >
        <div className="container flex items-center justify-between h-16">
          <Link href="/driver" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow transition-transform group-hover:scale-105"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-accent)" }}
            >
              E
            </div>
            <div>
              <span className="font-bold text-sm block leading-none" style={{ color: "var(--color-primary)" }}>
                EzyGo
              </span>
              <span className="text-xs leading-none" style={{ color: "var(--color-text-muted)" }}>
                Driver Portal
              </span>
            </div>
          </Link>
          <DriverNav />
        </div>
      </header>
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}
