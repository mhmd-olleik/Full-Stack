// ── ChatApp Service Worker ────────────────────────────────────
const CACHE_NAME = "chatapp-v3";
const STATIC_ASSETS = ["/", "/index.html"];

// ── Install ───────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate — clean old caches ───────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch — serve from cache, fallback to network ────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── 🔔 Push — show system notification ───────────────────────
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data?.json() || {}; } catch { data = { title: "ChatApp", body: e.data?.text() }; }

  const title = data.title || "ChatApp";
  const options = {
    body: data.body || "New message",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "chatapp-msg",
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: data.data || {},
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "dismiss") return;

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      const existing = windowClients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      // Open new window
      return clients.openWindow("/");
    })
  );
});
