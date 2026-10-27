/**
 * common.js – Shared building blocks, procedural generators, and helpers for levels.
 */

import * as THREE from '../three.js';
import { scene } from '../scene.js';
import {
  levelObjects, setLevelObjects,
  obstacles, setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates, setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate, setMovingGate,
  softCheckpoints, setSoftCheckpoints,
  missions, setMissions,
  setWindVector
} from '../state.js';
import {
  createFlightGate,
  createLandingPad,
  createSlickZone,
  createSoftCheckpoint,
  createWaypoint,
  createInspectionTower,
  createGhostDrone,
  checkGatePass
} from '../gates.js';

export {
  THREE,
  scene,
  levelObjects, setLevelObjects,
  obstacles, setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates, setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate, setMovingGate,
  softCheckpoints, setSoftCheckpoints,
  missions, setMissions,
  setWindVector,
  createFlightGate,
  createLandingPad,
  createSlickZone,
  createSoftCheckpoint,
  createWaypoint,
  createInspectionTower,
  createGhostDrone,
  checkGatePass
};

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL GENERATORS (Randomized World Courses)
// ─────────────────────────────────────────────────────────────────────────────

export function setupProceduralOutdoorCourse() {
  const gates = [];
  const gateCount = 7;
  for (let i = 0; i < gateCount; i++) {
    const gz = -4.0 - i * 3.8;
    const gx = (Math.random() - 0.5) * 5.5;
    const gy = 1.0 + Math.random() * 1.3;
    const rotY = (Math.random() - 0.5) * 0.5;
    const size = 1.1 + Math.random() * 0.2;
    const g = createFlightGate(gx, gy, gz, rotY, size);
    gates.push(g);
  }
  setLevelGates(gates);

  const padZ = -4.0 - gateCount * 3.8 - 2.5;
  const pad = createLandingPad(0, padZ, 0x00e5ff);
  setLevelLandingPad(pad);

  const total = gates.length + 1;
  const newMissions = gates.map((g, i) => ({
    title: `PUERTA ${i + 1} / ${total}`,
    desc: `Atraviesa el aro procedural ${i + 1} (Alt: ${g.center.y.toFixed(1)}m)`,
    target: g.center,
    check: () => checkGatePass(g, 0.45),
    onComplete: () => g.setSuccess(),
    hint: "Mantén velocidad constante y alinea el rumbo con el compás."
  }));

  newMissions.push({
    title: `META / ${total}`,
    desc: "Aterriza en el helipuerto azul final",
    target: pad.center,
    check: () => false
  });

  setMissions(newMissions);
}

export function setupProceduralIndoorWarehouse() {
  const gates = [];
  const gateCount = 6;
  const newObjects = [...levelObjects];
  const newObstacles = [...obstacles];

  // Procedural storage crates / shelves
  for (let i = 0; i < 4; i++) {
    const rx = (Math.random() - 0.5) * 7.5;
    const rz = -8.0 - i * 5.0;
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.2, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x455a64 })
    );
    rack.position.set(rx, 1.1, rz);
    scene.add(rack);
    newObjects.push(rack);
    rack.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(rack), mesh: rack });
  }
  setLevelObjects(newObjects);
  setObstacles(newObstacles);

  for (let i = 0; i < gateCount; i++) {
    const gz = -5.0 - i * 4.2;
    const gx = (Math.sin(i * 1.4) * 2.6) + (Math.random() - 0.5) * 1.0;
    const gy = 1.1 + (i % 2) * 0.8;
    const rotY = (Math.random() - 0.5) * 0.4;
    const g = createFlightGate(gx, gy, gz, rotY, 1.05);
    gates.push(g);
  }
  setLevelGates(gates);

  const pad = createLandingPad(0, -5.0 - gateCount * 4.2 - 2.5, 0xff7043);
  setLevelLandingPad(pad);

  const total = gates.length + 1;
  const newMissions = gates.map((g, i) => ({
    title: `ALMACÉN ${i + 1} / ${total}`,
    desc: `Cruza el aro ${i + 1} entre las estanterías (Alt: ${g.center.y.toFixed(1)}m)`,
    target: g.center,
    check: () => checkGatePass(g, 0.45),
    onComplete: () => g.setSuccess(),
    hint: "Ten cuidado con los racks industriales a los lados."
  }));

  newMissions.push({
    title: `FINAL / ${total}`,
    desc: "Aterriza en la zona naranja de descarga",
    target: pad.center,
    check: () => false
  });

  setMissions(newMissions);
}

export function setupProceduralStormCourse() {
  const gates = [];
  const gateCount = 6;

  // Randomized wind
  const wAngle = Math.random() * Math.PI * 2;
  const wForce = 2.5 + Math.random() * 1.5;
  const wVec = new THREE.Vector3(Math.cos(wAngle), 0, Math.sin(wAngle)).multiplyScalar(wForce);
  setWindVector(wVec);

  // Random slick zones
  const slickZones = [
    createSlickZone((Math.random() - 0.5) * 4, -10, 5, 6),
    createSlickZone((Math.random() - 0.5) * 4, -18, 5, 6)
  ];
  setLevelSlickZones(slickZones);

  for (let i = 0; i < gateCount; i++) {
    const gz = -4.5 - i * 4.0;
    const gx = (Math.random() - 0.5) * 5.0;
    const gy = 1.0 + Math.random() * 1.4;
    const rotY = (Math.random() - 0.5) * 0.5;
    const g = createFlightGate(gx, gy, gz, rotY, 1.15);
    gates.push(g);
  }
  setLevelGates(gates);

  const pad = createLandingPad(0, -4.5 - gateCount * 4.0 - 2.5, 0xef5350);
  setLevelLandingPad(pad);

  const total = gates.length + 1;
  const newMissions = gates.map((g, i) => ({
    title: `TORMENTA ${i + 1} / ${total}`,
    desc: `Compensa la deriva de viento y cruza el Aro ${i + 1}`,
    target: g.center,
    check: () => checkGatePass(g, 0.45),
    onComplete: () => g.setSuccess(),
    hint: "La ráfaga de viento cambia de ángulo; observa el indicador ámbar en el HUD."
  }));

  newMissions.push({
    title: `EMERGENCIA / ${total}`,
    desc: "¡Aterrizaje forzoso en la zona de evacuación!",
    target: pad.center,
    check: () => false
  });

  setMissions(newMissions);
}
