import { getAdminStats } from "@/lib/services/admin";
import Link from "next/link";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="card flex flex-col gap-1"
      style={accent ? { borderColor: "var(--color-primary)", borderWidth: 2 } : {}}
    >
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p
        className="text-3xl font-black"
        style={{ color: accent ? "var(--color-primary)" : "var(--color-text-primary)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const d = stats.deliveries;
  const dr = stats.drivers;
  const u = stats.users;
  const revenue = Number(stats.revenue.total_revenue);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--color-primary)" }}>
          Admin Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Overview of all platform activity
        </p>
      </div>

      {/* Revenue Banner */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div>
          <p className="text-white/70 text-sm font-semibold uppercase tracking-wider">Total Revenue</p>
          <p className="text-4xl font-black text-white mt-1">
            R {revenue.toFixed(2)}
          </p>
        </div>
        <p className="text-white/60 text-sm">From {d.delivered} completed deliveries</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Deliveries" value={d.total} />
        <StatCard label="Pending" value={d.pending} sub="Awaiting action" />
        <StatCard label="In Transit" value={d.in_transit} sub="On the way" accent />
        <StatCard label="Delivered" value={d.delivered} sub="Completed" />
        <StatCard label="Cancelled" value={d.cancelled} />
        <StatCard label="Total Drivers" value={dr.total} sub={`${dr.active} active`} />
        <StatCard label="Total Users" value={u.total} sub={`${u.customers} customers`} />
        <StatCard label="Active Users" value={u.active} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/admin/deliveries", label: "View Deliveries" },
            { href: "/admin/drivers",    label: "Manage Drivers" },
            { href: "/admin/users",      label: "Manage Users" },
            { href: "/admin/pricing",    label: "Edit Pricing" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="card text-center text-sm font-semibold py-4 hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-primary)" }}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
