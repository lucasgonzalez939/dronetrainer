/**
 * gates.js – Gate / landing pad / slick zone / waypoint / orbit creation and gate-pass detection.
 * Highly optimized for low-resource devices (no dynamic PointLights, shared materials/geometries).
 */

import * as THREE from './three.js';
import { scene } from './scene.js';
import {
  levelObjects, setLevelObjects,
  obstacles,    setObstacles,
  drone
} from './state.js';
import {
  getGateMaterial,
  getGateLegMaterial,
  getSoftCheckpointMaterial,
  getSoftCheckpointActiveMaterial,
  getLandingPadMaterial,
  getLandingPadHMaterial
} from './assets.js';

const _gateLocalPos = new THREE.Vector3();

export function createFlightGate(x, y, z, rotY = 0, size = 1.4) {
  const gateGroup = new THREE.Group();

  const ringMat = getGateMaterial(0xff9800, 0x7a3800);
  const thick = 0.12;

  const topSeg = new THREE.Mesh(new THREE.BoxGeometry(size + thick*2, thick, thick), ringMat);
  topSeg.position.set(0,  size/2 + thick/2, 0);
  const btmSeg = new THREE.Mesh(new THREE.BoxGeometry(size + thick*2, thick, thick), ringMat);
  btmSeg.position.set(0, -size/2 - thick/2, 0);
  const lSeg = new THREE.Mesh(new THREE.BoxGeometry(thick, size, thick), ringMat);
  lSeg.position.set(-size/2 - thick/2, 0, 0);
  const rSeg = new THREE.Mesh(new THREE.BoxGeometry(thick, size, thick), ringMat);
  rSeg.position.set( size/2 + thick/2, 0, 0);

  const legHeight = Math.max(0.01, y - size/2 - thick);
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, legHeight, 8);
  const legMat = getGateLegMaterial();
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-size/2 - thick/2, -size/2 - thick - legHeight/2, 0);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set( size/2 + thick/2, -size/2 - thick - legHeight/2, 0);

  gateGroup.add(topSeg, btmSeg, lSeg, rSeg, leftLeg, rightLeg);
  gateGroup.position.set(x, y, z);
  gateGroup.rotation.y = rotY;
  scene.add(gateGroup);

  const newLevelObjects = [...levelObjects, gateGroup];
  setLevelObjects(newLevelObjects);

  const newObstacles = [...obstacles];
  [topSeg, btmSeg, lSeg, rSeg, leftLeg, rightLeg].forEach(part => {
    part.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(part), mesh: part });
  });
  setObstacles(newObstacles);

  const gateSegments = [topSeg, btmSeg, lSeg, rSeg];
  const successMat = getGateMaterial(0x00ffcc, 0x007755);

  return {
    center: new THREE.Vector3(x, y, z),
    radius: size / 2,
    group: gateGroup,
    ringMat,
    gateLight: { color: { setHex() {} }, intensity: 0 }, // Stub to avoid breaking any callers
    setSuccess: () => {
      gateSegments.forEach(seg => { seg.material = successMat; });
    }
  };
}

// Transparent soft checkpoint ring used for training respawns.
// It has no collision and does not affect mission progression directly.
export function createSoftCheckpoint(x, y, z, rotY = 0, size = 1.1) {
  const group = new THREE.Group();

  const ringMat = getSoftCheckpointMaterial();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.52, 0.05, 8, 24), ringMat);
  group.add(ring);

  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.25 });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(size * 0.66, 0.015, 6, 24), pulseMat);
  pulse.rotation.x = Math.PI / 2;
  group.add(pulse);

  group.position.set(x, y, z);
  group.rotation.y = rotY;
  scene.add(group);

  setLevelObjects([...levelObjects, group]);

  const activeMat = getSoftCheckpointActiveMaterial();

  return {
    center: new THREE.Vector3(x, y, z),
    radius: size * 0.52,
    group,
    ringMat,
    pulseMat,
    light: { intensity: 0 },
    _activated: false,
    check(depthThreshold = 0.6) {
      if (drone.pos.distanceTo(this.center) >= this.radius + 0.8) return false;
      this.group.worldToLocal(_gateLocalPos.copy(drone.pos));
      return Math.sqrt(_gateLocalPos.x * _gateLocalPos.x + _gateLocalPos.y * _gateLocalPos.y) < this.radius
        && Math.abs(_gateLocalPos.z) < depthThreshold;
    },
    setActivated() {
      this._activated = true;
      ring.material = activeMat;
      this.pulseMat.opacity = 0.45;
    }
  };
}

export function createSlickZone(x, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.018, z);
  mesh.renderOrder = 1;
  scene.add(mesh);
  setLevelObjects([...levelObjects, mesh]);
  return {
    mesh,
    bounds: { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2 }
  };
}

