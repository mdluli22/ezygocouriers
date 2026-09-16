import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";
import { getAdminStats } from "@/lib/services/admin";

const statIcons = {
  deliveries: Package,
  pending: Clock3,
  transit: Route,
  delivered: CheckCircle2,
  cancelled: XCircle,
  drivers: Truck,
  users: Users,
  activeUsers: UserRoundCheck,
};

function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: keyof typeof statIcons;
  tone?: "default" | "green" | "amber";
}) {
  const Icon = statIcons[icon];

  return (
    <div className={`admin-stat-card is-${tone}`}>
      <span className="admin-stat-icon"><Icon size={19} /></span>
      <span className="admin-stat-label">{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const deliveries = stats.deliveries;
  const drivers = stats.drivers;
  const users = stats.users;
  const revenue = Number(stats.revenue.total_revenue);
  const deliveryTotal = Math.max(deliveries.total, 1);

  const actions = [
    { href: "/admin/deliveries", label: "View deliveries", detail: "Manage the full delivery queue", icon: Package },
    { href: "/admin/drivers", label: "Manage drivers", detail: "Review and update your fleet", icon: Truck },
    { href: "/admin/users", label: "Manage customers", detail: "View platform accounts", icon: Users },
    { href: "/admin/pricing", label: "Edit pricing", detail: "Update delivery rate settings", icon: BadgeDollarSign },
  ];

  const pipeline = [
    { label: "Pending", value: deliveries.pending, color: "#f59e0b" },
    { label: "In transit", value: deliveries.in_transit, color: "#16a36f" },
    { label: "Delivered", value: deliveries.delivered, color: "#2f4f4f" },
    { label: "Cancelled", value: deliveries.cancelled, color: "#d96a5b" },
  ];

  return (
    <div className="portal-dashboard admin-dashboard">
      <section className="admin-overview-hero">
        <div className="portal-hero-grid" aria-hidden="true" />
        <div className="admin-overview-copy">
          <span className="portal-eyebrow"><ShieldCheck size={14} /> Operations command centre</span>
          <h1>Good overview.<br /><em>Better decisions.</em></h1>
          <p>A clear view of deliveries, drivers, customers and revenue across EzyGo.</p>
        </div>
        <div className="admin-revenue-card">
          <span><Sparkles size={15} /> Total revenue</span>
          <strong>R {revenue.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <p>Generated from {deliveries.delivered} completed deliveries</p>
          <i><b style={{ width: `${Math.min(100, (deliveries.delivered / deliveryTotal) * 100)}%` }} /></i>
        </div>
      </section>

      <section className="admin-stat-grid">
        <StatCard label="Total deliveries" value={deliveries.total} icon="deliveries" />
        <StatCard label="Pending" value={deliveries.pending} sub="Awaiting action" icon="pending" tone="amber" />
        <StatCard label="In transit" value={deliveries.in_transit} sub="Moving now" icon="transit" tone="green" />
        <StatCard label="Delivered" value={deliveries.delivered} sub="Completed" icon="delivered" />
        <StatCard label="Cancelled" value={deliveries.cancelled} icon="cancelled" />
        <StatCard label="Drivers" value={drivers.total} sub={`${drivers.active} active`} icon="drivers" />
        <StatCard label="Customers" value={users.customers} sub={`${users.total} total accounts`} icon="users" />
        <StatCard label="Active users" value={users.active} icon="activeUsers" tone="green" />
      </section>

      <div className="admin-overview-grid">
        <section className="admin-pipeline-card">
          <div className="portal-section-heading">
            <div>
              <span className="portal-section-kicker"><Route size={13} /> Delivery pipeline</span>
              <h2>Where every delivery stands</h2>
              <p>A quick operational snapshot of the current queue.</p>
            </div>
            <Link href="/admin/deliveries" className="portal-text-link">Open queue <ArrowRight size={15} /></Link>
          </div>
          <div className="admin-pipeline-list">
            {pipeline.map((item) => (
              <div key={item.label} className="admin-pipeline-row">
                <span><i style={{ backgroundColor: item.color }} />{item.label}</span>
                <b><i style={{ width: `${Math.min(100, (item.value / deliveryTotal) * 100)}%`, backgroundColor: item.color }} /></b>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-quick-card">
          <div className="portal-section-heading">
            <div>
              <span className="portal-section-kicker"><Sparkles size={13} /> Quick actions</span>
              <h2>Keep things moving</h2>
            </div>
          </div>
          <div className="admin-action-list">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="admin-action-link group">
                  <span><Icon size={18} /></span>
                  <span><strong>{action.label}</strong><small>{action.detail}</small></span>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
