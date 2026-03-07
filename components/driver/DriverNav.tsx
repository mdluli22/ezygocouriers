"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverNav() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [loggingOut, setLogout] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.success) setName(d.data.full_name.split(" ")[0]); });
  }, []);

  async function logout() {
    setLogout(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  return (
    <div className="flex items-center gap-3">
      {name && (
        <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--color-text-secondary)" }}>
          Hi, {name}
        </span>
      )}
      <button
        onClick={logout}
        disabled={loggingOut}
        className="btn-outline py-1.5 px-3 text-sm"
      >
        {loggingOut ? "…" : "Sign out"}
      </button>
    </div>
  );
}