export function createLandingPad(x, z, color = 0xffeb3b) {
  const padMat = getLandingPadMaterial(color);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.022, 24), padMat);
  pad.position.set(x, 0.011, z);
  pad.center = new THREE.Vector3(x, 0.011, z);
  scene.add(pad);

  // Concentric outer ring
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7
  });
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.03, 6, 24), ringMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.set(x, 0.024, z);
  scene.add(outerRing);

  // H marker bars
  const hMat = getLandingPadHMaterial();
  const bars = [
    { sx: 0.07, sz: 0.38, px: -0.22, pz: 0 },
    { sx: 0.07, sz: 0.38, px:  0.22, pz: 0 },
    { sx: 0.40, sz: 0.07, px:   0,   pz: 0 },
  ].map(({ sx, sz, px, pz }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.005, sz), hMat);
    bar.position.set(x + px, 0.025, z + pz);
    scene.add(bar);
    return bar;
  });

  setLevelObjects([...levelObjects, pad, outerRing, ...bars]);
  return pad;
}

export function checkGatePass(gate, depthThreshold = 0.5) {
  if (drone.pos.distanceTo(gate.center) >= gate.radius + 0.8) return false;
  gate.group.worldToLocal(_gateLocalPos.copy(drone.pos));
  return Math.sqrt(_gateLocalPos.x * _gateLocalPos.x + _gateLocalPos.y * _gateLocalPos.y) < gate.radius
      && Math.abs(_gateLocalPos.z) < depthThreshold;
}

// ── Waypoint marker ──────────────────────────────────────────────────────
export function createWaypoint(x, y, z, color = 0x00e676, radius = 0.45) {
  const geo = new THREE.SphereGeometry(0.18, 10, 8);
  const mat = new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    transparent: true,
    opacity: 0.85
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // Pulse ring around waypoint
  const ringGeo = new THREE.TorusGeometry(0.32, 0.02, 6, 20);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y, z);
  scene.add(ring);

  setLevelObjects([...levelObjects, mesh, ring]);

  return {
    center: new THREE.Vector3(x, y, z),
    radius,
    mesh,
    ring,
    ringMat,
    _captured: false,
    check() {
      if (this._captured) return false;
      return drone.pos.distanceTo(this.center) < this.radius;
    },
    setSuccess() {
      mat.color.setHex(0x00ffcc);
      mat.emissive.setHex(0x00ffcc);
      ringMat.color.setHex(0x00ffcc);
      this._captured = true;
    },
    reset() {
      mat.color.setHex(color);
      mat.emissive.setHex(color);
      ringMat.color.setHex(color);
      this._captured = false;
    }
  };
}

// ── Ghost drone (formation marker) ──────────────────────────────────────
export function createGhostDrone(x, y, z) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.4
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 8), bodyMat);
  group.add(body);

  const armMat = new THREE.MeshBasicMaterial({ color: 0x0090aa, transparent: true, opacity: 0.35 });
  [[ 0.115, 0,  0.115], [-0.115, 0,  0.115],
   [ 0.115, 0, -0.115], [-0.115, 0, -0.115]].forEach(([ax, ay, az]) => {
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.005, 8), armMat);
    prop.position.set(ax, ay + 0.02, az);
    group.add(prop);
  });

  group.position.set(x, y, z);
  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  return { mesh: group, center: new THREE.Vector3(x, y, z), clearanceRadius: 0.3 };
}

// ── Orbit-gate ring ──────────────────────────────────────────────────────
export function createOrbitGates(cx, cy, cz, orbitRadius, count, gateSize = 1.2) {
  const gates = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const gx = cx + Math.cos(angle) * orbitRadius;
    const gz = cz + Math.sin(angle) * orbitRadius;
    const rotY = angle + Math.PI / 2;
    const gate = createFlightGate(gx, cy, gz, rotY, gateSize);
    gates.push(gate);
  }
  return gates;
}

// ── Lit inspection tower ─────────────────────────────────────────────────
export function createInspectionTower(x, z, height = 6.0) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x546e7a });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, height, 10), bodyMat);
  shaft.position.y = height / 2;
  group.add(shaft);

  const capMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), capMat);
  cap.position.y = height + 0.3;
  group.add(cap);

  group.position.set(x, 0, z);
  scene.add(group);

  // Add tower shaft to collision obstacles!
  shaft.updateWorldMatrix(true, false);
  const towerBox = new THREE.Box3().setFromObject(shaft);
  setObstacles([...obstacles, { box: towerBox, mesh: shaft }]);

  setLevelObjects([...levelObjects, group]);
  return group;
}
