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
  fsWindPreset,
  gustBurstActive, gustBurstTimer, gustBurstDuration, gustBurstMult,
  setGustBurstTimer, setGustBurstActive
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

// Wind shear altitude bands: { maxAlt, dirMult }
// Each band overrides wind direction scale based on drone altitude
const WIND_SHEAR_BANDS = [
  { maxAlt: 1.0,  mult: 0.5 },    // near-ground: reduced wind (sheltered)
  { maxAlt: 2.5,  mult: 1.0 },    // mid-range: nominal
  { maxAlt: Infinity, mult: 1.6 } // high altitude: stronger
];

function getWindShearMult(alt) {
  for (const band of WIND_SHEAR_BANDS) {
    if (alt < band.maxAlt) return band.mult;
  }
  return 1.0;
}

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
    motorLights.forEach(l => {
      l.intensity = ramp * 0.6;
      if (l._led) l._led.material.emissiveIntensity = ramp;
    });
  } else {
    setMotorStartupTimer(0);
    motorLights.forEach(l => {
      l.intensity = 0;
      if (l._led) l._led.material.emissiveIntensity = 0;
    });
  }

  // ── Second-order motor RPM spool model ──────────────────────────────────
  // Each motor targets the same overall throttle demand; the spool adds
  // mechanical lag: rpm converges via a critically-damped spring.
  const MOTOR_OMEGA = 8.0;   // natural frequency
  const MOTOR_DAMP  = 1.1;   // slightly over-damped
  const throttleDemand = Math.max(0, (filteredInput.throttle + 1) / 2);
  for (let m = 0; m < 4; m++) {
    const err = throttleDemand - drone.motorRpm[m];
    drone.motorRpmVel[m] += (MOTOR_OMEGA * MOTOR_OMEGA * err - 2 * MOTOR_DAMP * MOTOR_OMEGA * drone.motorRpmVel[m]) * dt;
    drone.motorRpm[m] = Math.max(0, Math.min(1, drone.motorRpm[m] + drone.motorRpmVel[m] * dt));
  }
  const avgRpm = (drone.motorRpm[0] + drone.motorRpm[1] + drone.motorRpm[2] + drone.motorRpm[3]) * 0.25;

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

  // ── Wind shear: different strengths per altitude band ────────────────────
  const shearMult = getWindShearMult(drone.pos.y);
  const gustAmp = activeWindScale * 0.12;
  const gust = Math.sin(elapsedTime * 1.5) * gustAmp;
  const windMult = DIFFICULTY.windOn ? DIFFICULTY.windStrength : 0;

  // Wind gust burst (emergency scenario)
  let effectiveBurstMult = 1.0;
  if (gustBurstActive) {
    const remaining = gustBurstDuration - gustBurstTimer;
    if (remaining > 0) {
      effectiveBurstMult = gustBurstMult;
      setGustBurstTimer(gustBurstTimer + dt);
    } else {
      setGustBurstActive(false);
    }
  }

  const currentWind = windVector.clone()
    .multiplyScalar((1.0 + gust) * windMult * shearMult * effectiveBurstMult);

  const turbForce = new THREE.Vector3(0, 0, 0);
  if (DIFFICULTY.turbOn && drone.state === FlightState.FLYING) {
    const t = elapsedTime;
    turbForce.set(
      (Math.sin(t * 7.3) + Math.sin(t * 3.1)) * 0.5 * DIFFICULTY.turbStrength * 0.4,
      (Math.sin(t * 5.7) + Math.sin(t * 2.9)) * 0.25 * DIFFICULTY.turbStrength * 0.3,
      (Math.sin(t * 6.1) + Math.sin(t * 4.3)) * 0.5 * DIFFICULTY.turbStrength * 0.4
    );
  }

  // ── Altitude-dependent drag ─────────────────────────────────────────────
  const altDragFactor = Math.max(0.2, 1.0 - drone.pos.y * 0.02);

  switch (drone.state) {
    case FlightState.LANDED:
      drone.pos.y = 0.02;
      drone.vel.set(0, 0, 0);
      drone.pitch = 0;
      drone.roll  = 0;
      drone.pitchRate = 0;
      drone.rollRate  = 0;
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
      drone.vel.x *= Math.max(0, 1.0 - CONFIG.NORMAL_DRAG * dt * altDragFactor);
      drone.vel.z *= Math.max(0, 1.0 - CONFIG.NORMAL_DRAG * dt * altDragFactor);
      drone.vel.y  = -CONFIG.LANDING_SPEED;
      drone.pos.addScaledVector(drone.vel, dt);
      if (drone.pos.y <= 0.02) {
        drone.pos.y = 0.02;
        drone.vel.set(0, 0, 0);
        setFlightState(FlightState.LANDED);
      }
      break;

    case FlightState.FLYING: {
      const isRateMode = CONFIG.FLIGHT_MODE === 'rate';

      if (isRateMode) {
        // ── Rate / Acro mode: inputs control angular rates directly ──────
        const maxRate = CONFIG.MAX_RATE_SPEED; // rad/s
        drone.pitchRate = filteredInput.pitch * maxRate;
        drone.rollRate  = filteredInput.roll  * maxRate;
        drone.pitch += drone.pitchRate * dt;
        drone.roll  += drone.rollRate  * dt;

        // Clamp pitch/roll to ±π/2 in rate mode (allow flips theoretically)
        drone.pitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, drone.pitch));
        drone.roll  = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, drone.roll));

        // Thrust along drone body axis, projected to world
        const thrustWorld = new THREE.Vector3(
          -Math.sin(drone.roll) * avgRpm,
          Math.cos(drone.pitch) * Math.cos(drone.roll) * avgRpm,
          -Math.sin(drone.pitch) * avgRpm
        );
        const thrustScale = CONFIG.MAX_VERT_SPEED * 2.0 * filteredInput.throttle;
        drone.vel.addScaledVector(thrustWorld, thrustScale * dt);

        // Gravity
        drone.vel.y -= 9.8 * dt * 0.18; // scaled for game feel

        // Translational drag
        const drag = CONFIG.NORMAL_DRAG * altDragFactor;
        drone.vel.x *= Math.max(0, 1.0 - drag * dt);
        drone.vel.z *= Math.max(0, 1.0 - drag * dt);
        drone.vel.y *= Math.max(0, 1.0 - drag * 0.5 * dt);

      } else {
        // ── Attitude mode (original) ──────────────────────────────────────
        drone.yawRate += (-filteredInput.yaw * CONFIG.MAX_YAW_RATE - drone.yawRate) * (CONFIG.ACCEL_DAMP * dt);

        // ── Gyroscopic precession: yawing while pitched/rolled adds cross torque
        const gyroX = drone.yawRate * drone.roll  * 0.15;
        const gyroZ = drone.yawRate * drone.pitch * 0.15;
        drone.vel.x += gyroX * dt;
        drone.vel.z += gyroZ * dt;
      }

      drone.yaw += drone.yawRate * dt;

      if (!isRateMode) {
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

        const activeDrag = (drone.vpsActive ? CONFIG.NORMAL_DRAG : CONFIG.VPS_FAIL_DRAG) * altDragFactor;

        if (filteredInput.roll === 0 && filteredInput.pitch === 0) {
          drone.vel.x *= Math.max(0, 1.0 - activeDrag * dt);
          drone.vel.z *= Math.max(0, 1.0 - activeDrag * dt);
          if (!drone.vpsActive) {
            drone.vel.addScaledVector(currentWind, dt * 1.8);
          }
        }

        if (filteredInput.throttle === 0) {
          drone.vel.y *= Math.max(0, 1.0 - CONFIG.NORMAL_DRAG * dt);
        }
      }

      drone.vel.addScaledVector(turbForce, dt);
      drone.vel.addScaledVector(currentWind, dt * 0.08); // always a slight drift

      // ── Ground effect: extra upward lift when very close to ground ───────
      if (drone.pos.y < 0.3 && filteredInput.throttle > 0) {
        const groundEffectForce = filteredInput.throttle * 0.6 * (1.0 - drone.pos.y / 0.3);
        drone.vel.y += groundEffectForce * dt;
      }

      // ── Propwash turbulence on rapid descent ─────────────────────────────
      if (drone.vel.y < -0.5) {
        const propwash = Math.abs(drone.vel.y) * 0.3;
        drone.vel.x += (Math.random() - 0.5) * propwash * dt;
        drone.vel.z += (Math.random() - 0.5) * propwash * dt;
      }

      drone.pos.addScaledVector(drone.vel, dt);

      if (drone.pos.y < 0.08) { drone.pos.y = 0.08; drone.vel.y = 0; }
      break;
    }
  }

  checkAndResolveCollisions();

  if (CONFIG.FLIGHT_MODE !== 'rate' || drone.state !== FlightState.FLYING) {
    const forwardNorm = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);
    const rightNorm   = new THREE.Vector3(1,0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), drone.yaw);
    const localVx = drone.vel.dot(rightNorm);
    const localVz = drone.vel.dot(forwardNorm);

    const targetRoll  = -(localVx / CONFIG.MAX_SPEED) * CONFIG.TILT_FACTOR;
    const targetPitch =  (localVz / CONFIG.MAX_SPEED) * CONFIG.TILT_FACTOR;
    const tiltLerp = 1.0 - Math.exp(-6.0 * dt);
    drone.roll  += (targetRoll  - drone.roll)  * tiltLerp;
    drone.pitch += (targetPitch - drone.pitch) * tiltLerp;
  }

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
    vpsBeamMat.color.setHex(drone.vpsActive ? 0x00e5ff : 0xffb300);
    vpsBeamMat.opacity = drone.vpsActive ? 0.12 : 0.09;
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

  altRing.position.set(drone.pos.x, 0.028, drone.pos.z);
  const ringRadius = 0.35 + Math.min(alt, 6) * 0.18;
  altRing.scale.setScalar(ringRadius / 0.5);
  altRingMat.opacity = Math.min(0.2, 0.12 + alt * 0.015);
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
