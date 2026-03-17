const CACHE_NAME = "smart-time-v3"; // 🔥 CAMBIAMOS A V3 PARA FORZAR EL DISEÑO NUEVO
const urlsToCache = ["./index.html", "./style.css", "./app.js", "./manifest.json", "./icon.png"];

self.addEventListener("install", event => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
