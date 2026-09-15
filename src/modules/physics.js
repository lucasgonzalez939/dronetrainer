/**
 * physics.js – Flight physics, collision detection, and visual aid updates.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import {
  FlightState, CONFIG, DIFFICULTY,
  drone, rawInput, filteredInput, crashAngVel,
  levelSlickZones, obstacles,
  windVector,
  isFreestyleMode,
  fsWindPreset
} from './state.js';
import {
  scene,
  droneGroup, propGroups, motorLights,
  motorStartupTimer, setMotorStartupTimer,
  shadowDisc, shadowMat,
  vpsBeam, vpsBeamMat,
  headingArrow, headingArrowMat,
  YAW_ARC_SEGS, yawArcPositions, yawArcGeo, yawArcMat,
  yawArcStartAngle, setYawArcStartAngle,
  yawArcAlpha,      setYawArcAlpha,
  TRAIL_LEN, trailPositions, trailGeo, trailMat, trailHistory,
  altRing, altRingMat,
  WIND_PARTICLE_COUNT, windParticleGeo, windParticleMat, windParticles,
  camera
} from './scene.js';
import { setFlightState } from './flightState.js';
import { FREESTYLE_WIND_PRESETS } from './freestyle.js';
import { LEVEL_DEFS } from './levels.js';

const vpsWarningEl = document.getElementById('vps-warning');

export function checkAndResolveCollisions() {
  if (drone.state === FlightState.LANDED) return;
  const closestPoint = new THREE.Vector3();

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    obs.box.clampPoint(drone.pos, closestPoint);
    const distSq = drone.pos.distanceToSquared(closestPoint);

    if (distSq < (drone.radius * drone.radius)) {
      const normal = new THREE.Vector3().subVectors(drone.pos, closestPoint);
      const dist   = Math.sqrt(distSq);
      normal.divideScalar(dist > 0.0001 ? dist : 1.0);

      drone.pos.addScaledVector(normal, drone.radius - dist);

      if (drone.vel.length() > 2.0) {
        setFlightState(FlightState.CRASHED);
        return;
      } else {
        const vDotN = drone.vel.dot(normal);
        if (vDotN < 0) {
          drone.vel.subScaledVector(normal, 1.3 * vDotN);
          drone.vel.multiplyScalar(0.6);
        }
      }
    }
  }
}

export function updateFlightPhysics(dt, elapsedTime, isFPVMode, currentLevel) {
  if (drone.state === FlightState.CRASHED) {
    drone.vel.y -= 9.8 * dt;
    drone.pos.addScaledVector(drone.vel, dt);
    drone.pitch += crashAngVel.x * dt;
    drone.yaw   += crashAngVel.y * dt;
    drone.roll  += crashAngVel.z * dt;
    crashAngVel.x *= Math.max(0, 1 - 2.5 * dt);
    crashAngVel.y *= Math.max(0, 1 - 2.5 * dt);
    crashAngVel.z *= Math.max(0, 1 - 2.5 * dt);

    if (drone.pos.y <= 0.02) {
      drone.pos.y = 0.02;
      drone.vel.set(0, 0, 0);
    }
    droneGroup.position.copy(drone.pos);
    droneGroup.rotation.set(drone.pitch, drone.yaw, drone.roll);
    updateVisualAids(dt, elapsedTime);
    return;
  }

  if (drone.state === FlightState.TAKING_OFF) {
    const newTimer = motorStartupTimer + dt;
    setMotorStartupTimer(newTimer);
    const ramp = Math.min(newTimer / 0.4, 1.0);
    motorLights.forEach(l => { l.intensity = ramp * 0.6; });
  } else {
    setMotorStartupTimer(0);
    motorLights.forEach(l => { l.intensity = 0; });
  }

  const filterFactor = 1.0 - Math.exp(-CONFIG.INPUT_FILTER * dt);
  filteredInput.throttle += (rawInput.throttle - filteredInput.throttle) * filterFactor;
  filteredInput.yaw      += (rawInput.yaw      - filteredInput.yaw)      * filterFactor;
  filteredInput.pitch    += (rawInput.pitch    - filteredInput.pitch)    * filterFactor;
  filteredInput.roll     += (rawInput.roll     - filteredInput.roll)     * filterFactor;

  let inSlick = false;
  if (DIFFICULTY.vpsOn) {
    for (const sz of levelSlickZones) {
      const b = sz.bounds;
      if (drone.pos.x >= b.minX && drone.pos.x <= b.maxX &&
          drone.pos.z >= b.minZ && drone.pos.z <= b.maxZ &&
          drone.pos.y <= 2.5) {
        inSlick = true;
        break;
      }
    }
  }

  drone.vpsActive = !inSlick;
  vpsWarningEl.style.display = inSlick ? 'block' : 'none';

  const activeWindScale = isFreestyleMode
    ? FREESTYLE_WIND_PRESETS[fsWindPreset].scale
    : LEVEL_DEFS[currentLevel].windScale;
  const gustAmp = activeWindScale * 0.12;
  const gust = Math.sin(elapsedTime * 1.5) * gustAmp;
  const windMult = DIFFICULTY.windOn ? DIFFICULTY.windStrength : 0;
  const currentWind = windVector.clone().multiplyScalar((1.0 + gust) * windMult);

  const turbForce = new THREE.Vector3(0, 0, 0);
  if (DIFFICULTY.turbOn && drone.state === FlightState.FLYING) {
    const t = elapsedTime;
    turbForce.set(
      (Math.sin(t * 7.3) + Math.sin(t * 3.1)) * 0.5 * DIFFICULTY.turbStrength * 0.4,
      (Math.sin(t * 5.7) + Math.sin(t * 2.9)) * 0.25 * DIFFICULTY.turbStrength * 0.3,
      (Math.sin(t * 6.1) + Math.sin(t * 4.3)) * 0.5 * DIFFICULTY.turbStrength * 0.4
    );
  }

  switch (drone.state) {
    case FlightState.LANDED:
      drone.pos.y = 0.02;
      drone.vel.set(0, 0, 0);
      drone.pitch = 0;
      drone.roll  = 0;
      break;

    case FlightState.TAKING_OFF:
      drone.vel.set(0, CONFIG.TAKEOFF_SPEED, 0);
      drone.pos.y += drone.vel.y * dt;
      if (drone.pos.y >= drone.targetHoverAlt) {
        drone.pos.y = drone.targetHoverAlt;
        drone.vel.set(0, 0, 0);
        setFlightState(FlightState.FLYING);
      }
      break;

    case FlightState.LANDING:
      drone.vel.x *= Math.max(0, 1.0 - CONFIG.NORMAL_DRAG * dt);
      drone.vel.z *= Math.max(0, 1.0 - CONFIG.NORMAL_DRAG * dt);
      drone.vel.y  = -CONFIG.LANDING_SPEED;
      drone.pos.addScaledVector(drone.vel, dt);
      if (drone.pos.y <= 0.02) {
        drone.pos.y = 0.02;
        drone.vel.set(0, 0, 0);
        setFlightState(FlightState.LANDED);
        // checkMissionLanding is called from loop via missions module
      }
      break;

    case FlightState.FLYING: {
      drone.yawRate += (-filteredInput.yaw * CONFIG.MAX_YAW_RATE - drone.yawRate) * (CONFIG.ACCEL_DAMP * dt);
      drone.yaw     += drone.yawRate * dt;

      const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);
      const right   = new THREE.Vector3(1,0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);

      const targetVx = filteredInput.roll  * CONFIG.MAX_SPEED;
      const targetVz = -filteredInput.pitch * CONFIG.MAX_SPEED;
      const targetVy =  filteredInput.throttle * CONFIG.MAX_VERT_SPEED;

      const targetWorldVel = new THREE.Vector3()
        .addScaledVector(right,    targetVx)
        .addScaledVector(forward, -targetVz);
      targetWorldVel.y = targetVy;

      drone.vel.lerp(targetWorldVel, 1.0 - Math.exp(-CONFIG.ACCEL_DAMP * dt));

      const activeDrag = drone.vpsActive ? CONFIG.NORMAL_DRAG : CONFIG.VPS_FAIL_DRAG;

      if (filteredInput.roll === 0 && filteredInput.pitch === 0) {
        drone.vel.x *= Math.max(0, 1.0 - activeDrag * dt);
        drone.vel.z *= Math.max(0, 1.0 - activeDrag * dt);
        if (!drone.vpsActive) {
          drone.vel.addScaledVector(currentWind, dt * 1.8);
        }
      }

      drone.vel.addScaledVector(turbForce, dt);

      if (filteredInput.throttle === 0) {
        drone.vel.y *= Math.max(0, 1.0 - CONFIG.NORMAL_DRAG * dt);
      }

      drone.pos.addScaledVector(drone.vel, dt);

      if (drone.pos.y < 0.08) { drone.pos.y = 0.08; drone.vel.y = 0; }
      break;
    }
  }

  checkAndResolveCollisions();

  const forwardNorm = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);
  const rightNorm   = new THREE.Vector3(1,0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);
  const localVx = drone.vel.dot(rightNorm);
  const localVz = drone.vel.dot(forwardNorm);

  const targetRoll  = -(localVx / CONFIG.MAX_SPEED) * CONFIG.TILT_FACTOR;
  const targetPitch =  (localVz / CONFIG.MAX_SPEED) * CONFIG.TILT_FACTOR;
  const tiltLerp = 1.0 - Math.exp(-6.0 * dt);
  drone.roll  += (targetRoll  - drone.roll)  * tiltLerp;
  drone.pitch += (targetPitch - drone.pitch) * tiltLerp;

  droneGroup.position.copy(drone.pos);
  droneGroup.rotation.set(0, 0, 0);
  droneGroup.rotateY(drone.yaw);
  droneGroup.rotateX(drone.pitch);
  droneGroup.rotateZ(drone.roll);

  updateVisualAids(dt, elapsedTime);

  if (isFPVMode) {
    const fpvForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);
    camera.position.copy(drone.pos).addScaledVector(new THREE.Vector3(0,1,0), 0.04);
    camera.lookAt(drone.pos.clone().add(fpvForward.multiplyScalar(5)));
  } else {
    const lookTarget  = drone.pos.clone().add(new THREE.Vector3(0, 0.15, 0));
    const camOffset   = new THREE.Vector3(0, 0.75, 1.8).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);
    const targetCamPos = drone.pos.clone().add(camOffset);
    if (targetCamPos.y < 0.25) targetCamPos.y = 0.25;
    camera.position.lerp(targetCamPos, 0.06);
    camera.lookAt(lookTarget);
  }
}

export function updateVisualAids(dt, elapsedTime) {
  const alt    = Math.max(drone.pos.y, 0.02);
  const speedH = Math.hypot(drone.vel.x, drone.vel.z);

  shadowDisc.position.set(drone.pos.x, 0.015, drone.pos.z);
  const baseScale     = 1.0 + alt * 0.45;
  const stretchFactor = 1.0 + speedH * 0.18;
  const velAngle = Math.atan2(drone.vel.x, drone.vel.z);
  shadowDisc.rotation.set(-Math.PI / 2, 0, velAngle);
  shadowDisc.scale.set(baseScale * stretchFactor, baseScale, 1);
  shadowMat.opacity = Math.max(0.15, 0.7 - alt * 0.2);

  if (drone.state === FlightState.FLYING || drone.state === FlightState.TAKING_OFF) {
    vpsBeam.visible = true;
    vpsBeam.position.set(drone.pos.x, alt/2, drone.pos.z);
    vpsBeam.scale.set(1.0, alt, 1.0);
    vpsBeamMat.color.setHex(drone.vpsActive ? 0x00e5ff : 0xff3d00);
  } else {
    vpsBeam.visible = false;
  }

  const arrowAltScale = 0.8 + alt * 0.4;
  headingArrow.position.set(drone.pos.x, 0.022, drone.pos.z);
  headingArrow.rotation.set(0, drone.yaw, 0);
  headingArrow.scale.setScalar(arrowAltScale);
  headingArrowMat.opacity = Math.max(0.35, Math.min(0.9, 0.9 - alt * 0.08));

  const isYawing = Math.abs(drone.yawRate) > 0.05;
  let newArcAlpha = yawArcAlpha;
  let newArcStart = yawArcStartAngle;
  if (isYawing) {
    newArcAlpha = Math.min(1, yawArcAlpha + dt * 4);
    newArcStart = drone.yaw - Math.sign(drone.yawRate) * Math.abs(drone.yawRate) * 0.6;
  } else {
    newArcAlpha = Math.max(0, yawArcAlpha - dt * 3);
  }
  setYawArcAlpha(newArcAlpha);
  setYawArcStartAngle(newArcStart);
  yawArcMat.opacity = newArcAlpha * 0.55;
  const arcRadius = 0.5 * arrowAltScale;
  const arcSpan   = Math.sign(drone.yawRate || 1) * Math.min(Math.abs(drone.yawRate) * 0.5, Math.PI * 0.6);
  for (let i = 0; i < YAW_ARC_SEGS; i++) {
    const t = i / (YAW_ARC_SEGS - 1);
    const a = newArcStart + arcSpan * t;
    yawArcPositions[i*3+0] = drone.pos.x + Math.sin(a) * arcRadius;
    yawArcPositions[i*3+1] = 0;
    yawArcPositions[i*3+2] = drone.pos.z + Math.cos(a) * arcRadius;
  }
  yawArcGeo.attributes.position.needsUpdate = true;

  if (drone.state === FlightState.FLYING || drone.state === FlightState.TAKING_OFF) {
    trailHistory.unshift({ x: drone.pos.x, y: drone.pos.y, z: drone.pos.z });
    if (trailHistory.length > TRAIL_LEN) trailHistory.length = TRAIL_LEN;
  } else if (trailHistory.length > 0) {
    trailHistory.pop();
  }
  const pts = trailHistory.length;
  for (let i = 0; i < pts; i++) {
    trailPositions[i*3+0] = trailHistory[i].x;
    trailPositions[i*3+1] = trailHistory[i].y;
    trailPositions[i*3+2] = trailHistory[i].z;
  }
  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.setDrawRange(0, Math.max(2, pts));
  trailMat.opacity = Math.min(0.45, speedH * 0.12);

  const isAirborne = drone.state !== FlightState.LANDED;
  const propSpeed  = isAirborne ? (20 + Math.abs(filteredInput.throttle) * 40) : 0;
  propGroups.forEach((pg, i) => {
    pg.rotation.y += propSpeed * (i % 2 === 0 ? 1 : -1) * dt;
  });

  altRing.position.set(drone.pos.x, drone.pos.y, drone.pos.z);
  const ringRadius = 0.3 + alt * 0.45;
  altRing.scale.setScalar(ringRadius / 0.5);
  altRingMat.opacity = Math.max(0.1, 0.45 - alt * 0.04);
  altRing.visible = (drone.state !== FlightState.LANDED);

  if (DIFFICULTY.windOn && elapsedTime !== undefined) {
    const wLen = windVector.length();
    const wDir = wLen > 0.001 ? windVector.clone().divideScalar(wLen) : new THREE.Vector3(1, 0, 0);
    const pArr = windParticleGeo.attributes.position.array;
    for (let i = 0; i < WIND_PARTICLE_COUNT; i++) {
      pArr[i*3+0] += wDir.x * wLen * dt * 0.8;
      pArr[i*3+2] += wDir.z * wLen * dt * 0.8;
      const px = pArr[i*3+0] - drone.pos.x;
      const pz = pArr[i*3+2] - drone.pos.z;
      if (px > 20)  pArr[i*3+0] -= 40;
      if (px < -20) pArr[i*3+0] += 40;
      if (pz > 20)  pArr[i*3+2] -= 40;
      if (pz < -20) pArr[i*3+2] += 40;
    }
    windParticleGeo.attributes.position.needsUpdate = true;
    windParticleMat.opacity = Math.min(0.35, wLen * 0.08);
    windParticles.visible = wLen > 0.05;
  } else {
    windParticles.visible = false;
  }
}
