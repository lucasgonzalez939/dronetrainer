/**
 * freestyle.js – Freestyle mode: load, logic update, HUD update, exit.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { scene } from './scene.js';
import {
  FlightState, drone,
  levelObjects, setLevelObjects,
  obstacles,    setObstacles,
  levelSlickZones, setLevelSlickZones,
  missions, setMissions,
  missionTimer, setMissionTimer,
  timerRunning, setTimerRunning,
  isFreestyleMode, setIsFreestyleMode,
  fsGatesPassed, setFsGatesPassed,
  fsSessionTime, setFsSessionTime,
  fsBestLapTime, setFsBestLapTime,
  fsLastGateTime, setFsLastGateTime,
  fsFreestyleGates, setFsFreestyleGates,
  fsWindPreset,
  windVector, setWindVector,
  currentLevel, setCurrentLevel
} from './state.js';
import { createFlightGate, createSlickZone, checkGatePass } from './gates.js';
import { clearLevel } from './levels.js';
import { setFlightState } from './flightState.js';
import { showLevelOverlay } from './overlays.js';

export const FREESTYLE_WIND_PRESETS = {
  calm:  { dir: new THREE.Vector3(0.15, 0, 0.08), scale: 0.3 },
  mod:   { dir: new THREE.Vector3(0.5,  0, 0.25), scale: 1.4 },
  storm: { dir: new THREE.Vector3(0.9,  0, 0.4),  scale: 3.2 }
};

function rnd(min, max) { return min + Math.random() * (max - min); }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }

export function loadFreestyle() {
  clearLevel();
  setIsFreestyleMode(true);
  setFsGatesPassed(0);
  setFsSessionTime(0);
  setFsBestLapTime(Infinity);
  setFsLastGateTime(0);
  setFsFreestyleGates([]);
  setMissionTimer(0);
  setTimerRunning(true);
  setMissions([]);

  const wp = FREESTYLE_WIND_PRESETS[fsWindPreset];
  setWindVector(wp.dir.clone().multiplyScalar(wp.scale));

  const numGates = rndInt(6, 9);
  const usedPositions = [];
  const newGates = [];
  for (let i = 0; i < numGates; i++) {
    let x, z, tries = 0;
    do {
      x = rnd(-14, 14);
      z = rnd(-8, -40);
      tries++;
    } while (tries < 20 && usedPositions.some(p => Math.hypot(x-p[0], z-p[1]) < 4));
    usedPositions.push([x, z]);
    const y    = rnd(0.8, 3.0);
    const rotY = rnd(-Math.PI, Math.PI);
    const size = rnd(0.9, 1.5);
    const gate = createFlightGate(x, y, z, rotY, size);
    gate._passed = false;
    newGates.push(gate);
  }
  setFsFreestyleGates(newGates);

  const newObstacles = [...obstacles];
  const newLevelObjects = [...levelObjects];

  const numPillars = rndInt(3, 5);
  for (let i = 0; i < numPillars; i++) {
    let x, z, tries = 0;
    do {
      x = rnd(-16, 16);
      z = rnd(-5, -42);
      tries++;
    } while (tries < 20 && usedPositions.some(p => Math.hypot(x-p[0], z-p[1]) < 3));
    usedPositions.push([x, z]);
    const h = rnd(1.5, 4.5);
    const r = rnd(0.15, 0.35);
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 1.1, h, 12),
      new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.7 })
    );
    pillar.position.set(x, h / 2, z);
    pillar.castShadow = true;
    scene.add(pillar);
    newLevelObjects.push(pillar);
    pillar.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(pillar), mesh: pillar });
  }

  const numBarrels = rndInt(2, 4);
  for (let i = 0; i < numBarrels; i++) {
    let x, z, tries = 0;
    do {
      x = rnd(-14, 14);
      z = rnd(-6, -40);
      tries++;
    } while (tries < 20 && usedPositions.some(p => Math.hypot(x-p[0], z-p[1]) < 2.5));
    usedPositions.push([x, z]);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: 0xff7043, roughness: 0.5, metalness: 0.3 })
    );
    barrel.position.set(x, 0.45, z);
    barrel.castShadow = true;
    scene.add(barrel);
    newLevelObjects.push(barrel);
    barrel.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(barrel), mesh: barrel });
  }

  const numWalls = rndInt(1, 3);
  for (let i = 0; i < numWalls; i++) {
    let x, z, tries = 0;
    do {
      x = rnd(-13, 13);
      z = rnd(-7, -38);
      tries++;
    } while (tries < 20 && usedPositions.some(p => Math.hypot(x-p[0], z-p[1]) < 3.5));
    usedPositions.push([x, z]);
    const wl  = rnd(2.0, 5.0);
    const wh  = rnd(0.8, 2.0);
    const rotY = rnd(0, Math.PI);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wl, wh, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.8 })
    );
    wall.position.set(x, wh / 2, z);
    wall.rotation.y = rotY;
    wall.castShadow = true;
    scene.add(wall);
    newLevelObjects.push(wall);
    wall.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(wall), mesh: wall });
  }

  setLevelObjects(newLevelObjects);
  setObstacles(newObstacles);

  const numSlick = rndInt(1, 2);
  const newSlick = [...levelSlickZones];
  for (let i = 0; i < numSlick; i++) {
    newSlick.push(createSlickZone(rnd(-8, 8), rnd(-10, -30), rnd(4, 7), rnd(4, 7)));
  }
  setLevelSlickZones(newSlick);

  drone.pos.set(0, 0.02, 0);
  drone.vel.set(0, 0, 0);
  drone.yaw     = 0;
  drone.yawRate = 0;
  drone.pitch   = 0;
  drone.roll    = 0;
  setFlightState(FlightState.LANDED);

  document.getElementById('mission-hud').style.display    = 'none';
  document.getElementById('freestyle-hud').style.display  = 'block';
  document.getElementById('freestyle-panel').style.display = 'flex';
  updateFreestyleHUD();
}

export function updateFreestyleHUD() {
  document.getElementById('fs-gates').textContent = fsGatesPassed;
  const mins = Math.floor(fsSessionTime / 60);
  const secs = (fsSessionTime % 60).toFixed(1);
  document.getElementById('fs-time').textContent = `${mins.toString().padStart(2,'0')}:${secs.padStart(4,'0')}`;
  document.getElementById('fs-best').textContent = fsBestLapTime === Infinity ? '--' : fsBestLapTime.toFixed(2) + 's';
}

export function updateFreestyleLogic(dt) {
  if (!isFreestyleMode) return;

  setFsSessionTime(fsSessionTime + dt);

  for (const gate of fsFreestyleGates) {
    if (gate._passed) continue;

    if (checkGatePass(gate, 0.6)) {
      gate._passed = true;
      gate.setSuccess();
      setFsGatesPassed(fsGatesPassed + 1);

      const elapsed = fsSessionTime - fsLastGateTime;
      if (fsLastGateTime > 0 && elapsed < fsBestLapTime) {
        setFsBestLapTime(elapsed);
      }
      setFsLastGateTime(fsSessionTime);

      setTimeout(() => { gate._passed = false; }, 3000);
    }
  }

  updateFreestyleHUD();
}

export function exitFreestyleMode() {
  setIsFreestyleMode(false);
  clearLevel();
  document.getElementById('mission-hud').style.display    = 'block';
  document.getElementById('freestyle-hud').style.display  = 'none';
  document.getElementById('freestyle-panel').style.display = 'none';
  setFlightState(FlightState.LANDED);
  setCurrentLevel(0);
  showLevelOverlay(0, false);
}
