"use client";

import { useEffect, useState } from "react";

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: "customer" | "driver" | "admin";
  is_active: boolean;
  auth_provider: string;
  created_at: string;
}

const ROLE_FILTERS = ["all", "customer", "driver", "admin"] as const;

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<User[]>([]);
  const [filter, setFilter]   = useState<typeof ROLE_FILTERS[number]>("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState({ msg: "", ok: true });

  async function load(role: typeof ROLE_FILTERS[number]) {
    setLoading(true);
    const url = role === "all" ? "/api/admin/users" : `/api/admin/users?role=${role}`;
    const res = await fetch(url);
    const data = await res.json();
    setUsers(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(filter); }, [filter]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3000);
  }

  async function handleToggle(userId: number) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json();
    if (res.ok) { showToast("User status updated."); load(filter); }
    else showToast(data.message ?? "Failed to update user.", false);
  }

  const ROLE_COLORS: Record<string, string> = {
    admin:    "bg-purple-100 text-purple-700",
    driver:   "bg-blue-100 text-blue-700",
    customer: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--color-primary)" }}>Users</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          View and manage all user accounts
        </p>
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

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
            style={{
              backgroundColor: filter === r ? "var(--color-primary)" : "var(--color-surface-raised)",
              color: filter === r ? "white" : "var(--color-text-secondary)",
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--color-primary)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>No users found.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--color-surface-raised)", borderBottom: "1px solid var(--color-border)" }}>
                {["Name", "Email", "Phone", "Role", "Provider", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: i < users.length - 1 ? "1px solid var(--color-border)" : "none",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--color-text-primary)" }}>{u.full_name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>{u.email}</td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>{u.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs px-2 py-0.5 ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: "var(--color-text-muted)" }}>{u.auth_provider}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold"
                      style={{ color: u.is_active ? "var(--color-success)" : "var(--color-error)" }}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== "admin" && (
                      <button
                        className="text-xs font-semibold underline"
                        style={{ color: u.is_active ? "var(--color-error)" : "var(--color-success)" }}
                        onClick={() => handleToggle(u.id)}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
