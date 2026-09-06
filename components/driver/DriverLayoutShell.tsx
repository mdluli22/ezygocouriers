"use client";

import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import DriverNav from "@/components/driver/DriverNav";
import DriverLocationTracker from "@/components/driver/DriverLocationTracker";

export default function DriverLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/driver/login" || pathname.endsWith("/driver/login")) {
    return <>{children}</>;
  }

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
