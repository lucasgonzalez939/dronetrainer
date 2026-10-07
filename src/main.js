/**
 * main.js – Application entry point.
 * Initialises all modules, wires up events, and starts the game loop.
 */

import { initScene, scene, updatePerformanceSettings } from './modules/scene.js';
import { initJoysticks } from './modules/joystick.js';
import { initOverlayEvents, showLevelOverlay } from './modules/overlays.js';
import { applySpeedPreset } from './modules/flightState.js';
import { setFlightState } from './modules/flightState.js';
import { loadLevel } from './modules/levels.js';
import { tryRespawnFromSoftCheckpoint } from './modules/missions.js';
import { loadFreestyle, exitFreestyleMode, FREESTYLE_WIND_PRESETS } from './modules/freestyle.js';
import {
  FlightState, DIFFICULTY, JOY_CONFIG, CONFIG, PERFORMANCE, CAMERA_SETTINGS, CAMERA_VIEW_MODES, PILOT_CAMERA_SPOTS,
  drone, isFreestyleMode,
  fsWindPreset, setFsWindPreset,
  windVector, setWindVector,
  isFPVMode, setIsFPVMode,
  currentLevel,
  setTimeOfDay, setFogDensity,
  cameraViewMode, setCameraViewMode, setPilotFrame,
  emergencyDisconnect, setEmergencyDisconnect
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
      const resumed = tryRespawnFromSoftCheckpoint();
      if (!resumed) {
        loadLevel(currentLevel);
      }
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

const cfgTabButtons = [...document.querySelectorAll('.cfg-tab-btn')];
const cfgSections = [...document.querySelectorAll('#config-panel .cfg-section[data-cfg-category]')];

function setConfigCategory(category) {
  cfgTabButtons.forEach((btn) => {
    const selected = btn.dataset.cfgTab === category;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  cfgSections.forEach((section) => {
    section.hidden = section.dataset.cfgCategory !== category;
  });
  const visibleSections = cfgSections.filter((section) => !section.hidden);
  if (visibleSections.length && visibleSections.every((section) => section.classList.contains('collapsed'))) {
    visibleSections[0].classList.remove('collapsed');
    const title = visibleSections[0].querySelector('.cfg-section-title');
    if (title) title.setAttribute('aria-expanded', 'true');
  }
}

const firstSectionByCategory = new Set();
cfgSections.forEach((section) => {
  const category = section.dataset.cfgCategory;
  const sectionTitle = section.querySelector('.cfg-section-title');
  if (!firstSectionByCategory.has(category)) {
    firstSectionByCategory.add(category);
  } else {
    section.classList.add('collapsed');
  }
  if (!sectionTitle) return;
  sectionTitle.setAttribute('role', 'button');
  sectionTitle.setAttribute('tabindex', '0');
  sectionTitle.setAttribute('aria-expanded', section.classList.contains('collapsed') ? 'false' : 'true');
  const toggleSection = () => {
    section.classList.toggle('collapsed');
    sectionTitle.setAttribute('aria-expanded', section.classList.contains('collapsed') ? 'false' : 'true');
  };
  sectionTitle.addEventListener('click', toggleSection);
  sectionTitle.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      toggleSection();
    }
  });
});

cfgTabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setConfigCategory(btn.dataset.cfgTab);
  });
});
setConfigCategory((cfgTabButtons.find((btn) => btn.classList.contains('active')) || cfgTabButtons[0])?.dataset.cfgTab || 'flight');

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

// Emergency disconnect simulation
const cfgEmergencyDisconnect = document.getElementById('cfg-emergency-disconnect');
if (cfgEmergencyDisconnect) {
  cfgEmergencyDisconnect.checked = emergencyDisconnect;
  cfgEmergencyDisconnect.addEventListener('change', () => {
    const enabled = cfgEmergencyDisconnect.checked;
    setEmergencyDisconnect(enabled);
    if (enabled && (drone.state === FlightState.FLYING || drone.state === FlightState.TAKING_OFF)) {
      setFlightState(FlightState.LANDING);
    }
  });
}

