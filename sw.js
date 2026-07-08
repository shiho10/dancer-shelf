/* ダンサー棚 PWA — offline app shell (cache-first for same-origin, network for IG/Threads) */
const CACHE = "dancer-shelf-v1";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-180.png", "./icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(req) {
  return fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
    return res;
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let instagram.com / threads.com go straight to network

  const isHTML = req.mode === "navigate" || url.pathname === "/" ||
                 url.pathname.endsWith("/") || url.pathname.endsWith("index.html");

  if (isHTML) {
    // network-first: always show the latest shelf when online, fall back to cache offline
    e.respondWith(fromNetwork(req).catch(() => caches.match(req).then((r) => r || caches.match("./index.html"))));
  } else {
    // static assets (icons, manifest): cache-first for speed & offline
    e.respondWith(caches.match(req).then((hit) => hit || fromNetwork(req)));
  }
});
