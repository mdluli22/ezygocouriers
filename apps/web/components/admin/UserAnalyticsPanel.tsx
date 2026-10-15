"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, BadgeCheck, CalendarDays, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { ANALYTICS_REFRESH_MS, type UserAnalytics } from "@/lib/analytics";
import { requestJson } from "@/lib/api/client";

const number = (value: number) => value.toLocaleString("en-ZA");
const dayLabel = (date: string) => new Date(`${date}T12:00:00+02:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });

export default function UserAnalyticsPanel({ initialData }: { initialData: UserAnalytics }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending || document.visibilityState !== "visible" || !navigator.onLine) return;
      pending = true;
      try {
        const response = await requestJson<{ data: UserAnalytics }>("/api/admin/analytics", { signal: controller.signal });
        if (!controller.signal.aborted) { setData(response.data); setError(""); }
      } catch {
        if (!controller.signal.aborted) setError("Analytics could not refresh. Showing the last update.");
      } finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(refresh, ANALYTICS_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh); };
  }, []);

  const cards = [
    { label: "Live users", value: data.live, detail: "Signed in · seen within 2 minutes", icon: Activity, live: true },
    { label: "Registered users", value: data.registered, detail: "All customer, driver and admin accounts", icon: Users },
    { label: "Registered today", value: data.today, detail: "Since midnight · South Africa time", icon: UserPlus },
    { label: "Last 7 days", value: data.last7Days, detail: "New registrations", icon: CalendarDays },
    { label: "Last 30 days", value: data.last30Days, detail: "New registrations", icon: CalendarDays },
    { label: "Verified users", value: data.verified, detail: "Email address verified", icon: BadgeCheck },
    { label: "Awaiting verification", value: data.unverified, detail: "Email verification incomplete", icon: UserPlus },
    { label: "Enabled accounts", value: data.enabled, detail: `${number(data.registered - data.enabled)} disabled accounts`, icon: Users },
  ];
  const peak = Math.max(1, ...data.trend.map(day => day.count));
  const roles = [{ label: "Customers", count: data.customers }, { label: "Drivers", count: data.drivers }, { label: "Admins", count: data.admins }];

  return (
    <section className="admin-user-analytics" aria-labelledby="user-analytics-heading">
      <div className="portal-section-heading">
        <div><span className="portal-section-kicker"><Activity size={14} /> User analytics</span><h2 id="user-analytics-heading">Your platform in numbers</h2><p>Live users are signed-in users viewing the site. Updates every 30 seconds.</p></div>
      </div>
      <p className="analytics-updated">Last updated {new Date(data.updatedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Johannesburg" })} · South Africa time</p>
      {error && <p className="analytics-error" role="status">{error}</p>}
      <div className="admin-stat-grid">
        {cards.map(card => <article key={card.label} className={`admin-stat-card${card.live ? " is-green" : ""}`}>
          <span className="admin-stat-icon"><card.icon size={19} aria-hidden="true" /></span>
          <span className="admin-stat-label">{card.live && <i className="analytics-live-dot" />}{card.label}</span>
          <strong>{number(card.value)}</strong><small>{card.detail}</small>
        </article>)}
      </div>
      <div className="admin-analytics-charts">
        <section className="analytics-chart-card" aria-labelledby="signup-trend-heading">
          <div className="analytics-chart-heading"><div><h3 id="signup-trend-heading">Registration trend</h3><p>New accounts each day · last 14 days</p></div><strong>{number(data.trend.reduce((total, day) => total + day.count, 0))}<small>new users</small></strong></div>
          <ul className="analytics-bars" tabIndex={0} aria-label="Daily registrations">
            {data.trend.map(day => <li key={day.date} aria-label={`${dayLabel(day.date)}: ${day.count} registrations`}>
              <span>{number(day.count)}</span><div className="analytics-bar-track"><i style={{ height: `${(day.count / peak) * 100}%` }} /></div><small>{dayLabel(day.date)}</small>
            </li>)}
          </ul>
        </section>
        <section className="analytics-chart-card" aria-labelledby="user-roles-heading">
          <h3 id="user-roles-heading">Account breakdown</h3><p>Registered users by role</p>
          <ul className="analytics-role-list">{roles.map(role => <li key={role.label}><div><span>{role.label}</span><strong>{number(role.count)}</strong></div><div className="analytics-role-track"><i style={{ width: `${data.registered ? (role.count / data.registered) * 100 : 0}%` }} /></div></li>)}</ul>
          <Link href="/admin/users" className="portal-text-link">Manage users <ArrowUpRight size={15} /></Link>
        </section>
      </div>
    </section>
  );
}
