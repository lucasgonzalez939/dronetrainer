/**
 * main.js – Application entry point.
 * Initialises all modules, wires up events, and starts the game loop.
 */

import { initScene } from './modules/scene.js';
import { initJoysticks } from './modules/joystick.js';
import { initOverlayEvents, showLevelOverlay } from './modules/overlays.js';
import { applySpeedPreset } from './modules/flightState.js';
import { setFlightState } from './modules/flightState.js';
import { loadLevel } from './modules/levels.js';
import { loadFreestyle, exitFreestyleMode, FREESTYLE_WIND_PRESETS } from './modules/freestyle.js';
import {
  FlightState, DIFFICULTY, JOY_CONFIG,
  drone, isFreestyleMode,
  fsWindPreset, setFsWindPreset,
  windVector, setWindVector,
  isFPVMode, setIsFPVMode,
  currentLevel
} from './modules/state.js';
import { startLoop } from './modules/loop.js';

// ── Initialise Three.js scene ──
initScene();

// ── Initialise joysticks ──
initJoysticks();

// ── Overlay event wiring (level select, progress panel, etc.) ──
initOverlayEvents();

// ── Takeoff / Land button ──
const btnTakeoff = document.getElementById('btn-takeoff');
btnTakeoff.addEventListener('click', () => {
  if (drone.state === FlightState.LANDED) {
    setFlightState(FlightState.TAKING_OFF);
  } else if (drone.state === FlightState.FLYING) {
    setFlightState(FlightState.LANDING);
  } else if (drone.state === FlightState.CRASHED) {
    if (isFreestyleMode) {
      loadFreestyle();
    } else {
      loadLevel(currentLevel);
    }
  }
});

// ── Config menu ──
document.getElementById('btn-open-config').addEventListener('click', () => {
  document.getElementById('config-overlay').classList.add('active');
});
document.getElementById('btn-config-close').addEventListener('click', () => {
  document.getElementById('config-overlay').classList.remove('active');
});

// Speed preset buttons
document.querySelectorAll('.cfg-speed-btn').forEach(btn => {
  btn.addEventListener('click', () => applySpeedPreset(btn.dataset.speed));
});

// Battery toggle
const cfgBatteryOn  = document.getElementById('cfg-battery-on');
const cfgBatteryRow = document.getElementById('cfg-battery-slider-row');
const cfgBatteryTime= document.getElementById('cfg-battery-time');
const cfgBatteryVal = document.getElementById('cfg-battery-time-val');
cfgBatteryOn.addEventListener('change', () => {
  DIFFICULTY.batteryOn = cfgBatteryOn.checked;
  cfgBatteryRow.style.display = cfgBatteryOn.checked ? 'flex' : 'none';
});
cfgBatteryTime.addEventListener('input', () => {
  DIFFICULTY.batteryTime = +cfgBatteryTime.value;
  cfgBatteryVal.textContent = cfgBatteryTime.value + 's';
});

// Wind toggle
const cfgWindOn  = document.getElementById('cfg-wind-on');
const cfgWindRow = document.getElementById('cfg-wind-slider-row');
const cfgWindStr = document.getElementById('cfg-wind-strength');
const cfgWindVal = document.getElementById('cfg-wind-strength-val');
cfgWindOn.addEventListener('change', () => {
  DIFFICULTY.windOn = cfgWindOn.checked;
  cfgWindRow.style.display = cfgWindOn.checked ? 'flex' : 'none';
});
cfgWindStr.addEventListener('input', () => {
  DIFFICULTY.windStrength = +cfgWindStr.value;
  cfgWindVal.textContent = (+cfgWindStr.value).toFixed(1);
});

// Turbulence toggle
const cfgTurbOn  = document.getElementById('cfg-turb-on');
const cfgTurbRow = document.getElementById('cfg-turb-slider-row');
const cfgTurbStr = document.getElementById('cfg-turb-strength');
const cfgTurbVal = document.getElementById('cfg-turb-strength-val');
cfgTurbOn.addEventListener('change', () => {
  DIFFICULTY.turbOn = cfgTurbOn.checked;
  cfgTurbRow.style.display = cfgTurbOn.checked ? 'flex' : 'none';
});
cfgTurbStr.addEventListener('input', () => {
  DIFFICULTY.turbStrength = +cfgTurbStr.value;
  cfgTurbVal.textContent = (+cfgTurbStr.value).toFixed(1);
});

// VPS toggle
document.getElementById('cfg-vps-on').addEventListener('change', (e) => {
  DIFFICULTY.vpsOn = e.target.checked;
});

// Joystick sliders
const cfgJoySens    = document.getElementById('cfg-joy-sensitivity');
const cfgJoySensVal = document.getElementById('cfg-joy-sensitivity-val');
const cfgJoyCurve   = document.getElementById('cfg-joy-curve');
const cfgJoyCurveVal= document.getElementById('cfg-joy-curve-val');
const cfgJoyDead    = document.getElementById('cfg-joy-deadzone');
const cfgJoyDeadVal = document.getElementById('cfg-joy-deadzone-val');
cfgJoySens.addEventListener('input', () => {
  JOY_CONFIG.sensitivity = +cfgJoySens.value;
  cfgJoySensVal.textContent = (+cfgJoySens.value).toFixed(2);
});
cfgJoyCurve.addEventListener('input', () => {
  JOY_CONFIG.exponent = +cfgJoyCurve.value;
  cfgJoyCurveVal.textContent = (+cfgJoyCurve.value).toFixed(1);
});
cfgJoyDead.addEventListener('input', () => {
  JOY_CONFIG.deadzone = +cfgJoyDead.value;
  cfgJoyDeadVal.textContent = Math.round(cfgJoyDead.value * 100) + '%';
});

// ── FPV camera toggle ──
const fpvOverlay   = document.getElementById('fpv-overlay');
const btnCamToggle = document.getElementById('btn-cam-toggle');
btnCamToggle.addEventListener('click', () => {
  setIsFPVMode(!isFPVMode);
  if (isFPVMode) {
    btnCamToggle.classList.add('fpv-active');
    fpvOverlay.classList.add('active');
  } else {
    btnCamToggle.classList.remove('fpv-active');
    fpvOverlay.classList.remove('active');
  }
});

// ── Freestyle control panel buttons ──
document.getElementById('btn-new-map').addEventListener('click', () => {
  loadFreestyle();
});
document.getElementById('btn-exit-free').addEventListener('click', () => {
  exitFreestyleMode();
});

// Wind preset buttons
document.querySelectorAll('.wind-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setFsWindPreset(btn.dataset.wind);
    document.querySelectorAll('.wind-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (isFreestyleMode) {
      const wp = FREESTYLE_WIND_PRESETS[fsWindPreset];
      setWindVector(wp.dir.clone().multiplyScalar(wp.scale));
    }
  });
});

// ── Service Worker registration ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/dronetrainer/sw.js').catch(() => {
    // Fallback: try root-relative path (for local / custom deployments)
    navigator.serviceWorker.register('/sw.js');
  });
}

// ── Show initial level overlay ──
showLevelOverlay(0, false);

// ── Start render loop ──
startLoop();