// ── Performance toggles ──
const cfgLowPower  = document.getElementById('cfg-low-power');
const cfgShadows   = document.getElementById('cfg-shadows');
const cfgEnvDetail = document.getElementById('cfg-env-detail');
const cfgWindPart  = document.getElementById('cfg-wind-particles');
const cfgFlightAids= document.getElementById('cfg-flight-aids');

function syncPerformanceUi() {
  cfgLowPower.checked = PERFORMANCE.lowPowerMode;
  cfgShadows.checked = PERFORMANCE.shadows;
  cfgEnvDetail.checked = PERFORMANCE.environment;
  cfgWindPart.checked = PERFORMANCE.windParticles;
  cfgFlightAids.checked = PERFORMANCE.flightAids;
}

cfgLowPower.addEventListener('change', () => {
  PERFORMANCE.lowPowerMode = cfgLowPower.checked;
  if (PERFORMANCE.lowPowerMode) {
    PERFORMANCE.shadows = false;
    PERFORMANCE.environment = false;
    PERFORMANCE.windParticles = false;
    PERFORMANCE.flightAids = false;
    PERFORMANCE.vpsBeam = false;
    PERFORMANCE.headingRing = false;
    PERFORMANCE.droneShadow = false;
    PERFORMANCE.trail = false;
    PERFORMANCE.altRing = false;
  } else {
    PERFORMANCE.shadows = true;
    PERFORMANCE.environment = true;
    PERFORMANCE.windParticles = true;
    PERFORMANCE.flightAids = true;
    PERFORMANCE.vpsBeam = true;
    PERFORMANCE.headingRing = true;
    PERFORMANCE.droneShadow = true;
    PERFORMANCE.trail = true;
    PERFORMANCE.altRing = true;
  }
  syncPerformanceUi();
  updatePerformanceSettings();
});

const cfgVpsBeam = document.getElementById('cfg-vps-beam');
const cfgHeadingRing = document.getElementById('cfg-heading-ring');
const cfgDroneShadow = document.getElementById('cfg-drone-shadow');
const cfgTrail = document.getElementById('cfg-trail');
const cfgAltRing = document.getElementById('cfg-alt-ring');

function syncAssistUi() {
  cfgVpsBeam.checked = PERFORMANCE.vpsBeam;
  cfgHeadingRing.checked = PERFORMANCE.headingRing;
  cfgDroneShadow.checked = PERFORMANCE.droneShadow;
  cfgTrail.checked = PERFORMANCE.trail;
  cfgAltRing.checked = PERFORMANCE.altRing;
}

[cfgShadows, cfgEnvDetail, cfgWindPart, cfgFlightAids, cfgVpsBeam, cfgHeadingRing, cfgDroneShadow, cfgTrail, cfgAltRing].forEach((toggle) => {
  toggle.addEventListener('change', () => {
    PERFORMANCE.shadows = cfgShadows.checked;
    PERFORMANCE.environment = cfgEnvDetail.checked;
    PERFORMANCE.windParticles = cfgWindPart.checked;
    PERFORMANCE.flightAids = cfgFlightAids.checked;
    PERFORMANCE.vpsBeam = cfgVpsBeam.checked;
    PERFORMANCE.headingRing = cfgHeadingRing.checked;
    PERFORMANCE.droneShadow = cfgDroneShadow.checked;
    PERFORMANCE.trail = cfgTrail.checked;
    PERFORMANCE.altRing = cfgAltRing.checked;
    PERFORMANCE.lowPowerMode = false;
    syncPerformanceUi();
    syncAssistUi();
    updatePerformanceSettings();
  });
});

syncPerformanceUi();
syncAssistUi();
updatePerformanceSettings();

