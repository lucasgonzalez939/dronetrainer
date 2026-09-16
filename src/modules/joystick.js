/**
 * joystick.js – VirtualJoystick class and stick instantiation.
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

export function initJoysticks() {
  new VirtualJoystick('left-zone',  'left-knob',  (x,y) => { rawInput.yaw=x;  rawInput.throttle=-y; });
  new VirtualJoystick('right-zone', 'right-knob', (x,y) => { rawInput.roll=x; rawInput.pitch=-y; });
}
