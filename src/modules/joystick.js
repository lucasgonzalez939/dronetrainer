/**
 * joystick.js – VirtualJoystick class, keyboard and gamepad input.
 * Clean input merging across touchscreen, keyboard, and gamepad.
 */

import { rawInput, JOY_CONFIG } from './state.js';

const touchInput = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
const kbdInput   = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
const padInput   = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };

function mergeInputs() {
  const axes = ['throttle', 'yaw', 'pitch', 'roll'];
  for (const ax of axes) {
    const t = touchInput[ax];
    const k = kbdInput[ax];
    const p = padInput[ax];
    // Pick the source with largest absolute displacement
    let best = t;
    if (Math.abs(k) > Math.abs(best)) best = k;
    if (Math.abs(p) > Math.abs(best)) best = p;
    rawInput[ax] = best;
  }
}

export class VirtualJoystick {
  constructor(zoneId, knobId, onMove) {
    this.zone      = document.getElementById(zoneId);
    this.knob      = document.getElementById(knobId);
    this.onMove    = onMove;
    this.pointerId = null;
    this.radius    = 75;
    this.origin    = { x: 0, y: 0 };
    this._bindEvents();
  }

  _bindEvents() {
    if (!this.zone || !this.knob) return;

    this.zone.addEventListener('pointerdown', (e) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      try { this.zone.setPointerCapture(e.pointerId); } catch (_) {}
      const rect = this.zone.getBoundingClientRect();
      this.radius = Math.max(30, rect.width / 2);
      this.origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this._update(e.clientX, e.clientY);
    });

    this.zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this._update(e.clientX, e.clientY);
    });

    const release = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.knob.style.transform = 'translate(-50%, -50%)';
      this.onMove(0, 0);
      mergeInputs();
    };

    this.zone.addEventListener('pointerup', release);
    this.zone.addEventListener('pointercancel', release);
    this.zone.addEventListener('lostpointercapture', release);
  }

  _update(clientX, clientY) {
    const dx = clientX - this.origin.x;
    const dy = clientY - this.origin.y;
    const dist = Math.hypot(dx, dy);
    let vDx = dx;
    let vDy = dy;
    if (dist > this.radius) {
      vDx = (dx / dist) * this.radius;
      vDy = (dy / dist) * this.radius;
    }
    this.knob.style.transform = `translate(calc(-50% + ${vDx.toFixed(1)}px), calc(-50% + ${vDy.toFixed(1)}px))`;

    const normDist = Math.min(dist / this.radius, 1.0);
    const dz = JOY_CONFIG.deadzone;
    if (normDist < dz) {
      this.onMove(0, 0);
      mergeInputs();
      return;
    }

    const eff = (normDist - dz) / (1.0 - dz);
    const mag = Math.min(Math.pow(eff, JOY_CONFIG.exponent) * JOY_CONFIG.sensitivity, 1.0);
    const angle = Math.atan2(dy, dx);
    this.onMove(Math.cos(angle) * mag, Math.sin(angle) * mag);
    mergeInputs();
  }
}

// ── Keyboard input state ──────────────────────────────────────────────────
const keysDown = new Set();

function applyKeyboard() {
  let kThrottle = 0, kYaw = 0, kPitch = 0, kRoll = 0;

  if (JOY_CONFIG.swapKeyboard) {
    if (keysDown.has('ArrowUp'))    kThrottle =  1;
    if (keysDown.has('ArrowDown'))  kThrottle = -1;
    if (keysDown.has('ArrowLeft'))  kYaw      = -1;
    if (keysDown.has('ArrowRight')) kYaw      =  1;
    if (keysDown.has('KeyW'))       kPitch    = -1;
    if (keysDown.has('KeyS'))       kPitch    =  1;
    if (keysDown.has('KeyA'))       kRoll     = -1;
    if (keysDown.has('KeyD'))       kRoll     =  1;
  } else {
    if (keysDown.has('KeyW'))        kThrottle =  1;
    if (keysDown.has('KeyS'))        kThrottle = -1;
    if (keysDown.has('KeyA'))        kYaw      = -1;
    if (keysDown.has('KeyD'))        kYaw      =  1;
    if (keysDown.has('ArrowUp'))     kPitch    = -1;
    if (keysDown.has('ArrowDown'))   kPitch    =  1;
    if (keysDown.has('ArrowLeft'))   kRoll     = -1;
    if (keysDown.has('ArrowRight'))  kRoll     =  1;
  }

  kbdInput.throttle = kThrottle * JOY_CONFIG.sensitivity;
  kbdInput.yaw      = kYaw      * JOY_CONFIG.sensitivity;
  kbdInput.pitch    = kPitch    * JOY_CONFIG.sensitivity;
  kbdInput.roll     = kRoll     * JOY_CONFIG.sensitivity;
  mergeInputs();
}

function clearKeyAxis() {
  if (JOY_CONFIG.swapKeyboard) {
    if (!keysDown.has('KeyW') && !keysDown.has('KeyS'))          kbdInput.pitch    = 0;
    if (!keysDown.has('KeyA') && !keysDown.has('KeyD'))          kbdInput.roll     = 0;
    if (!keysDown.has('ArrowUp') && !keysDown.has('ArrowDown')) kbdInput.throttle = 0;
    if (!keysDown.has('ArrowLeft') && !keysDown.has('ArrowRight')) kbdInput.yaw   = 0;
  } else {
    if (!keysDown.has('KeyW') && !keysDown.has('KeyS'))          kbdInput.throttle = 0;
    if (!keysDown.has('KeyA') && !keysDown.has('KeyD'))          kbdInput.yaw      = 0;
    if (!keysDown.has('ArrowUp') && !keysDown.has('ArrowDown')) kbdInput.pitch    = 0;
    if (!keysDown.has('ArrowLeft') && !keysDown.has('ArrowRight')) kbdInput.roll   = 0;
  }
  mergeInputs();
}

// ── Gamepad polling ───────────────────────────────────────────────────────
const GP_DEADZONE = 0.12;

export function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let found = false;
  for (const pad of pads) {
    if (!pad) continue;
    found = true;
    const ax = (v) => Math.abs(v) < GP_DEADZONE ? 0 : v;
    padInput.yaw      =  ax(pad.axes[0] || 0) * JOY_CONFIG.sensitivity;
    padInput.throttle = -ax(pad.axes[1] || 0) * JOY_CONFIG.sensitivity;
    padInput.roll     =  ax(pad.axes[2] || 0) * JOY_CONFIG.sensitivity;
    padInput.pitch    =  ax(pad.axes[3] || 0) * JOY_CONFIG.sensitivity;
    mergeInputs();
    break;
  }
  if (!found) {
    padInput.throttle = 0; padInput.yaw = 0; padInput.pitch = 0; padInput.roll = 0;
  }
}

export function initJoysticks() {
  new VirtualJoystick('left-zone', 'left-knob', (x, y) => {
    touchInput.yaw = x;
    touchInput.throttle = -y;
  });
  new VirtualJoystick('right-zone', 'right-knob', (x, y) => {
    touchInput.roll = x;
    touchInput.pitch = y;
  });

  // Keyboard events (guarded so inputs in forms aren't captured)
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (keysDown.has(e.code)) return;
    keysDown.add(e.code);
    applyKeyboard();
  });

  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
    clearKeyAxis();
    applyKeyboard();
  });

  window.addEventListener('blur', () => {
    keysDown.clear();
    kbdInput.throttle = 0; kbdInput.yaw = 0; kbdInput.pitch = 0; kbdInput.roll = 0;
    mergeInputs();
  });
}
