/**
 * loop.js – Main requestAnimationFrame game loop.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { scene, camera, renderer } from './scene.js';
import {
  FlightState, DIFFICULTY,
  drone, isFreestyleMode, isFPVMode,
  currentLevel,
  batteryTimeLeft, setBatteryTimeLeft,
  batteryDepleted, setBatteryDepleted,
  levelSlickZones,
  replayBuffer, movingObstacles
} from './state.js';
import { updateFlightPhysics } from './physics.js';
import { updateMovingGate } from './levels.js';
import { updateMissionLogic, checkMissionLanding } from './missions.js';
import { updateFreestyleLogic } from './freestyle.js';
import { updateSpeedTape, updateCompass, updateHorizon, updateDriftIndicator, updateInputViz, updateBatteryBar } from './hud.js';
import { setFlightState } from './flightState.js';

const clock      = new THREE.Clock();
const fpvOverlay = document.getElementById('fpv-overlay');
const propBlades = fpvOverlay.querySelectorAll('.fpv-prop-blade');
const statusSpeed = document.getElementById('status-speed');
const statusAlt   = document.getElementById('status-alt');
// 20 Hz HUD refresh keeps overlays responsive while cutting per-frame canvas work.
const HUD_STEP = 1 / 20;
let hudTimer = 0;
let lastStatusSpeed = '';
let lastStatusAlt = '';
let lastAirborne = null;

// ── Flight-path replay ghost ──────────────────────────────────────────────
let replayGhost    = null;
let replayIndex    = 0;
let replayPlaying  = false;
let replayTimer    = 0;
const REPLAY_SPEED = 1.0; // playback speed multiplier
const REPLAY_INTERVAL = 0.05; // must match REPLAY_SAMPLE_INTERVAL in missions.js

function _buildReplayGhost() {
  if (replayGhost) { scene.remove(replayGhost); replayGhost = null; }
  const geo = new THREE.CylinderGeometry(0.10, 0.10, 0.04, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35, wireframe: false });
  replayGhost = new THREE.Mesh(geo, mat);
  replayGhost.visible = false;
  scene.add(replayGhost);
}

export function startReplay() {
  if (replayBuffer.length < 2) return;
  _buildReplayGhost();
  replayIndex   = 0;
  replayTimer   = 0;
  replayPlaying = true;
  if (replayGhost) replayGhost.visible = true;
}

export function startLoop() {
  _buildReplayGhost();

  function loop() {
    requestAnimationFrame(loop);
    const dt          = Math.min(clock.getDelta(), 0.1);
    const elapsedTime = clock.getElapsedTime();

    // Battery countdown
    if (DIFFICULTY.batteryOn && batteryTimeLeft > 0 &&
        (drone.state === FlightState.FLYING || drone.state === FlightState.TAKING_OFF)) {
      const newTime = batteryTimeLeft - dt;
      setBatteryTimeLeft(Math.max(0, newTime));
      updateBatteryBar(newTime, DIFFICULTY.batteryTime);
      if (newTime <= 0 && !batteryDepleted) {
        setBatteryDepleted(true);
        setFlightState(FlightState.LANDING);
      }
    }

    // Moving obstacles (sine-driven lateral motion)
    movingObstacles.forEach(mo => {
      if (!mo.mesh) return;
      const newX = mo.originX + Math.sin(elapsedTime * mo.speed) * mo.amplitude;
      mo.mesh.position.x = newX;
      mo.center && (mo.center.x = newX);
      mo.mesh.updateWorldMatrix(true, false);
      if (mo.box) mo.box.setFromObject(mo.mesh);
    });

    updateMovingGate(elapsedTime);
    updateFlightPhysics(dt, elapsedTime, isFPVMode, currentLevel);

    if (isFreestyleMode) {
      updateFreestyleLogic(dt);
    } else {
      updateMissionLogic(dt);
      // Check landing after physics (drone may have just landed)
      if (drone.state === FlightState.LANDED) {
        checkMissionLanding();
      }
    }

    // ── Replay ghost playback ────────────────────────────────────────────
    if (replayPlaying && replayGhost && replayBuffer.length > 1) {
      replayTimer += dt * REPLAY_SPEED;
      const advanceFrames = Math.floor(replayTimer / REPLAY_INTERVAL);
      replayTimer -= advanceFrames * REPLAY_INTERVAL;
      replayIndex += advanceFrames;
      if (replayIndex >= replayBuffer.length) {
        replayIndex   = 0; // loop replay
      }
      const pt = replayBuffer[replayIndex];
      replayGhost.position.set(pt.x, pt.y, pt.z);
    }

    renderer.render(scene, camera);

    // FPV propeller animation
    const isAirborne = drone.state !== FlightState.LANDED;
    if (isAirborne !== lastAirborne) {
      propBlades.forEach(b => { b.style.animationPlayState = isAirborne ? 'running' : 'paused'; });
      lastAirborne = isAirborne;
    }

    // HUD updates
    hudTimer += dt;
    if (hudTimer >= HUD_STEP) {
      hudTimer %= HUD_STEP;
      const speed = Math.hypot(drone.vel.x, drone.vel.z);
      const nextStatusSpeed = `HS ${speed.toFixed(1)}m/s`;
      const nextStatusAlt   = `H ${drone.pos.y.toFixed(1)}m`;
      if (statusSpeed && nextStatusSpeed !== lastStatusSpeed) {
        statusSpeed.textContent = nextStatusSpeed;
        lastStatusSpeed = nextStatusSpeed;
      }
      if (statusAlt && nextStatusAlt !== lastStatusAlt) {
        statusAlt.textContent = nextStatusAlt;
        lastStatusAlt = nextStatusAlt;
      }
      updateSpeedTape(speed);
      updateCompass(drone.yaw);
      updateHorizon(drone.pitch, drone.roll);
      updateDriftIndicator(!drone.vpsActive);
      updateInputViz();
    }

    // Slick zone pulse
    if (!drone.vpsActive) {
      const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 8);
      levelSlickZones.forEach(sz => {
        if (sz.mesh && sz.mesh.material) {
          sz.mesh.material.opacity = 0.55 + pulse * 0.35;
        }
      });
    } else {
      levelSlickZones.forEach(sz => {
        if (sz.mesh && sz.mesh.material) sz.mesh.material.opacity = 0.8;
      });
    }
  }

  loop();
}
