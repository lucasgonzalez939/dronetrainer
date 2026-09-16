/**
 * hud.js – All 2D HUD display update functions.
 */

import { CONFIG, drone, filteredInput, windVector } from './state.js';

const horizCtx   = document.getElementById('horizon-canvas').getContext('2d');
const compassCtx = document.getElementById('compass-canvas').getContext('2d');
const driftCtx   = document.getElementById('wind-drift-canvas').getContext('2d');
let lastSpeedBand = '';
let lastSpeedHeight = '';
let lastBatteryPct = '';
let lastBatteryColor = '';
let lastBatterySecs = -1;

export function updateSpeedTape(speedH) {
  const maxSpd = CONFIG.MAX_SPEED;
  const pct    = Math.min(speedH / maxSpd, 1.0) * 100;
  const fill   = document.getElementById('speed-tape-fill');
  const val    = document.getElementById('speed-tape-val');
  if (!fill || !val) return;
  const band = speedH < maxSpd * 0.5 ? '#4caf50' : speedH < maxSpd * 0.8 ? '#ff9800' : '#e53935';
  const heightText = pct.toFixed(1) + '%';
  const speedText = speedH.toFixed(1);
  if (heightText !== lastSpeedHeight) {
    fill.style.height = heightText;
    lastSpeedHeight = heightText;
  }
  if (band !== lastSpeedBand) {
    fill.style.background = band;
    lastSpeedBand = band;
  }
  if (speedText !== val.textContent) {
    val.textContent = speedText;
  }
}

export function updateCompass(yawRad) {
  const w = 80, h = 44, cx = 40, cy = 28, r = 17;
  compassCtx.clearRect(0, 0, w, h);
  compassCtx.beginPath();
  compassCtx.arc(cx, cy, r, 0, Math.PI * 2);
  compassCtx.strokeStyle = 'rgba(255,255,255,0.14)';
  compassCtx.lineWidth = 1.25;
  compassCtx.stroke();

  const cards = [['N', 0], ['E', Math.PI/2], ['S', Math.PI], ['O', -Math.PI/2]];
  cards.forEach(([label, angle]) => {
    const rel = angle - yawRad;
    const sx  = cx + Math.sin(rel) * r;
    const sy  = cy - Math.cos(rel) * r;
    compassCtx.fillStyle = label === 'N' ? '#ff1744' : 'rgba(255,255,255,0.65)';
    compassCtx.font = 'bold 8px Arial';
    compassCtx.textAlign = 'center';
    compassCtx.textBaseline = 'middle';
    compassCtx.fillText(label, sx, sy);
  });

  compassCtx.beginPath();
  compassCtx.moveTo(cx, cy - r - 4);
  compassCtx.lineTo(cx - 4, cy - r + 2);
  compassCtx.lineTo(cx + 4, cy - r + 2);
  compassCtx.closePath();
  compassCtx.fillStyle = '#fff';
  compassCtx.fill();

  const deg = (((yawRad * 180 / Math.PI) % 360) + 360) % 360;
  compassCtx.fillStyle = 'rgba(255,255,255,0.8)';
  compassCtx.font = 'bold 7px Arial';
  compassCtx.textAlign = 'center';
  compassCtx.textBaseline = 'middle';
  compassCtx.fillText('HDG', cx, 8);
  compassCtx.fillText(Math.round(deg) + '°', cx, 16);
}

