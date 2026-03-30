// Имя кэша
const CACHE_NAME = 'notes-pwa-v2';

// Ресурсы для кэширования
const urlsToCache = [
    '/notes-app/',
    '/notes-app/index.html',
    '/notes-app/app.js',
    '/notes-app/manifest.json',
    '/notes-app/icons/icon-72x72.png',
    '/notes-app/icons/icon-96x96.png',
    '/notes-app/icons/icon-128x128.png',
    '/notes-app/icons/icon-144x144.png',
    '/notes-app/icons/icon-152x152.png',
    '/notes-app/icons/icon-192x192.png',
    '/notes-app/icons/icon-384x384.png',
    '/notes-app/icons/icon-512x512.png'
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
    // Пропускаем не-GET запросы
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Пропускаем запросы к внешним ресурсам
    const url = new URL(event.request.url);
    if (url.hostname !== self.location.hostname) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Найдено в кэше
                if (response) {
                    console.log('[SW] Из кэша:', event.request.url);
                    return response;
                }
                
                // Запрос в сеть
                console.log('[SW] Из сети:', event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        // Проверяем валидность ответа
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // Кэшируем успешные ответы
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(error => {
                                console.error('[SW] Ошибка кэширования:', error);
                            });
                        
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[SW] Ошибка сети:', error);
                        
                        // Для HTML запросов возвращаем офлайн страницу
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/notes-app/index.html');
                        }
                        
                        return new Response('Офлайн режим: ресурс недоступен', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Обработка сообщений
self.addEventListener('message', event => {
    console.log('[SW] Получено сообщение:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});