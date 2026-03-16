const CACHE_NAME = "smart-time-v2"; // ¡Cambiado a v2!
const urlsToCache = ["./index.html", "./style.css", "./app.js", "./manifest.json", "./icon.png"];

self.addEventListener("install", event => {
    // Forzar al Service Worker a instalarse inmediatamente
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener("activate", event => {
    // Limpiar cachés antiguas (la v1 que tenía el error)
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
});;
