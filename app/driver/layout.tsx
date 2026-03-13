import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import DriverNav from "@/components/driver/DriverNav";

export const metadata: Metadata = { title: "Driver Portal" };

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts handles redirects for protected pages; layout skips the guard
  // for the login page (which is a public child of this route segment).
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  if (pathname === "/driver/login") {
    return <>{children}</>;
  }

  const session = await getSession();
  if (!session) redirect("/driver/login");
  if (session.role !== "driver") redirect("/dashboard");

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
