"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, MapPinOff, RefreshCw, ShieldCheck } from "lucide-react";
import type { DriverLocationInput } from "@ezygo/contracts";
import {
  clearQueuedLocation,
  queueLatestLocation,
  readQueuedLocation,
} from "@/lib/pwa/location-outbox";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const MINIMUM_SYNC_INTERVAL_MS = 30 * 1000;
const MAX_QUEUED_LOCATION_AGE_MS = 15 * 60 * 1000;

type TrackingState = "idle" | "active" | "queued" | "error" | "unsupported";

async function safelyQueueLocation(coordinates: DriverLocationInput) {
  try {
    await queueLatestLocation(coordinates);
    return true;
  } catch {
    return false;
  }
}

async function safelyClearQueuedLocation() {
  try {
    await clearQueuedLocation();
  } catch {
    // Private browsing modes may disable IndexedDB.
  }
}

export default function DriverLocationTracker() {
  const [state, setState] = useState<TrackingState>("idle");
  const [message, setMessage] = useState(
    "Share your live location while this app is open to receive nearby assignments."
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const watchId = useRef<number | null>(null);
  const heartbeatId = useRef<number | null>(null);
  const latestCoordinates = useRef<DriverLocationInput | null>(null);
  const lastSyncAt = useRef(0);

  const syncLocation = useCallback(
    async (coordinates: DriverLocationInput, force = false): Promise<boolean> => {
      const now = Date.now();
      if (!force && now - lastSyncAt.current < MINIMUM_SYNC_INTERVAL_MS) {
        return true;
      }
      if (!navigator.onLine) {
        const queued = await safelyQueueLocation(coordinates);
        setState(queued ? "queued" : "error");
        setMessage(
          queued
            ? "Offline — your latest location will retry when you reconnect."
            : "Offline — this browser cannot retain a location update for retry."
        );
        return false;
      }

      try {
        const response = await fetch("/api/driver/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(coordinates),
        });
        if (!response.ok) throw new Error("Location update failed.");
        const result = await response.json();
        lastSyncAt.current = now;
        setLastSyncedAt(new Date(now));
        await safelyClearQueuedLocation();
        setState("active");
        setMessage(
          result.data?.assignment
            ? "A new delivery was assigned. Open your trip list to review it."
            : "Live location is on while this app remains open."
        );
        return true;
      } catch {
        const queued = await safelyQueueLocation(coordinates);
        setState(queued ? "queued" : "error");
        setMessage(
          queued
            ? "Location sync paused — the latest update is queued for retry."
            : "Location sync failed and offline storage is unavailable. Try again when connected."
        );
        return false;
      }
    },
    []
  );

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (heartbeatId.current !== null) {
      window.clearInterval(heartbeatId.current);
      heartbeatId.current = null;
    }
    setState("idle");
    setMessage("Location sharing is off. Turn it on when you are available for trips.");
  }, []);

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      setMessage("This browser does not support live location.");
      return;
    }
    if (watchId.current !== null) return;

    setMessage("Requesting location permission…");
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const location = { latitude: coords.latitude, longitude: coords.longitude };
        latestCoordinates.current = location;
        setState("active");
        void syncLocation(location);
      },
      (error) => {
        stopTracking();
        setState("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission is blocked. Allow it in browser settings, then try again."
            : "Your location is unavailable. Check GPS and try again."
        );
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 }
    );

    heartbeatId.current = window.setInterval(() => {
      if (latestCoordinates.current) {
        void syncLocation(latestCoordinates.current, true);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [stopTracking, syncLocation]);

  useEffect(() => {
    async function retryQueuedLocation() {
      try {
        const queued = await readQueuedLocation();
        if (!queued) return;
        if (Date.now() - queued.capturedAt > MAX_QUEUED_LOCATION_AGE_MS) {
          await safelyClearQueuedLocation();
          return;
        }
        await syncLocation(
          { latitude: queued.latitude, longitude: queued.longitude },
          true
        );
      } catch {
        // IndexedDB may be unavailable in private browsing; live sync still works.
      }
    }
    window.addEventListener("online", retryQueuedLocation);
    if (navigator.onLine) void retryQueuedLocation();
    return () => window.removeEventListener("online", retryQueuedLocation);
  }, [syncLocation]);

  useEffect(() => stopTracking, [stopTracking]);

  const tracking = state === "active" || state === "queued";
  return (
    <section className="mx-auto mt-3 flex w-[min(100%-2rem,72rem)] flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 rounded-xl p-2 ${tracking ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {tracking ? <LocateFixed size={18} /> : <MapPinOff size={18} />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">Driver location</strong>
            <span className={`badge ${tracking ? "bg-emerald-100 text-emerald-700" : state === "error" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
              {state === "queued" ? "Retry queued" : tracking ? "Live" : "Off"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{message}</p>
          {lastSyncedAt && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
              <ShieldCheck size={12} /> Last synced {lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={tracking ? stopTracking : startTracking}
        disabled={state === "unsupported"}
        className={tracking ? "btn-secondary shrink-0" : "btn-primary shrink-0"}
      >
        {state === "queued" && <RefreshCw size={15} />}
        {tracking ? "Stop sharing" : "Share location"}
      </button>
    </section>
  );
}
