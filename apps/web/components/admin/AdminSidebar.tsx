"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgeDollarSign,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { signOutAndRedirect } from "@/lib/auth/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/deliveries", label: "Deliveries", icon: Package },
  { href: "/admin/drivers", label: "Drivers", icon: Truck },
  { href: "/admin/users", label: "Customers", icon: Users },
  { href: "/admin/pricing", label: "Pricing", icon: BadgeDollarSign },
];

export default function AdminSidebar({
  dashboardHref = "/admin",
}: {
  dashboardHref?: string;
}) {
  const pathname = usePathname();

  async function handleSignOut() {
    await signOutAndRedirect("/admin/login");
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <BrandLogo
          href={dashboardHref}
          size="sm"
          variant="dark"
          ariaLabel="EzyGo admin dashboard"
        />
        <span className="admin-role-badge"><ShieldCheck size={12} /> Admin</span>
      </div>

      <div className="admin-sidebar-label">Workspace</div>
      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => {
          const href = item.href === "/admin" ? dashboardHref : item.href;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin" || pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={`admin-nav-link ${isActive ? "is-active" : ""}`}
            >
              <Icon size={18} strokeWidth={2.2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-system-card">
          <span className="admin-system-icon"><Activity size={17} /></span>
          <span>
            <strong>Operations online</strong>
            <small>Live platform overview</small>
          </span>
          <i />
        </div>
        <button onClick={handleSignOut} className="admin-signout-button">
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
