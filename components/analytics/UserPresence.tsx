"use client";

import { useEffect } from "react";
import { PRESENCE_INTERVAL_MS } from "@/lib/analytics";

export default function UserPresence() {
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    let stopped = false;
    let lastAttempt = 0;
    async function heartbeat() {
      if (pending || stopped || document.visibilityState !== "visible" || !navigator.onLine || Date.now() - lastAttempt < PRESENCE_INTERVAL_MS) return;
      pending = true;
      lastAttempt = Date.now();
      try {
        const response = await fetch("/api/analytics/presence", { method: "POST", cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
        if (response.status === 401 || response.status === 403) stopped = true;
      } catch { /* Resume with the next heartbeat when the connection returns. */ }
      finally { pending = false; }
    }
    void heartbeat();
    const timer = setInterval(heartbeat, PRESENCE_INTERVAL_MS);
    document.addEventListener("visibilitychange", heartbeat);
    window.addEventListener("online", heartbeat);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", heartbeat); window.removeEventListener("online", heartbeat); };
  }, []);
  return null;
}
