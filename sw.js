/**
 * sw.js – Service Worker for DroneTrainer PWA.
 * Network-first for code/assets so students always receive updates when online;
 * falls back to Cache for complete offline functionality.
 */

const CACHE_NAME = 'dronetrainer-v2.3.0';

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
  'src/modules/levels/index.js',
  'src/modules/levels/common.js',
  'src/modules/levels/academy/level-01.js',
  'src/modules/levels/academy/level-02.js',
  'src/modules/levels/academy/level-03.js',
  'src/modules/levels/academy/level-04.js',
  'src/modules/levels/academy/level-05.js',
  'src/modules/levels/academy/level-06.js',
  'src/modules/levels/academy/level-07.js',
  'src/modules/levels/academy/level-08.js',
  'src/modules/levels/academy/level-09.js',
  'src/modules/levels/academy/level-10.js',
  'src/modules/levels/academy/level-11.js',
  'src/modules/levels/academy/level-12.js',
  'src/modules/levels/academy/level-13.js',
  'src/modules/levels/academy/level-14.js',
  'src/modules/levels/academy/level-15.js',
  'src/modules/levels/academy/level-16.js',
  'src/modules/levels/academy/level-17.js',
  'src/modules/levels/academy/level-18.js',
  'src/modules/levels/challenges/challenge-01.js',
  'src/modules/levels/challenges/challenge-02.js',
  'src/modules/levels/challenges/challenge-03.js',
  'src/modules/levels/challenges/challenge-04.js',
  'src/modules/levels/challenges/challenge-05.js',
  'src/modules/levels/challenges/challenge-06.js',
  'src/modules/levels/challenges/challenge-07.js',
  'src/modules/levels/challenges/challenge-08.js',
  'src/modules/levels/challenges/challenge-09.js',
  'src/modules/levels/challenges/challenge-10.js',
  'src/modules/gates.js',
  'src/modules/freestyle.js',
  'src/modules/missions.js',
  'src/modules/hud.js',
  'src/modules/flightState.js',
  'src/modules/overlays.js',
  'src/modules/progress.js',
  'src/modules/loop.js',
  'src/modules/updater.js'
];

// Precache URLs as absolute strings so cache matching is exact across all platforms
const PRECACHE_URLS = RELATIVE_ASSETS.map(p => new URL(p, BASE).href);

// Precache helper
async function precacheAll(cache) {
  await Promise.all(
    PRECACHE_URLS.map(async url => {
      try {
        const resp = await fetch(url, { cache: 'reload' });
        if (resp && resp.status === 200) {
          await cache.put(url, resp);
        }
      } catch (e) {
        console.warn('[SW] Could not precache:', url, e);
      }
    })
  );
}

// Install: precache all core assets and activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => precacheAll(cache))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete any old caches (v1, v2, etc.) and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()).then(async () => {
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', cacheName: CACHE_NAME }));
    })
  );
});

// Message listener for client coordination
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'REFRESH_CACHE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async cache => {
        await precacheAll(cache);
        const clients = await self.clients.matchAll();
        clients.forEach(c => c.postMessage({ type: 'CACHE_REFRESHED', cacheName: CACHE_NAME }));
      })
    );
  }
});

// Fetch strategy:
// 1. version.json: NEVER cache; direct network-only so version checking is live
// 2. Static vendor/icons: cache-first with network fallback
// 3. Navigation & code: network-first with cache fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore cross-origin non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // version.json is strictly live network
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

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
              return caches.match(new URL('index.html', BASE).href);
            }
          });
        })
    );
  }
});
