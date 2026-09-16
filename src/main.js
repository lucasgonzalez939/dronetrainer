/**
 * main.js – Application entry point.
 * Initialises all modules, wires up events, and starts the game loop.
 */

import { initScene, scene } from './modules/scene.js';
import { initJoysticks } from './modules/joystick.js';
import { initOverlayEvents, showLevelOverlay } from './modules/overlays.js';
import { applySpeedPreset } from './modules/flightState.js';
import { setFlightState } from './modules/flightState.js';
import { loadLevel } from './modules/levels.js';
import { loadFreestyle, exitFreestyleMode, FREESTYLE_WIND_PRESETS } from './modules/freestyle.js';
import {
  FlightState, DIFFICULTY, JOY_CONFIG, CONFIG,
  drone, isFreestyleMode,
  fsWindPreset, setFsWindPreset,
  windVector, setWindVector,
  isFPVMode, setIsFPVMode,
  currentLevel,
  setTimeOfDay, setFogDensity
} from './modules/state.js';
import { startLoop, startReplay } from './modules/loop.js';

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

// ── Flight mode buttons ──
document.querySelectorAll('[data-flightmode]').forEach(btn => {
  btn.addEventListener('click', () => {
    CONFIG.FLIGHT_MODE = btn.dataset.flightmode;
    document.querySelectorAll('[data-flightmode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // reset angular rates when switching
    drone.pitch = 0; drone.roll = 0;
    drone.pitchRate = 0; drone.rollRate = 0;
  });
});

// ── Time of day ──
const cfgTimeOfDay    = document.getElementById('cfg-time-of-day');
const cfgTimeOfDayVal = document.getElementById('cfg-time-of-day-val');
cfgTimeOfDay.addEventListener('input', () => {
  const v = +cfgTimeOfDay.value;
  setTimeOfDay(v);
  cfgTimeOfDayVal.textContent = v < 0.2 ? '🌙' : v < 0.45 ? '🌆' : v < 0.75 ? '🌅' : '☀️';
  // Adjust ambient lighting on the scene
  const ambient = scene.children.find(c => c.isAmbientLight);
  if (ambient) ambient.intensity = 0.05 + v * 0.25;
  const hemi = scene.children.find(c => c.isHemisphereLight);
  if (hemi) hemi.intensity = 0.15 + v * 0.6;
  const sun = scene.children.find(c => c.isDirectionalLight);
  if (sun) sun.intensity = v * 1.2;
  if (scene.fog) scene.fog.color.setHSL(0.08, 0.4, 0.1 + v * 0.65);
});

// ── Fog density ──
const cfgFogDensity    = document.getElementById('cfg-fog-density');
const cfgFogDensityVal = document.getElementById('cfg-fog-density-val');
cfgFogDensity.addEventListener('input', () => {
  const v = +cfgFogDensity.value;
  setFogDensity(v);
  cfgFogDensityVal.textContent = v.toFixed(3);
  if (scene.fog) scene.fog.density = v;
});

// ── Expo curve preview canvas ──
const expoCurveCanvas = document.getElementById('expo-curve-canvas');
function drawExpoCurve() {
  if (!expoCurveCanvas) return;
  const ctx = expoCurveCanvas.getContext('2d');
  const w = 160, h = 80, cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(w, cy);
  ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
  ctx.stroke();

  // Curve
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  const exp = JOY_CONFIG.exponent;
  for (let i = 0; i <= w; i++) {
    const nx = (i - cx) / cx;       // -1 to 1
    const ny = Math.sign(nx) * Math.pow(Math.abs(nx), exp);
    const px = i;
    const py = cy - ny * (cy - 4);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
}
drawExpoCurve();

// Redraw when curve exponent changes
document.getElementById('cfg-joy-curve').addEventListener('input', drawExpoCurve);

// ── Replay button ──
document.getElementById('btn-start-replay').addEventListener('click', () => {
  document.getElementById('config-overlay').classList.remove('active');
  startReplay();
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
