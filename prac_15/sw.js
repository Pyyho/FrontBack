const CACHE_NAME = 'notes-cache-v3';
const DYNAMIC_CACHE_NAME = 'dynamic-content-v2';

const ASSETS = [
    '/prac_15/',
    '/prac_15/index.html',
    '/prac_15/app.js',
    '/prac_15/manifest.json',
    '/prac_15/icons/icon-72x72.png',
    '/prac_15/icons/icon-96x96.png',
    '/prac_15/icons/icon-128x128.png',
    '/prac_15/icons/icon-144x144.png',
    '/prac_15/icons/icon-152x152.png',
    '/prac_15/icons/icon-192x192.png',
    '/prac_15/icons/icon-384x384.png',
    '/prac_15/icons/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Установка');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Активация Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Активация');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Перехват запросов
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Пропускаем запросы к внешним источникам
    if (url.origin !== self.location.origin) return;
    
    // Динамические страницы (content/*) – Network First
    if (url.pathname.includes('/content/')) {
        event.respondWith(
            fetch(event.request)
                .then(networkRes => {
                    const resClone = networkRes.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(event.request, resClone);
                    });
                    return networkRes;
                })
                .catch(() => {
                    return caches.match(event.request)
                        .then(cached => cached || caches.match('/prac_15/content/home.html'));
                })
        );
        return;
    }
    
    // Статические ресурсы – Cache First
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(networkRes => {
                        const resClone = networkRes.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, resClone);
                        });
                        return networkRes;
                    });
            })
    );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
    let data = { title: 'Новое уведомление', body: '' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: '/prac_15/icons/icon-192x192.png',
        badge: '/prac_15/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/prac_15/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/prac_15/')
    );
});

// Обработка сообщений
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});