const cfgCamSmooth = document.getElementById('cfg-cam-smoothing');
const cfgCamSmoothVal = document.getElementById('cfg-cam-smoothing-val');
const cfgCamDistance = document.getElementById('cfg-cam-distance');
const cfgCamDistanceVal = document.getElementById('cfg-cam-distance-val');
const cfgCamHeight = document.getElementById('cfg-cam-height');
const cfgCamHeightVal = document.getElementById('cfg-cam-height-val');
const cfgPilotFrame = document.getElementById('cfg-pilot-frame');
const cfgFpvBladeAid = document.getElementById('cfg-fpv-blade-aid');
const cfgPilotSpot = document.getElementById('cfg-pilot-spot');
const cfgPilotFrameSize = document.getElementById('cfg-pilot-frame-size');

const PILOT_FRAME_SIZE_PRESETS = {
  small:  { width: 'min(24vw, 340px)', height: 'min(13.9vw, 196px)', minW: '150px', minH: '86px' },
  medium: { width: 'min(30vw, 420px)', height: 'min(17.4vw, 244px)', minW: '180px', minH: '104px' },
  large:  { width: 'min(36vw, 500px)', height: 'min(20.9vw, 292px)', minW: '220px', minH: '124px' }
};

function resolveAutoPilotFrameSize() {
  const w = window.innerWidth;
  if (w < 760) return 'small';
  if (w < 1280) return 'medium';
  return 'large';
}

function applyPilotFrameSizePreset(sizeKey) {
  const resolvedSize = sizeKey === 'auto' ? resolveAutoPilotFrameSize() : sizeKey;
  const preset = PILOT_FRAME_SIZE_PRESETS[resolvedSize] || PILOT_FRAME_SIZE_PRESETS.medium;
  const root = document.documentElement;
  root.style.setProperty('--pilot-frame-width', preset.width);
  root.style.setProperty('--pilot-frame-height', preset.height);
  root.style.setProperty('--pilot-frame-min-width', preset.minW);
  root.style.setProperty('--pilot-frame-min-height', preset.minH);
}

function updateCameraValueLabels() {
  cfgCamSmoothVal.textContent = CAMERA_SETTINGS.turnSmoothing <= 0 ? 'OFF' : (+CAMERA_SETTINGS.turnSmoothing).toFixed(2);
  cfgCamDistanceVal.textContent = (+CAMERA_SETTINGS.chaseDistance).toFixed(1) + 'm';
  cfgCamHeightVal.textContent = (+CAMERA_SETTINGS.chaseHeight).toFixed(2) + 'm';
}

cfgCamSmooth.addEventListener('input', () => {
  CAMERA_SETTINGS.turnSmoothing = +cfgCamSmooth.value;
  updateCameraValueLabels();
});
cfgCamDistance.addEventListener('input', () => {
  CAMERA_SETTINGS.chaseDistance = +cfgCamDistance.value;
  updateCameraValueLabels();
});
cfgCamHeight.addEventListener('input', () => {
  CAMERA_SETTINGS.chaseHeight = +cfgCamHeight.value;
  updateCameraValueLabels();
});
cfgPilotFrame.addEventListener('change', () => {
  setPilotFrame(cfgPilotFrame.checked);
  if (cameraViewMode === CAMERA_VIEW_MODES.PILOT || cameraViewMode === CAMERA_VIEW_MODES.PILOT_FRAME) {
    setCameraViewMode(cfgPilotFrame.checked ? CAMERA_VIEW_MODES.PILOT_FRAME : CAMERA_VIEW_MODES.PILOT);
  }
  syncCameraUi();
});
cfgFpvBladeAid.addEventListener('change', () => {
  CAMERA_SETTINGS.fpvBladeCues = cfgFpvBladeAid.checked;
  syncCameraUi();
});
cfgPilotSpot.addEventListener('change', () => {
  if (PILOT_CAMERA_SPOTS[cfgPilotSpot.value]) {
    CAMERA_SETTINGS.pilotSpot = cfgPilotSpot.value;
  }
});
cfgPilotFrameSize.addEventListener('change', () => {
  if (cfgPilotFrameSize.value === 'auto' || PILOT_FRAME_SIZE_PRESETS[cfgPilotFrameSize.value]) {
    CAMERA_SETTINGS.pilotFrameSize = cfgPilotFrameSize.value;
  } else {
    CAMERA_SETTINGS.pilotFrameSize = 'auto';
  }
  applyPilotFrameSizePreset(CAMERA_SETTINGS.pilotFrameSize);
});

