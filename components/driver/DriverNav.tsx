"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Truck } from "lucide-react";

export default function DriverNav() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [loggingOut, setLogout] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);

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
        const rows: Array<{ status?: string }> = Array.isArray(data.data) ? data.data : [];
        const assigned = rows.filter((row) => row.status === "assigned").length;
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
      } catch {
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
    <div className="portal-header-actions">
      {/* assigned deliveries badge */}
      {assignedCount > 0 && (
        <button
          title={`${assignedCount} assigned delivery(ies)`}
          onClick={() => router.push('/driver')}
          className="driver-assignment-pill"
        >
          <Truck size={16} />
          <span>{assignedCount}</span>
          <i />
        </button>
      )}
      {name && (
        <div className="driver-user-pill">
          <div className="portal-avatar portal-avatar-accent">
            {initial}
          </div>
          <span className="hidden sm:inline">
            {firstName}
          </span>
        </div>
      )}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="portal-icon-button"
        aria-label="Sign out"
      >
        {loggingOut ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <LogOut size={17} />
        )}
        <span className="hidden md:inline">{loggingOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </div>
  );
}
