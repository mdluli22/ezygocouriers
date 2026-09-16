const STATIC_CACHE = "ezygo-static-v3";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/EzyGoIcon.png", "/GoLogo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("ezygo-static-") && key !== STATIC_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableStaticAsset(url) {
  if (url.pathname === "/sw.js") return false;
  if (url.pathname.startsWith("/_next/static/")) return true;

  return /\.(?:css|js|woff2?|png|jpe?g|gif|webp|svg|ico)$/i.test(
    url.pathname
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated data, API payloads, or payment callbacks.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match(OFFLINE_URL);
        return fallback ?? Response.error();
      })
    );
    return;
  }

  if (!isCacheableStaticAsset(url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let message = {
    title: "EzyGo update",
    body: "There is an update to your delivery.",
    url: "/dashboard",
    tag: "ezygo-update",
  };

  try {
    if (event.data) message = { ...message, ...event.data.json() };
  } catch {
    // Keep the safe default when a provider sends malformed payload data.
  }

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/EzyGoIcon.png",
      badge: "/EzyGoIcon.png",
      tag: message.tag,
      renotify: true,
      data: { url: message.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url || "/dashboard";
  const targetUrl = new URL(requestedUrl, self.location.origin);
  if (targetUrl.origin !== self.location.origin) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          void client.navigate(targetUrl.href);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl.href);
    })
  );
});
