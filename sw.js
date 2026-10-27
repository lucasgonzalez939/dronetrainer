/**
 * sw.js – Service Worker for DroneTrainer PWA.
 * Network-first for code/assets so students always receive updates when online;
 * falls back to Cache for complete offline functionality.
 */

const CACHE_NAME = 'dronetrainer-v2';

// Base path detection (supports both /dronetrainer/ and /)
const BASE = self.registration.scope.endsWith('/')
  ? self.registration.scope
  : self.registration.scope + '/';

const RELATIVE_ASSETS = [
  '',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'src/vendor/three.module.js',
  'src/main.js',
  'src/styles/base.css',
  'src/styles/hud.css',
  'src/styles/joystick.css',
  'src/styles/overlays.css',
  'src/styles/progress.css',
  'src/modules/three.js',
  'src/modules/assets.js',
  'src/modules/state.js',
  'src/modules/scene.js',
  'src/modules/physics.js',
  'src/modules/joystick.js',
  'src/modules/levels.js',
  'src/modules/gates.js',
  'src/modules/freestyle.js',
  'src/modules/missions.js',
  'src/modules/hud.js',
  'src/modules/flightState.js',
  'src/modules/overlays.js',
  'src/modules/progress.js',
  'src/modules/loop.js'
];

const PRECACHE_URLS = RELATIVE_ASSETS.map(p => new URL(p, BASE).pathname);

// Install: precache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(
        PRECACHE_URLS.map(async url => {
          try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (resp && resp.status === 200) {
              await cache.put(url, resp);
            }
          } catch (e) {
            console.warn('[SW] Could not precache:', url, e);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: delete any old caches (v1, etc.) and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// For navigation (HTML) & scripts/styles: network-first with cache fallback
// For static vendor/images: cache-first with network fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore cross-origin non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  const isStaticVendorOrIcon = url.pathname.includes('/vendor/') || url.pathname.includes('/icons/');

  if (isStaticVendorOrIcon) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
  } else {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') {
              return caches.match(new URL('index.html', BASE).pathname);
            }
          });
        })
    );
  }
});
