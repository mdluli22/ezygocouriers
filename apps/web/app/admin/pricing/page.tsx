"use client";

import { useEffect, useState } from "react";

interface PricingRule {
  id: number;
  rule_name: string;
  flat_fee: string;
  currency: string;
  is_active: boolean;
  updated_at: string;
}

export default function AdminPricingPage() {
  const [rules, setRules]       = useState<PricingRule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Record<number, string>>({});
  const [saving, setSaving]     = useState<number | null>(null);
  const [toast, setToast]       = useState({ msg: "", ok: true });

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/admin/pricing");
    const data = await res.json();
    setRules(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3000);
  }

  async function handleSave(ruleId: number) {
    const newFee = parseFloat(editing[ruleId]);
    if (isNaN(newFee) || newFee < 0) {
      showToast("Please enter a valid non-negative fee.", false);
      return;
    }
    setSaving(ruleId);
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule_id: ruleId, flat_fee: newFee }),
    });
    setSaving(null);
    if (res.ok) {
      showToast("Flat fee updated successfully!");
      setEditing((p) => { const n = { ...p }; delete n[ruleId]; return n; });
      load();
    } else {
      showToast("Failed to update fee.", false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--color-primary)" }}>Pricing</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Manage delivery pricing rules
        </p>
      </div>

      {/* Warning banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl text-sm"
        style={{
          backgroundColor: "rgb(245 158 11 / 0.08)",
          border: "1px solid rgb(245 158 11 / 0.25)",
          color: "var(--color-warning)",
        }}
      >
        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p>
          <strong>Note:</strong> Updating the flat fee only affects <em>new</em> quotes. Existing confirmed quotes will not be changed.
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

      {/* Rules */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--color-primary)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      ) : rules.length === 0 ? (
        <div className="card text-center py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>No pricing rules found.</div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const isEditing = rule.id in editing;
            const currentVal = isEditing ? editing[rule.id] : parseFloat(rule.flat_fee).toFixed(2);

            return (
              <div key={rule.id} className="card space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold" style={{ color: "var(--color-text-primary)" }}>{rule.rule_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Last updated: {new Date(rule.updated_at).toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: rule.is_active ? "rgb(16 185 129 / 0.1)" : "rgb(239 68 68 / 0.08)",
                      color: rule.is_active ? "var(--color-success)" : "var(--color-error)",
                    }}
                  >
                    {rule.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Inline fee editor */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-bold shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                      {rule.currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input text-xl font-black py-2"
                      style={{ color: "var(--color-accent)" }}
                      value={currentVal}
                      onChange={(e) => setEditing((p) => ({ ...p, [rule.id]: e.target.value }))}
                    />
                  </div>

                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        className="btn-outline text-sm py-1.5 px-4"
                        onClick={() => setEditing((p) => { const n = { ...p }; delete n[rule.id]; return n; })}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary text-sm py-1.5 px-4"
                        disabled={saving === rule.id}
                        onClick={() => handleSave(rule.id)}
                      >
                        {saving === rule.id ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
