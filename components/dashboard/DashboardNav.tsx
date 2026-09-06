"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Package, Plus } from "lucide-react";
import { signOutAndRedirect } from "@/lib/auth/navigation";

interface User {
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

export default function DashboardNav() {
  const [user, setUser]       = useState<User | null>(null);
  const [open, setOpen]       = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
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
    try {
      await signOutAndRedirect("/auth/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const initials = user?.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const firstName = user?.full_name.split(" ")[0];

  return (
    <div className="portal-header-actions">
      <Link
        href="/dashboard/deliveries/new"
        className="portal-header-cta"
      >
        <Plus size={17} strokeWidth={2.7} />
        <span className="hidden sm:inline">New delivery</span>
      </Link>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className={`portal-account-button ${open ? "is-open" : ""}`}
          aria-label="Account menu"
          aria-expanded={open}
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="portal-avatar object-cover"
            />
          ) : (
            <div className="portal-avatar">
              {initials ?? "?"}
            </div>
          )}
          {firstName && <span className="hidden md:block">{firstName}</span>}
          <ChevronDown size={15} className={open ? "rotate-180" : ""} />
        </button>

        {open && (
          <div className="portal-dropdown">
            {user && (
              <div className="portal-dropdown-user">
                <p className="font-bold text-sm truncate">
                  {user.full_name}
                </p>
                <p className="text-xs truncate">
                  {user.email}
                </p>
              </div>
            )}

            <Link href="/dashboard" onClick={() => setOpen(false)} className="portal-dropdown-item">
              <Package size={16} /> My deliveries
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="portal-dropdown-item portal-dropdown-signout"
            >
              <LogOut size={16} /> {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
