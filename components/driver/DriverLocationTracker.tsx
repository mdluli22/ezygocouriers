"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const MINIMUM_SYNC_INTERVAL_MS = 30 * 1000;

type Coordinates = { latitude: number; longitude: number };

export default function DriverLocationTracker() {
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    let latestCoordinates: Coordinates | null = null;
    let lastSyncAt = 0;

    async function syncLocation(coordinates: Coordinates, force = false) {
      const now = Date.now();
      if (!force && now - lastSyncAt < MINIMUM_SYNC_INTERVAL_MS) return;
      lastSyncAt = now;

      try {
        await fetch("/api/driver/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(coordinates),
        });
      } catch {
        // The next position event or heartbeat retries automatically.
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        latestCoordinates = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        void syncLocation(latestCoordinates);
      },
      () => {
        // Location permission errors are non-fatal; the driver simply remains
        // ineligible for proximity-based automatic assignment.
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 20_000,
      }
    );

    const heartbeatId = window.setInterval(() => {
      if (latestCoordinates) void syncLocation(latestCoordinates, true);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(heartbeatId);
    };
  }, []);

  return null;
}
