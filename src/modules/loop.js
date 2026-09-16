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
const vpsVignette= document.getElementById('vps-vignette');

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
      updateBatteryBar(batteryTimeLeft, DIFFICULTY.batteryTime);
      if (batteryTimeLeft <= 0 && !batteryDepleted) {
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

    // Top-bar status
    const speed = Math.hypot(drone.vel.x, drone.vel.z);
    const statusSpeed = document.getElementById('status-speed');
    const statusAlt   = document.getElementById('status-alt');
    if (statusSpeed) statusSpeed.textContent = `HS ${speed.toFixed(1)}m/s`;
    if (statusAlt)   statusAlt.textContent   = `H ${drone.pos.y.toFixed(1)}m`;

    // FPV propeller animation
    const propBlades = fpvOverlay.querySelectorAll('.fpv-prop-blade');
    const isAirborne = drone.state !== FlightState.LANDED;
    propBlades.forEach(b => { b.style.animationPlayState = isAirborne ? 'running' : 'paused'; });

    // HUD updates
    updateSpeedTape(speed);
    updateCompass(drone.yaw);
    updateHorizon(drone.pitch, drone.roll);
    updateDriftIndicator(!drone.vpsActive);
    updateInputViz();

    // VPS vignette + slick zone pulse
    if (!drone.vpsActive) {
      vpsVignette.classList.add('active');
      const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 8);
      levelSlickZones.forEach(sz => {
        if (sz.mesh && sz.mesh.material) {
          sz.mesh.material.opacity = 0.55 + pulse * 0.35;
        }
      });
    } else {
      vpsVignette.classList.remove('active');
      levelSlickZones.forEach(sz => {
        if (sz.mesh && sz.mesh.material) sz.mesh.material.opacity = 0.8;
      });
    }
  }

  loop();
}
