// Service Worker for Sport Shop PWA
const CACHE_NAME = 'sport-shop-cache-v2'

// Files to cache for offline access - эти файлы создаются при сборке React
// Для development режима используем другой подход
const isDevelopment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

// Базовые файлы для кэширования
const BASE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Иконки для кэширования
const ICON_ASSETS = [
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/favicon.ico'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Caching base assets and icons')
        
        // Cache base assets
        try {
          await cache.addAll(BASE_ASSETS)
        } catch (error) {
          console.error('[SW] Failed to cache base assets:', error)
        }
        
        // Cache icons (ignore failures in development)
        for (const asset of ICON_ASSETS) {
          try {
            const response = await fetch(asset)
            if (response.ok) {
              await cache.put(asset, response)
              console.log(`[SW] Cached: ${asset}`)
            }
          } catch (error) {
            console.log(`[SW] Could not cache ${asset}:`, error)
          }
        }
        
        console.log('[SW] Caching complete')
      })
      .then(() => {
        console.log('[SW] Skip waiting')
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('[SW] Claiming clients')
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }
  
  // Skip API requests - они всегда должны идти в сеть
  if (url.pathname.startsWith('/api')) {
    return
  }
  
  // Skip WebSocket and EventSource
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return
  }
  
  // Skip Chrome DevTools requests
  if (url.pathname.includes('chrome-extension') || 
      url.pathname.includes('devtools') ||
      url.pathname.includes('__webpack')) {
    return
  }
  
  // Для статических ресурсов - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Возвращаем из кэша
          return cachedResponse
        }
        
        // Если нет в кэше, запрашиваем из сети
        return fetch(event.request)
          .then((networkResponse) => {
            // Не кэшируем ошибки
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse
            }
            
            // Кэшируем только статические ресурсы
            const shouldCache = 
              url.pathname.endsWith('.js') ||
              url.pathname.endsWith('.css') ||
              url.pathname.endsWith('.json') ||
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.jpg') ||
              url.pathname.endsWith('.svg') ||
              url.pathname.endsWith('.ico') ||
              url.pathname === '/' ||
              url.pathname === '/index.html'
            
            if (shouldCache) {
              const responseToCache = networkResponse.clone()
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache)
                })
                .catch((error) => {
                  console.error('[SW] Failed to cache:', error)
                })
            }
            
            return networkResponse
          })
          .catch((error) => {
            console.log('[SW] Fetch failed, returning offline fallback:', error)
            
            // Для HTML запросов возвращаем index.html из кэша
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html')
            }
            
            // Для остальных запросов возвращаем заглушку
            return new Response('Offline - resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            })
          })
      })
  )
})

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})