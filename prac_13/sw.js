// Имя кэша
const CACHE_NAME = 'notes-pwa-v3';

// Ресурсы для кэширования
const urlsToCache = [
    '/prac_13/',
    '/prac_13/index.html',
    '/prac_13/app.js',
    '/prac_13/manifest.json',
    '/prac_13/icons/icon-72x72.png',
    '/prac_13/icons/icon-96x96.png',
    '/prac_13/icons/icon-128x128.png',
    '/prac_13/icons/icon-144x144.png',
    '/prac_13/icons/icon-152x152.png',
    '/prac_13/icons/icon-192x192.png',
    '/prac_13/icons/icon-384x384.png',
    '/prac_13/icons/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Установка');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Кэширование ресурсов');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] Установка завершена');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Ошибка кэширования:', error);
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Активация');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Активация завершена');
            return self.clients.claim();
        })
    );
});

// Перехват запросов
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    if (url.hostname !== self.location.hostname) return;
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('[SW] Из кэша:', event.request.url);
                    return response;
                }
                
                console.log('[SW] Из сети:', event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[SW] Ошибка сети:', error);
                        
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/prac_13/index.html');
                        }
                        
                        return new Response('Офлайн режим: ресурс недоступен', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});