"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

export default function DashboardNav() {
  const router = useRouter();
  const [user, setUser]       = useState<User | null>(null);
  const [open, setOpen]       = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.success) setUser(d.data); })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  const initials = user?.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard/deliveries/new"
        className="btn-accent py-2 px-4 text-sm hidden sm:inline-flex"
      >
        + New Delivery
      </Link>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-opacity-80"
          style={{ backgroundColor: open ? "var(--color-surface)" : "transparent" }}
          aria-label="Account menu"
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {initials ?? "?"}
            </div>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            style={{ color: "var(--color-text-muted)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-lg border py-1.5 z-50"
            style={{
              backgroundColor: "var(--color-bg)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            {user && (
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                <p className="font-semibold text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                  {user.full_name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  {user.email}
                </p>
              </div>
            )}

            <div className="py-1">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/dashboard/deliveries", label: "My Deliveries" },
                { href: "/dashboard/profile", label: "Profile" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center px-4 py-2 text-sm transition-colors hover:bg-opacity-60"
                  style={{
                    color: "var(--color-text-primary)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--color-surface)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-t py-1" style={{ borderColor: "var(--color-border)" }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center px-4 py-2 text-sm transition-colors disabled:opacity-50"
                style={{ color: "var(--color-error)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgb(239 68 68 / 0.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
