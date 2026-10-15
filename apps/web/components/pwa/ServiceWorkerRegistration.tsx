"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      let disposed = false;
      // A worker installed during a production preview survives a switch to
      // next dev. Merely skipping registration does not stop that worker.
      const removePreviewWorker = async () => {
        const scriptURL = new URL("/sw.js", window.location.origin).href;
        const wasControlled = navigator.serviceWorker.controller?.scriptURL === scriptURL;
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.filter(registration =>
          [registration.active, registration.waiting, registration.installing]
            .some(worker => worker?.scriptURL === scriptURL)
        ).map(registration => registration.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter(key => key.startsWith("ezygo-static-"))
            .map(key => caches.delete(key)));
        }
        // Unregistering alone leaves the current document controlled until
        // its next navigation. Reload once to use fresh development chunks.
        if (wasControlled && !disposed) window.location.reload();
      };
      void removePreviewWorker().catch(error => {
        console.warn("Could not remove the EzyGo preview service worker", error);
      });
      return () => { disposed = true; };
    }

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch(error => {
        console.warn("Could not register the EzyGo service worker", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
