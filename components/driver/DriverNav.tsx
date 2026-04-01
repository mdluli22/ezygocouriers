"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverNav() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [loggingOut, setLogout] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);
  const [lastSeenCount, setLastSeenCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.success) setName(d.data.full_name); });
  }, []);

  // Poll for driver's deliveries and count those with status 'assigned'.
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/driver/deliveries");
        const data = await res.json();
        if (!res.ok || !data) return;
        const rows = Array.isArray(data.data) ? data.data : (data.data ?? []);
        const assigned = rows.filter((r: any) => r.status === "assigned").length;
        if (!mounted) return;
        // notify if count increased
        if (assigned > assignedCount) {
          // show a small in-browser notification if permitted
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("New delivery assigned", {
              body: `You have ${assigned} assigned delivery(ies).`,
              silent: false,
            });
          }
        }
        setAssignedCount(assigned);
      } catch (e) {
        // ignore
      }
    }

    // request permission once on mount
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch {}
    }

    load();
    const id = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    setLogout(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/driver/login");
  }

  const firstName = name.split(" ")[0];
  const initial   = firstName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* assigned deliveries badge */}
      {assignedCount > 0 && (
        <button
          title={`${assignedCount} assigned delivery(ies)`}
          onClick={() => router.push('/driver')}
          className="relative inline-flex items-center px-3 py-1 rounded-full font-semibold text-sm"
          style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)' }}
        >
          🚚
          <span className="ml-2 text-xs">{assignedCount}</span>
          <span className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-red-500" />
        </button>
      )}
      {name && (
        <div className="hidden sm:flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
            style={{ backgroundColor: "#F59E0B", color: "#111" }}
          >
            {initial}
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            {firstName}
          </span>
        </div>
      )}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all hover:opacity-80 disabled:opacity-50"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
        }}
      >
        {loggingOut ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
        )}
        <span className="hidden sm:inline">{loggingOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </div>
  );
}