if (!PILOT_CAMERA_SPOTS[CAMERA_SETTINGS.pilotSpot]) {
  CAMERA_SETTINGS.pilotSpot = 'startPad';
}
if (CAMERA_SETTINGS.pilotFrameSize !== 'auto' && !PILOT_FRAME_SIZE_PRESETS[CAMERA_SETTINGS.pilotFrameSize]) {
  CAMERA_SETTINGS.pilotFrameSize = 'auto';
}
cfgPilotSpot.value = CAMERA_SETTINGS.pilotSpot;
cfgPilotFrameSize.value = CAMERA_SETTINGS.pilotFrameSize;
applyPilotFrameSizePreset(CAMERA_SETTINGS.pilotFrameSize);
window.addEventListener('resize', () => {
  if (CAMERA_SETTINGS.pilotFrameSize === 'auto') {
    applyPilotFrameSizePreset('auto');
  }
});

updateCameraValueLabels();

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

// ── Keyboard swap toggle ──
const cfgKbdSwap   = document.getElementById('cfg-kbd-swap');
const kbdSwapHint  = document.getElementById('kbd-swap-hint');
const KBD_HINT_DEFAULT = '↑↓ Subir/Bajar · ←→ Girar · WASD Pitch/Roll';
const KBD_HINT_SWAPPED = 'WS Subir/Bajar · AD Girar · ↑↓←→ Pitch/Roll';
cfgKbdSwap.addEventListener('change', () => {
  JOY_CONFIG.swapKeyboard = cfgKbdSwap.checked;
  kbdSwapHint.textContent = cfgKbdSwap.checked ? KBD_HINT_SWAPPED : KBD_HINT_DEFAULT;
});

// ── Camera mode cycle ──
const fpvOverlay   = document.getElementById('fpv-overlay');
const pilotFrameOverlay = document.getElementById('pilot-frame-overlay');
const btnCamToggle = document.getElementById('btn-cam-toggle');
const cameraModeOrder = [
  CAMERA_VIEW_MODES.CHASE,
  CAMERA_VIEW_MODES.FPV,
  CAMERA_VIEW_MODES.PILOT,
  CAMERA_VIEW_MODES.PILOT_FRAME
];

function syncCameraUi() {
  const isPilot = cameraViewMode === CAMERA_VIEW_MODES.PILOT || cameraViewMode === CAMERA_VIEW_MODES.PILOT_FRAME;
  const isFpv = cameraViewMode === CAMERA_VIEW_MODES.FPV;
  const showPilotFrame = isPilot && CAMERA_SETTINGS.pilotFrame;
  btnCamToggle.classList.toggle('fpv-active', isFpv || isPilot);
  btnCamToggle.title = isFpv ? 'Vista FPV' : isPilot ? 'Vista piloto' : 'Vista de seguimiento';
  fpvOverlay.classList.remove('active');
  if (pilotFrameOverlay) {
    pilotFrameOverlay.classList.toggle('active', showPilotFrame);
  }
  if (cfgPilotFrame) {
    cfgPilotFrame.checked = CAMERA_SETTINGS.pilotFrame;
  }
  if (cfgFpvBladeAid) {
    cfgFpvBladeAid.checked = CAMERA_SETTINGS.fpvBladeCues;
  }
}

btnCamToggle.addEventListener('click', () => {
  const currentIndex = cameraModeOrder.indexOf(cameraViewMode);
  const nextMode = cameraModeOrder[(currentIndex + 1) % cameraModeOrder.length];
  setCameraViewMode(nextMode);
  setPilotFrame(nextMode === CAMERA_VIEW_MODES.PILOT_FRAME);
  syncCameraUi();
  if (cameraViewMode === CAMERA_VIEW_MODES.FPV) {
    setIsFPVMode(true);
  } else {
    setIsFPVMode(false);
  }
});

syncCameraUi();

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
