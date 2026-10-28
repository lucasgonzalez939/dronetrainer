/**
 * updater.js – Automatic update manager for DroneTrainer PWA & web client.
 *
 * Capabilities:
 * - Detects when the local version is outdated via live version.json check & Service Worker.
 * - Auto-downloads the update in the background when internet is available.
 * - Safely applies the update:
 *     - If drone is idle (landed/crashed/in menus), applies automatically after brief toast.
 *     - If user is mid-flight, holds update and applies as soon as landing occurs,
 *       or immediately if user taps the floating update banner.
 * - Supports disabling automatic updates via user toggle in configuration menu.
 * - Works identically in browser and standalone PWA mode (e.g. Lenovo Yoga tablets).
 * - Provides manual "Buscar actualización" trigger in the configuration menu.
 */

import { FlightState, drone } from './state.js';

export const APP_VERSION = '2.6.0';
export const APP_BUILD = 1740690000000;

const AUTO_UPDATE_STORAGE_KEY = 'dronetrainer_auto_updates_enabled';

export let isAutoUpdateEnabled = (() => {
  try {
    const val = localStorage.getItem(AUTO_UPDATE_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch (e) {
    return true;
  }
})();

export function setAutoUpdateEnabled(enabled) {
  isAutoUpdateEnabled = !!enabled;
  try {
    localStorage.setItem(AUTO_UPDATE_STORAGE_KEY, isAutoUpdateEnabled ? 'true' : 'false');
  } catch (e) {}

  if (!manualStatusEl) {
    manualStatusEl = document.getElementById('cfg-update-status');
  }
  if (manualStatusEl) {
    if (!isAutoUpdateEnabled) {
      manualStatusEl.textContent = '⏸️ Actualizaciones automáticas desactivadas. Usa "Buscar ahora" para actualizar manualmente.';
      manualStatusEl.style.color = '#ffb74d';
    } else {
      manualStatusEl.textContent = '🔄 Actualizaciones automáticas activadas.';
      manualStatusEl.style.color = '#4caf50';
    }
  }
}

let swRegistration = null;
let isUpdateReady = false;
let isUpdatePending = false;
let isChecking = false;

// DOM references
let bannerEl = null;
let bannerIcon = null;
let bannerText = null;
let bannerBtn = null;
let bannerClose = null;
let manualStatusEl = null;

export function isDroneIdle() {
  if (!drone) return true;
  return drone.state === FlightState.LANDED || drone.state === FlightState.CRASHED;
}

export function showUpdateBanner({ icon = '🔄', text = '', showBtn = false, btnText = 'APLICAR' } = {}) {
  if (!bannerEl) {
    bannerEl = document.getElementById('update-banner');
    bannerIcon = document.getElementById('update-banner-icon');
    bannerText = document.getElementById('update-banner-text');
    bannerBtn = document.getElementById('update-banner-btn');
    bannerClose = document.getElementById('update-banner-close');
  }
  if (!bannerEl) return;

  if (bannerIcon) bannerIcon.textContent = icon;
  if (bannerText) bannerText.textContent = text;
  if (bannerBtn) {
    bannerBtn.style.display = showBtn ? 'inline-block' : 'none';
    bannerBtn.textContent = btnText;
  }
  bannerEl.style.display = 'block';
}

export function hideUpdateBanner() {
  if (bannerEl) bannerEl.style.display = 'none';
}

export function applyUpdate() {
  showUpdateBanner({
    icon: '⚡',
    text: 'Reiniciando simulador con la nueva versión...',
    showBtn: false
  });
  setTimeout(() => {
    window.location.reload();
  }, 350);
}

export function notifyFlightStateChanged(newState) {
  if (isUpdatePending && isAutoUpdateEnabled && (newState === FlightState.LANDED || newState === FlightState.CRASHED)) {
    applyUpdate();
  }
}

function onUpdateDownloaded() {
  isUpdateReady = true;

  // If auto-updates are disabled, do not auto-apply or force reload
  if (!isAutoUpdateEnabled) {
    showUpdateBanner({
      icon: '✨',
      text: 'Nueva versión lista en caché',
      showBtn: true,
      btnText: 'APLICAR'
    });
    return;
  }

  if (isDroneIdle()) {
    showUpdateBanner({
      icon: '✅',
      text: 'Actualización descargada. Aplicando...',
      showBtn: false
    });
    setTimeout(() => {
      applyUpdate();
    }, 1200);
  } else {
    isUpdatePending = true;
    showUpdateBanner({
      icon: '✨',
      text: 'Actualización lista · Se aplicará al aterrizar',
      showBtn: true,
      btnText: 'APLICAR AHORA'
    });
  }
}

export async function checkForUpdates({ manual = false } = {}) {
  // If auto-updates are turned off and this is an automated trigger, skip
  if (!manual && !isAutoUpdateEnabled) {
    return;
  }

  if (isChecking) return;
  isChecking = true;

  if (!manualStatusEl) {
    manualStatusEl = document.getElementById('cfg-update-status');
  }

  if (!navigator.onLine) {
    if (manual && manualStatusEl) {
      manualStatusEl.textContent = '⚠️ Sin conexión a internet (Modo Offline activo)';
      manualStatusEl.style.color = '#ff9800';
    }
    isChecking = false;
    return;
  }

  if (manual && manualStatusEl) {
    manualStatusEl.textContent = '🔍 Comprobando actualizaciones en el servidor...';
    manualStatusEl.style.color = '#00e5ff';
  }

  try {
    // Determine path to version.json (handles relative subpaths)
    const baseHref = window.location.href.split('?')[0].split('#')[0];
    const versionUrl = new URL('version.json', baseHref).href + `?_t=${Date.now()}`;

    const resp = await fetch(versionUrl, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });

    if (resp && resp.status === 200) {
      const data = await resp.json();
      const isRemoteNewer = (data.version && data.version !== APP_VERSION) ||
                            (data.buildTime && data.buildTime > APP_BUILD);

      if (isRemoteNewer) {
        console.log(`[Updater] Outdated version detected. Current: v${APP_VERSION}, Remote: v${data.version}`);
        showUpdateBanner({
          icon: '🔄',
          text: `Descargando actualización (v${data.version})...`,
          showBtn: false
        });

        if (manual && manualStatusEl) {
          manualStatusEl.textContent = `🔄 Nueva versión v${data.version} encontrada. Descargando...`;
          manualStatusEl.style.color = '#00e5ff';
        }

        // Trigger Service Worker update check
        if (swRegistration) {
          await swRegistration.update().catch(() => {});
        }
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'REFRESH_CACHE' });
        }
        isChecking = false;
        return;
      } else {
        if (manual && manualStatusEl) {
          manualStatusEl.textContent = `✅ El simulador está actualizado (v${APP_VERSION})`;
          manualStatusEl.style.color = '#4caf50';
        }
      }
    }
  } catch (err) {
    console.warn('[Updater] Could not fetch version.json:', err);
    if (manual && manualStatusEl) {
      manualStatusEl.textContent = '⚠️ Error al conectar con el servidor de actualización.';
      manualStatusEl.style.color = '#f44336';
    }
  }

  // Also query the Service Worker registration update API
  if (swRegistration) {
    try {
      await swRegistration.update();
    } catch (_) {}
  }

  isChecking = false;
}

