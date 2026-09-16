/**
 * joystick.js – VirtualJoystick class, keyboard and gamepad input.
 */

import { rawInput, JOY_CONFIG } from './state.js';

export class VirtualJoystick {
  constructor(zoneId, knobId, onMove) {
    this.zone      = document.getElementById(zoneId);
    this.knob      = document.getElementById(knobId);
    this.onMove    = onMove;
    this.pointerId = null;
    this.radius    = 75;
    this.origin    = { x:0, y:0 };
    this._bindEvents();
  }

  _bindEvents() {
    this.zone.addEventListener('pointerdown', (e) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      this.zone.setPointerCapture(e.pointerId);
      const rect = this.zone.getBoundingClientRect();
      this.origin = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
      this._update(this.origin.x, this.origin.y);
    });
    this.zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this._update(e.clientX, e.clientY);
    });
    const release = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.knob.style.transform = `translate(-50%, -50%)`;
      this.onMove(0, 0);
    };
    this.zone.addEventListener('pointerup',     release);
    this.zone.addEventListener('pointercancel', release);
  }

  _update(clientX, clientY) {
    let dx = clientX - this.origin.x;
    let dy = clientY - this.origin.y;
    const dist = Math.hypot(dx, dy);
    let vDx = dx, vDy = dy;
    if (dist > this.radius) { vDx = dx/dist*this.radius; vDy = dy/dist*this.radius; }
    this.knob.style.transform = `translate(calc(-50% + ${vDx}px), calc(-50% + ${vDy}px))`;
    const normDist = Math.min(dist / this.radius, 1.0);
    const dz = JOY_CONFIG.deadzone;
    if (normDist < dz) { this.onMove(0, 0); return; }
    const eff = (normDist - dz) / (1.0 - dz);
    const mag = Math.min(Math.pow(eff, JOY_CONFIG.exponent) * JOY_CONFIG.sensitivity, 1.0);
    const angle = Math.atan2(dy, dx);
    this.onMove(Math.cos(angle)*mag, Math.sin(angle)*mag);
  }
}

// ── Keyboard input state ──────────────────────────────────────────────────
const keysDown = new Set();

function applyKeyboard() {
  // Reset axes that are controlled by keyboard
  let kThrottle = 0, kYaw = 0, kPitch = 0, kRoll = 0;

  if (JOY_CONFIG.swapKeyboard) {
    // Swapped: WASD → throttle/yaw  |  arrows → pitch/roll
    if (keysDown.has('KeyW'))        kThrottle =  1;
    if (keysDown.has('KeyS'))        kThrottle = -1;
    if (keysDown.has('KeyA'))        kYaw      = -1;
    if (keysDown.has('KeyD'))        kYaw      =  1;
    if (keysDown.has('ArrowUp'))     kPitch    = -1;
    if (keysDown.has('ArrowDown'))   kPitch    =  1;
    if (keysDown.has('ArrowLeft'))   kRoll     = -1;
    if (keysDown.has('ArrowRight'))  kRoll     =  1;
  } else {
    // Default: arrows → throttle/yaw  |  WASD → pitch/roll
    if (keysDown.has('ArrowUp'))    kThrottle =  1;
    if (keysDown.has('ArrowDown'))  kThrottle = -1;
    if (keysDown.has('ArrowLeft'))  kYaw      = -1;
    if (keysDown.has('ArrowRight')) kYaw      =  1;
    if (keysDown.has('KeyW'))       kPitch    = -1;
    if (keysDown.has('KeyS'))       kPitch    =  1;
    if (keysDown.has('KeyA'))       kRoll     = -1;
    if (keysDown.has('KeyD'))       kRoll     =  1;
  }

  if (kThrottle) rawInput.throttle = kThrottle * JOY_CONFIG.sensitivity;
  if (kYaw)      rawInput.yaw      = kYaw      * JOY_CONFIG.sensitivity;
  if (kPitch)    rawInput.pitch    = kPitch    * JOY_CONFIG.sensitivity;
  if (kRoll)     rawInput.roll     = kRoll     * JOY_CONFIG.sensitivity;
}

function clearKeyAxis() {
  // Only zero out if no keys for that axis are held
  if (JOY_CONFIG.swapKeyboard) {
    if (!keysDown.has('KeyW') && !keysDown.has('KeyS'))            rawInput.throttle = 0;
    if (!keysDown.has('KeyA') && !keysDown.has('KeyD'))            rawInput.yaw      = 0;
    if (!keysDown.has('ArrowUp') && !keysDown.has('ArrowDown'))   rawInput.pitch    = 0;
    if (!keysDown.has('ArrowLeft') && !keysDown.has('ArrowRight')) rawInput.roll     = 0;
  } else {
    if (!keysDown.has('ArrowUp') && !keysDown.has('ArrowDown'))   rawInput.throttle = 0;
    if (!keysDown.has('ArrowLeft') && !keysDown.has('ArrowRight')) rawInput.yaw      = 0;
    if (!keysDown.has('KeyW') && !keysDown.has('KeyS'))            rawInput.pitch    = 0;
    if (!keysDown.has('KeyA') && !keysDown.has('KeyD'))            rawInput.roll     = 0;
  }
}

// ── Gamepad polling ───────────────────────────────────────────────────────
// Standard gamepad mapping (Xbox layout):
//   Axis 0/1 = Left stick X/Y  → yaw + throttle
//   Axis 2/3 = Right stick X/Y → roll + pitch
const GP_DEADZONE = 0.12;

function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const ax = (v) => Math.abs(v) < GP_DEADZONE ? 0 : v;
    rawInput.yaw      = ax(pad.axes[0]) * JOY_CONFIG.sensitivity;
    rawInput.throttle = -ax(pad.axes[1]) * JOY_CONFIG.sensitivity;
    rawInput.roll     = ax(pad.axes[2]) * JOY_CONFIG.sensitivity;
    rawInput.pitch    = ax(pad.axes[3]) * JOY_CONFIG.sensitivity;
    return; // use first connected pad
  }
}

export function initJoysticks() {
  new VirtualJoystick('left-zone',  'left-knob',  (x,y) => { rawInput.yaw=x;  rawInput.throttle=-y; });
  new VirtualJoystick('right-zone', 'right-knob', (x,y) => { rawInput.roll=x; rawInput.pitch=-y; });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (keysDown.has(e.code)) return;
    keysDown.add(e.code);
    applyKeyboard();
  });
  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
    clearKeyAxis();
    applyKeyboard();
  });

  // Gamepad polling – hooked into animation via setInterval (lightweight)
  setInterval(pollGamepad, 16);
}
