import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import BrandLogo from "@/components/BrandLogo";
import DriverNav from "@/components/driver/DriverNav";
import DriverLocationTracker from "@/components/driver/DriverLocationTracker";

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
    <div className="portal-shell portal-shell-driver">
      <DriverLocationTracker />
      <header className="portal-topbar">
        <div className="portal-nav-inner">
          <BrandLogo
            href="/driver"
            size="md"
            subtitle="Driver Portal"
            ariaLabel="EzyGo driver portal"
            priority
          />
          <DriverNav />
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