export function initUpdater() {
  bannerEl = document.getElementById('update-banner');
  bannerIcon = document.getElementById('update-banner-icon');
  bannerText = document.getElementById('update-banner-text');
  bannerBtn = document.getElementById('update-banner-btn');
  bannerClose = document.getElementById('update-banner-close');
  manualStatusEl = document.getElementById('cfg-update-status');

  if (bannerBtn) {
    bannerBtn.addEventListener('click', () => {
      applyUpdate();
    });
  }
  if (bannerClose) {
    bannerClose.addEventListener('click', () => {
      hideUpdateBanner();
    });
  }

  const btnCheckUpdates = document.getElementById('btn-check-updates');
  if (btnCheckUpdates) {
    btnCheckUpdates.addEventListener('click', () => {
      checkForUpdates({ manual: true });
    });
  }

  // Toggle for auto-updates
  const cfgAutoUpdates = document.getElementById('cfg-auto-updates');
  if (cfgAutoUpdates) {
    cfgAutoUpdates.checked = isAutoUpdateEnabled;
    cfgAutoUpdates.addEventListener('change', () => {
      setAutoUpdateEnabled(cfgAutoUpdates.checked);
    });
  }

  const appVersionLabel = document.getElementById('cfg-app-version');
  if (appVersionLabel) {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    appVersionLabel.textContent = `v${APP_VERSION} · ${isPWA ? 'PWA Instalada' : 'Navegador Web'}`;
  }

  // Register Service Worker with cache-busting update policy
  if ('serviceWorker' in navigator) {
    const swPath = './sw.js';
    navigator.serviceWorker.register(swPath, { updateViaCache: 'none' })
      .then(reg => {
        swRegistration = reg;

        // Check if an updated SW is already waiting
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          onUpdateDownloaded();
        }

        // Listen for new installing workers
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          if (isAutoUpdateEnabled) {
            showUpdateBanner({
              icon: '🔄',
              text: 'Descargando nueva versión del simulador...',
              showBtn: false
            });
          }

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available!
                onUpdateDownloaded();
              }
            }
          });
        });
      })
      .catch(() => {
        // Fallback registration path if deployed in /dronetrainer/
        navigator.serviceWorker.register('/dronetrainer/sw.js', { updateViaCache: 'none' })
          .then(reg => { swRegistration = reg; })
          .catch(() => {});
      });

    // When the controller changes (new service worker took over), handle update
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      onUpdateDownloaded();
    });

    // Listen for messages from sw.js
    navigator.serviceWorker.addEventListener('message', event => {
      if (!event.data) return;
      if (event.data.type === 'CACHE_REFRESHED' || event.data.type === 'SW_ACTIVATED') {
        onUpdateDownloaded();
      }
    });
  }

  // Initial check when internet is available (if enabled)
  setTimeout(() => {
    checkForUpdates({ manual: false });
  }, 1800);

  // Network and visibility event listeners
  window.addEventListener('online', () => {
    console.log('[Updater] Internet connection restored. Checking for updates...');
    checkForUpdates({ manual: false });
  });

  window.addEventListener('focus', () => {
    checkForUpdates({ manual: false });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates({ manual: false });
    }
  });

  // Periodic background check every 3 minutes
  setInterval(() => {
    checkForUpdates({ manual: false });
  }, 3 * 60 * 1000);
}
