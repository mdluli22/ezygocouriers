"use client";

import { formatMoney } from "@/lib/currency";
import { useState } from "react";
import { Package, UserRound, Truck } from "lucide-react";
import { usePagedList } from "@/components/ui/useRemote";
import ListControls from "@/components/ui/ListControls";
import SearchField from "@/components/ui/SearchField";
import { requestJson } from "@/lib/api/client";
import {
  DELIVERY_STATUSES,
  STATUS_LABELS,
  type DeliveryStatus,
} from "@ezygo/contracts";
import { STATUS_COLORS } from "@/lib/constants/delivery-status";

interface Delivery {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  parcel_description: string;
  created_at: string;
  pickup_city: string;
  pickup_province: string;
  dropoff_city: string;
  dropoff_province: string;
  quote_amount: string;
  quote_currency: string;
  customer_name: string;
  customer_email: string;
  driver_name: string | null;
}

interface Driver {
  id: number;
  full_name: string;
  vehicle_type: string;
  vehicle_reg: string;
  status: "active" | "inactive" | "suspended";
}

export default function AdminDeliveriesPage() {
  const [filter, setFilter]         = useState<DeliveryStatus | "all">("all");
  const [assigning, setAssigning]   = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Record<number, number>>({});
  const [toast, setToast]           = useState("");

  const [search, setSearch] = useState("");
  const list = usePagedList<Delivery>(`/api/admin/deliveries?status=${filter}&q=${encodeURIComponent(search)}`);
  const deliveries = list.items;
  const { loading, reload: load } = list;
  const driverList = usePagedList<Driver>("/api/admin/drivers");
  const drivers = driverList.items.filter(driver => driver.status === "active");

  async function handleAssign(deliveryId: number) {
    try {
      const driverId = selectedDriver[deliveryId];
      if (!driverId) return;
      setAssigning(deliveryId);
      await requestJson<{ message: string }>("/api/admin/deliveries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_id: deliveryId, driver_id: driverId }),
      });
      setToast("Driver assigned successfully!");
      load();
      setAssigning(null);
      setTimeout(() => setToast(""), 3000);
    } catch (error) { setToast(error instanceof Error ? error.message : "Request failed."); } finally { setAssigning(null); }
  }

  return (
    <div className="space-y-6 admin-deliveries-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--color-link)" }}>Deliveries</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Manage all deliveries and assign drivers
        </p>
      </div>

      <SearchField value={search} onChange={setSearch} label="Search deliveries" placeholder="Tracking number, customer or city" />

      {/* Toast */}
      {toast && (
        <div className="p-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgb(16 185 129 / 0.1)", color: "var(--color-success)" }}>
          {toast}
        </div>
      )}

      {/* Filter tabs */}
      <div className="admin-filter-tabs" aria-label="Delivery status">
        {(["all", ...DELIVERY_STATUSES] as const).map((s) => (
          <button
            key={s}
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: filter === s ? "var(--color-primary)" : "var(--color-surface-raised)",
              color: filter === s ? "white" : "var(--color-text-secondary)",
            }}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--color-link)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      ) : list.error ? null : deliveries.length === 0 ? (
        <div className="card text-center py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>
          No deliveries found.
        </div>
      ) : (
        <section className="admin-delivery-list" tabIndex={0} aria-label="Delivery results" aria-busy={loading}>
          {deliveries.map((d) => (
            <article key={d.id} className="card admin-delivery-card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="admin-delivery-icon" aria-hidden="true"><Package size={22} /></span>
                <div className="admin-delivery-copy">
                  <p className="font-black text-sm" style={{ color: "var(--color-link)" }}>{d.tracking_number}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {d.pickup_city} → {d.dropoff_city} · {d.customer_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {d.parcel_description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge text-xs px-2 py-1 ${STATUS_COLORS[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </span>
                  <span className="text-sm font-bold" style={{ color: "var(--color-link)" }}>
                    {formatMoney(d.quote_amount, d.quote_currency)}
                  </span>
                </div>
              </div>

              <div className="admin-delivery-meta">
                <span><UserRound size={15} aria-hidden="true" /> {d.recipient_name}</span>
                <span>{new Date(d.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>

              {/* Assign driver inline */}
              {["paid", "assigned"].includes(d.status) && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <select
                    aria-label={`Assign driver for ${d.tracking_number}`}
                    className="input text-sm py-1.5 flex-1 min-w-0"
                    value={selectedDriver[d.id] ?? ""}
                    onChange={(e) => setSelectedDriver((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))}
                  >
                    <option value="">Select a driver…</option>
                    {drivers.map((dr) => (
                      <option key={dr.id} value={dr.id}>
                        {dr.full_name} — {dr.vehicle_type} ({dr.vehicle_reg})
                      </option>
                    ))}
                  </select>
                  <ListControls {...driverList} />
                  <button
                    className="btn-primary text-sm py-1.5 px-4"
                    disabled={!selectedDriver[d.id] || assigning === d.id}
                    onClick={() => handleAssign(d.id)}
                  >
                    {assigning === d.id ? "Assigning…" : "Assign Driver"}
                  </button>
                </div>
              )}

              {d.driver_name && (
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  <Truck size={15} aria-hidden="true" className="inline mr-1" /> {d.driver_name}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
      <ListControls {...list} />
    </div>
  );
}
