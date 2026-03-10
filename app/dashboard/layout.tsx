import type { Metadata } from "next";
import Link from "next/link";
import DashboardNav from "@/components/dashboard/DashboardNav";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-surface)" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="container flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow transition-transform group-hover:scale-105"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-accent)",
              }}
            >
              E
            </div>
            <span className="font-bold text-base hidden sm:block" style={{ color: "var(--color-primary)" }}>
              EzyGo
            </span>
          </Link>

          <DashboardNav />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}
