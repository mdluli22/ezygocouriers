"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayoutShell({
  children,
  dashboardHref,
}: {
  children: React.ReactNode;
  dashboardHref: string;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/login" || pathname.endsWith("/admin/login")) {
    return <>{children}</>;
  }

  return (
    <div className="admin-portal-shell">
      <AdminSidebar dashboardHref={dashboardHref} />
      <main className="admin-portal-main">{children}</main>
    </div>
  );
}
