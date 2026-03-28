const CACHE_NAME = 'notes-app-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css',
    '/manifest.json',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/icons/favicon.ico'
];

// Установка Service Worker - кэшируем ресурсы
self.addEventListener('install', (event) => {
    console.log('[SW] Установка Service Worker');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Кэширование ресурсов...');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('[SW] Ресурсы закэшированы');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] Ошибка кэширования:', err);
            })
    );
});

// Активация Service Worker - очищаем старые кэши
self.addEventListener('activate', (event) => {
    console.log('[SW] Активация Service Worker');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service Worker активирован');
            return self.clients.claim();
        })
    );
});

// Перехват запросов - стратегия "Cache First, then Network"
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Не кэшируем запросы к API (если есть)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Если ресурс есть в кэше - возвращаем его
                if (cachedResponse) {
                    console.log('[SW] Из кэша:', event.request.url);
                    return cachedResponse;
                }
                
                // Если нет - идем в сеть
                console.log('[SW] Из сети:', event.request.url);
                return fetch(event.request)
                    .then((response) => {
                        // Кэшируем новый ресурс
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch((err) => {
                        console.error('[SW] Ошибка сети:', err);
                        // Возвращаем fallback страницу для HTML запросов
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        return new Response('Офлайн режим: ресурс недоступен', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
    console.log('[SW] Получено сообщение:', event.data);
    
    if (event.data.type === 'CLIENT_READY') {
        console.log('[SW] Клиент готов к работе');
    }
});

// Фоновая синхронизация (опционально)
self.addEventListener('sync', (event) => {
    console.log('[SW] Событие синхронизации:', event.tag);
    
    if (event.tag === 'sync-notes') {
        event.waitUntil(syncNotes());
    }
});

async function syncNotes() {
    console.log('[SW] Синхронизация заметок...');
    // Здесь можно добавить логику синхронизации с сервером
}