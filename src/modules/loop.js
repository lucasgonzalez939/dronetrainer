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
  levelSlickZones
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

export function startLoop() {
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
      const nextStatusAlt   = `ALT ${drone.pos.y.toFixed(1)}m`;
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
