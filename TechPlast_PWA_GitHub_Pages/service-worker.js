/* TechPlast КАЛИБЪР — service worker
   Стратегия:
   - Самото приложение (HTML): ПЪРВО ОТ МРЕЖАТА → винаги виждаш последната качена версия.
     Ако няма интернет, се пада на кеша, така че приложението работи и офлайн.
   - Икони и manifest: първо от кеша, но се обновяват тихо във фон.
   Така НЕ се налага да сменяш номера на кеша при всяко качване в GitHub. */

const CACHE = "techplast-kalibar-v2";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isAppDocument(req) {
  return req.mode === "navigate" || req.destination === "document" ||
         req.url.endsWith("/index.html") || req.url.endsWith("/");
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Приложението: МРЕЖА първо → винаги най-новото; кеш само при липса на интернет
  if (isAppDocument(req)) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Статични файлове: кеш първо, тихо обновяване във фон
  event.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
