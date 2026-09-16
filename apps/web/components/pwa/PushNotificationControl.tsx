"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";

type PushState =
  | "loading"
  | "unsupported"
  | "unconfigured"
  | "blocked"
  | "disabled"
  | "enabled";

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function PushNotificationControl() {
  const [state, setState] = useState<PushState>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function inspect() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (active) setState("unsupported");
        return;
      }
      try {
        const response = await fetch("/api/push/config", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.data?.enabled || !result.data.publicKey) {
          if (active) setState("unconfigured");
          return;
        }
        if (Notification.permission === "denied") {
          if (active) setState("blocked");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!active) return;
        setPublicKey(result.data.publicKey);
        setState(subscription ? "enabled" : "disabled");
      } catch {
        if (active) setState("disabled");
      }
    }
    void inspect();
    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    if (!publicKey || busy) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setState("disabled");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "disabled");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        await subscription.unsubscribe();
        throw new Error("Subscription could not be saved.");
      }
      setState("enabled");
    } catch {
      setState("disabled");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported" || state === "unconfigured") return null;
  const enabled = state === "enabled";
  const title = state === "blocked"
    ? "Notifications are blocked in browser settings"
    : enabled
      ? "Turn off delivery notifications"
      : "Turn on delivery notifications";

  return (
    <button
      type="button"
      className="portal-icon-button"
      onClick={toggle}
      disabled={busy || state === "loading" || state === "blocked"}
      title={title}
      aria-label={title}
      aria-pressed={enabled}
    >
      {busy || state === "loading" ? (
        <LoaderCircle size={17} className="animate-spin" />
      ) : enabled ? (
        <Bell size={17} />
      ) : (
        <BellOff size={17} />
      )}
      <span className="hidden lg:inline">{enabled ? "Alerts on" : "Alerts off"}</span>
    </button>
  );
}
