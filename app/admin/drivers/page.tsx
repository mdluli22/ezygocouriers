"use client";

import { useEffect, useState } from "react";

interface Driver {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  license_number: string;
  vehicle_type: string;
  vehicle_reg: string;
  status: "active" | "inactive" | "suspended";
  total_deliveries: number;
  completed_deliveries: number;
  created_at: string;
}

const EMPTY_FORM = {
  full_name: "", email: "", phone: "", password: "",
  license_number: "", vehicle_type: "", vehicle_reg: "",
};

export default function AdminDriversPage() {
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]       = useState({ msg: "", ok: true });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/drivers");
    const data = await res.json();
    setDrivers(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3500);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/admin/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      showToast("Driver account created!");
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } else {
      showToast(data.message ?? "Failed to create driver.", false);
    }
  }

  async function handleToggle(driverId: number) {
    const res = await fetch("/api/admin/drivers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_id: driverId }),
    });
    if (res.ok) { showToast("Status updated."); load(); }
    else showToast("Failed to toggle status.", false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black" style={{ color: "var(--color-primary)" }}>Drivers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Manage driver accounts and availability
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Create Driver
        </button>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: toast.ok ? "rgb(16 185 129 / 0.1)" : "rgb(239 68 68 / 0.08)",
            color: toast.ok ? "var(--color-success)" : "var(--color-error)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Driver Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--color-primary)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      ) : drivers.length === 0 ? (
        <div className="card text-center py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>No drivers yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((dr) => (
            <div key={dr.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold" style={{ color: "var(--color-text-primary)" }}>{dr.full_name}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{dr.email}</p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: dr.status === "active" ? "rgb(16 185 129 / 0.1)" : "rgb(239 68 68 / 0.08)",
                    color: dr.status === "active" ? "var(--color-success)" : "var(--color-error)",
                  }}
                >
                  {dr.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="text-xs space-y-1" style={{ color: "var(--color-text-secondary)" }}>
                <p>{dr.vehicle_type} · {dr.vehicle_reg}</p>
                <p> {dr.license_number}</p>
                {dr.phone && <p>{dr.phone}</p>}
              </div>

              <div className="flex gap-4 text-xs pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>
                  <strong style={{ color: "var(--color-text-primary)" }}>{dr.total_deliveries}</strong> total
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  <strong style={{ color: "var(--color-success)" }}>{dr.completed_deliveries}</strong> completed
                </span>
              </div>

              <button
                className="btn-outline text-xs py-1.5 w-full"
                onClick={() => handleToggle(dr.id)}
              >
                {dr.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Driver Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgb(0 0 0 / 0.5)" }}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--color-bg)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: "var(--color-primary)" }}>Create Driver Account</h2>
              <button onClick={() => setShowModal(false)} style={{ color: "var(--color-text-muted)" }}>✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { name: "full_name",             label: "Full Name",            type: "text" },
                { name: "email",                  label: "Email",                type: "email" },
                { name: "phone",                  label: "Phone",                type: "tel" },
                { name: "password",               label: "Password",             type: "password" },
                { name: "license_number",         label: "License Number",       type: "text" },
                { name: "vehicle_type",           label: "Vehicle Type",         type: "text" },
                { name: "vehicle_reg",            label: "Vehicle Registration", type: "text" },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    className="input"
                    value={form[name as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                    required
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-outline flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? "Creating…" : "Create Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
