import type { Metadata } from "next";
import BrandLogo from "@/components/BrandLogo";
import DashboardNav from "@/components/dashboard/DashboardNav";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-nav-inner">
          <BrandLogo
            href="/dashboard"
            size="md"
            wordmarkClassName="hidden min-[420px]:flex"
            ariaLabel="EzyGo dashboard"
            priority
          />

          <DashboardNav />
        </div>
      </header>

      <main className="portal-main">{children}</main>
    </div>
  );
}