export function updateHorizon(pitch, roll) {
  const w = 100, h = 50, cx = 50, cy = 25;
  horizCtx.clearRect(0, 0, w, h);

  horizCtx.save();
  horizCtx.translate(cx, cy);
  horizCtx.rotate(roll);

  horizCtx.fillStyle = 'rgba(30,120,200,0.45)';
  horizCtx.fillRect(-w, -h, w * 2, h);
  const pitchOffset = pitch * 180;
  horizCtx.fillStyle = 'rgba(80,50,20,0.45)';
  horizCtx.fillRect(-w, pitchOffset, w * 2, h);

  horizCtx.strokeStyle = 'rgba(255,255,255,0.7)';
  horizCtx.lineWidth = 1.5;
  horizCtx.beginPath();
  horizCtx.moveTo(-w, pitchOffset);
  horizCtx.lineTo(w,  pitchOffset);
  horizCtx.stroke();

  horizCtx.restore();

  horizCtx.strokeStyle = '#fff';
  horizCtx.lineWidth   = 1.5;
  horizCtx.beginPath();
  horizCtx.moveTo(cx - 14, cy); horizCtx.lineTo(cx - 4, cy);
  horizCtx.moveTo(cx + 4,  cy); horizCtx.lineTo(cx + 14, cy);
  horizCtx.moveTo(cx, cy - 4);  horizCtx.lineTo(cx, cy + 4);
  horizCtx.stroke();

  horizCtx.strokeStyle = 'rgba(255,255,255,0.18)';
  horizCtx.lineWidth   = 1;
  horizCtx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export function updateDriftIndicator(vpsLost) {
  const el = document.getElementById('wind-drift-hud');
  if (!vpsLost) { el.classList.remove('active'); return; }
  el.classList.add('active');

  const s = 44, cx = 22, cy = 22, r = 16;
  driftCtx.clearRect(0, 0, s, s);

  const wLen = windVector.length();
  if (wLen < 0.01) return;
  const wDir = windVector.clone().divideScalar(wLen);
  const ang  = Math.atan2(wDir.x, wDir.z);
  const mag  = Math.min(wLen / 4, 1.0);

  driftCtx.beginPath();
  driftCtx.arc(cx, cy, r, 0, Math.PI * 2);
  driftCtx.strokeStyle = 'rgba(255,179,0,0.38)';
  driftCtx.lineWidth   = 1.5;
  driftCtx.stroke();

  const ax = cx + Math.sin(ang) * r * mag;
  const ay = cy - Math.cos(ang) * r * mag;
  driftCtx.beginPath();
  driftCtx.moveTo(cx, cy);
  driftCtx.lineTo(ax, ay);
  driftCtx.strokeStyle = '#ffb300';
  driftCtx.lineWidth   = 2.5;
  driftCtx.lineCap     = 'round';
  driftCtx.stroke();

  const headAng = Math.atan2(ay - cy, ax - cx);
  driftCtx.beginPath();
  driftCtx.moveTo(ax, ay);
  driftCtx.lineTo(ax - 6 * Math.cos(headAng - 0.4), ay - 6 * Math.sin(headAng - 0.4));
  driftCtx.lineTo(ax - 6 * Math.cos(headAng + 0.4), ay - 6 * Math.sin(headAng + 0.4));
  driftCtx.closePath();
  driftCtx.fillStyle = '#ffb300';
  driftCtx.fill();
}

const inputDotLeft  = document.getElementById('input-dot-left');
const inputDotRight = document.getElementById('input-dot-right');
const INPUT_VIZ_BOX = 36;

export function updateInputViz() {
  if (!inputDotLeft || !inputDotRight) return;
  const half = INPUT_VIZ_BOX / 2;
  const lx = half + filteredInput.yaw      * (half - 5);
  const ly = half - filteredInput.throttle * (half - 5);
  inputDotLeft.style.left = lx + 'px';
  inputDotLeft.style.top  = ly + 'px';
  const rx = half + filteredInput.roll  * (half - 5);
  const ry = half + filteredInput.pitch * (half - 5);
  inputDotRight.style.left = rx + 'px';
  inputDotRight.style.top  = ry + 'px';
}

export function updateBatteryBar(batteryTimeLeft, batteryTime) {
  const pct   = Math.max(0, batteryTimeLeft / batteryTime * 100);
  const fill  = document.getElementById('battery-bar-fill');
  const text  = document.getElementById('battery-bar-text');
  const pctText = pct.toFixed(1) + '%';
  const fillColor = pct > 40 ? '#4caf50' : pct > 20 ? '#ff9800' : '#e53935';
  const secs = Math.ceil(batteryTimeLeft);
  if (fill && pctText !== lastBatteryPct) {
    fill.style.width = pctText;
    lastBatteryPct = pctText;
  }
  if (fill && fillColor !== lastBatteryColor) {
    fill.style.background = fillColor;
    lastBatteryColor = fillColor;
  }
  if (text && secs !== lastBatterySecs) {
    text.textContent = secs + 's';
    lastBatterySecs = secs;
  }
  const topFill = document.getElementById('bat-fill-bar');
  if (topFill && topFill.style.width !== pctText) topFill.style.width = pctText;
}
