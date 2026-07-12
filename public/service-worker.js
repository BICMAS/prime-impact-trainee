const CACHE_NAME = "prime-impact-app-v1";

/* ---------------- INSTALL ---------------- */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

/* ---------------- ACTIVATE ---------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------------- PUSH EVENT ---------------- */
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Prime Impact Announcement",
      body: event.data?.text(),
    };
  }

  const title = data.title || "Prime Impact Announcement";

  const options = {
    body: data.body || "New announcement available",
    icon: "/img/prime-impact-logo.png",
    badge: "/img/prime-impact-logo.png",
    tag: "prime-impact-announcement",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ---------------- NOTIFICATION CLICK ---------------- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).toString();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }
    )
  );
});

/* ---------------- FETCH / CACHING ---------------- */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isApiRequest = url.pathname.includes("/api/");

  // API requests → network only (do not serve stale API responses from cache)
  if (isApiRequest) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML requests → network first
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets → cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (!response.ok || response.type === "opaque") {
            return response;
          }

          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });

          return response;
        })
      );
    })
  );
});