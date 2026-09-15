/**
 * sw.js – Cache-first Service Worker for DroneTrainer PWA.
 * Precaches all static assets on install; serves from cache with
 * network fallback during fetch.
 */

const CACHE_NAME = 'dronetrainer-v1';

// All assets to precache on install
const PRECACHE_URLS = [
  '/dronetrainer/',
  '/dronetrainer/index.html',
  '/dronetrainer/manifest.json',
  '/dronetrainer/icons/icon-192.png',
  '/dronetrainer/icons/icon-512.png',
  '/dronetrainer/src/main.js',
  '/dronetrainer/src/styles/base.css',
  '/dronetrainer/src/styles/hud.css',
  '/dronetrainer/src/styles/joystick.css',
  '/dronetrainer/src/styles/overlays.css',
  '/dronetrainer/src/styles/progress.css',
  '/dronetrainer/src/modules/state.js',
  '/dronetrainer/src/modules/scene.js',
  '/dronetrainer/src/modules/physics.js',
  '/dronetrainer/src/modules/joystick.js',
  '/dronetrainer/src/modules/levels.js',
  '/dronetrainer/src/modules/gates.js',
  '/dronetrainer/src/modules/freestyle.js',
  '/dronetrainer/src/modules/missions.js',
  '/dronetrainer/src/modules/hud.js',
  '/dronetrainer/src/modules/flightState.js',
  '/dronetrainer/src/modules/overlays.js',
  '/dronetrainer/src/modules/progress.js',
  '/dronetrainer/src/modules/loop.js',
  // Three.js ESM build from CDN (cached after first network fetch)
  'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js'
];

// Install: precache all listed assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      }).catch(() => {
        // Offline fallback: return the cached index for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/dronetrainer/index.html');
        }
      });
    })
  );
});
