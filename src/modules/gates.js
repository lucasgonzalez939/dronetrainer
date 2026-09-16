/**
 * gates.js – Gate / landing pad / slick zone / waypoint / orbit creation and gate-pass detection.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { scene } from './scene.js';
import {
  levelObjects, setLevelObjects,
  obstacles,    setObstacles,
  drone
} from './state.js';

const _gateLocalPos = new THREE.Vector3();

export function createFlightGate(x, y, z, rotY = 0, size = 1.4) {
  const gateGroup = new THREE.Group();

  // Glowing ring material with higher emissive
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xff9800, roughness: 0.25, metalness: 0.1,
    emissive: 0x7a3800, emissiveIntensity: 0.8
  });
  const thick = 0.12;

  const topSeg = new THREE.Mesh(new THREE.BoxGeometry(size + thick*2, thick, thick), ringMat);
  topSeg.position.set(0,  size/2 + thick/2, 0);
  topSeg.castShadow = true;
  const btmSeg = new THREE.Mesh(new THREE.BoxGeometry(size + thick*2, thick, thick), ringMat);
  btmSeg.position.set(0, -size/2 - thick/2, 0);
  btmSeg.castShadow = true;
  const lSeg = new THREE.Mesh(new THREE.BoxGeometry(thick, size, thick), ringMat);
  lSeg.position.set(-size/2 - thick/2, 0, 0);
  lSeg.castShadow = true;
  const rSeg = new THREE.Mesh(new THREE.BoxGeometry(thick, size, thick), ringMat);
  rSeg.position.set( size/2 + thick/2, 0, 0);
  rSeg.castShadow = true;

  const legHeight = Math.max(0.01, y - size/2 - thick);
  const legGeo  = new THREE.CylinderGeometry(0.04, 0.04, legHeight, 16);
  const legMat  = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-size/2 - thick/2, -size/2 - thick - legHeight/2, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set( size/2 + thick/2, -size/2 - thick - legHeight/2, 0);
  rightLeg.castShadow = true;

  gateGroup.add(topSeg, btmSeg, lSeg, rSeg, leftLeg, rightLeg);
  gateGroup.position.set(x, y, z);
  gateGroup.rotation.y = rotY;
  scene.add(gateGroup);

  // Point light at gate centre for glow effect
  const gateLight = new THREE.PointLight(0xff9800, 0.6, size * 2.5);
  gateLight.position.set(x, y, z);
  scene.add(gateLight);

  const newLevelObjects = [...levelObjects, gateGroup, gateLight];
  setLevelObjects(newLevelObjects);

  const newObstacles = [...obstacles];
  [topSeg, btmSeg, lSeg, rSeg, leftLeg, rightLeg].forEach(part => {
    part.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(part), mesh: part });
  });
  setObstacles(newObstacles);

  return {
    center: new THREE.Vector3(x, y, z),
    radius: size / 2,
    group: gateGroup,
    ringMat,
    gateLight,
    setSuccess: () => {
      ringMat.color.setHex(0x00ffcc);
      ringMat.emissive.setHex(0x007755);
      ringMat.emissiveIntensity = 1.0;
      gateLight.color.setHex(0x00ffcc);
    }
  };
}

export function createSlickZone(x, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0x29b6f6, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.8 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.018, z);
  scene.add(mesh);
  setLevelObjects([...levelObjects, mesh]);
  return {
    mesh,
    bounds: { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2 }
  };
}

export function createLandingPad(x, z, color = 0xffeb3b) {
  const padMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.022, 32), padMat);
  pad.position.set(x, 0.011, z);
  pad.castShadow = true;
  scene.add(pad);

  // Concentric outer ring
  const ringMat = new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color).multiplyScalar(0.25),
    roughness: 0.3, metalness: 0.2
  });
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.04, 8, 48), ringMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.set(x, 0.024, z);
  scene.add(outerRing);

  // H marker bars
  const hMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  [
    { sx: 0.07, sz: 0.38, px: -0.22, pz: 0 },
    { sx: 0.07, sz: 0.38, px:  0.22, pz: 0 },
    { sx: 0.40, sz: 0.07, px:   0,   pz: 0 },
  ].forEach(({ sx, sz, px, pz }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.005, sz), hMat);
    bar.position.set(x + px, 0.025, z + pz);
    scene.add(bar);
    setLevelObjects([...levelObjects, bar]);
  });

  // Point light over pad for visibility
  const padLight = new THREE.PointLight(new THREE.Color(color), 0.5, 4.0);
  padLight.position.set(x, 1.5, z);
  scene.add(padLight);

  setLevelObjects([...levelObjects, pad, outerRing, padLight]);
  return pad;
}

export function checkGatePass(gate, depthThreshold = 0.5) {
  if (drone.pos.distanceTo(gate.center) >= gate.radius + 0.8) return false;
  gate.group.worldToLocal(_gateLocalPos.copy(drone.pos));
  return Math.sqrt(_gateLocalPos.x * _gateLocalPos.x + _gateLocalPos.y * _gateLocalPos.y) < gate.radius
      && Math.abs(_gateLocalPos.z) < depthThreshold;
}

// ── Waypoint marker ──────────────────────────────────────────────────────
// Returns { center, radius, mesh, check, setSuccess }
export function createWaypoint(x, y, z, color = 0x00e676, radius = 0.4) {
  const geo  = new THREE.SphereGeometry(0.18, 14, 10);
  const mat  = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.85, roughness: 0.3
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // Pulse ring around waypoint
  const ringGeo = new THREE.TorusGeometry(0.32, 0.025, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const ring    = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y, z);
  scene.add(ring);

  setLevelObjects([...levelObjects, mesh, ring]);

  const wp = {
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
  return wp;
}

// ── Ghost drone (formation marker) ──────────────────────────────────────
// Returns { mesh, clearanceRadius }
export function createGhostDrone(x, y, z) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, transparent: true, opacity: 0.35,
    emissive: 0x00e5ff, emissiveIntensity: 0.3, roughness: 0.4
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 8), bodyMat);
  group.add(body);

  const armMat = new THREE.MeshStandardMaterial({ color: 0x0090aa, transparent: true, opacity: 0.3 });
  [[ 0.115, 0,  0.115], [-0.115, 0,  0.115],
   [ 0.115, 0, -0.115], [-0.115, 0, -0.115]].forEach(([ax, ay, az]) => {
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.005, 12), armMat);
    prop.position.set(ax, ay + 0.02, az);
    group.add(prop);
  });

  group.position.set(x, y, z);
  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  return { mesh: group, center: new THREE.Vector3(x, y, z), clearanceRadius: 0.3 };
}

// ── Orbit-gate ring (n gates evenly spaced around a centre point) ────────
// Returns array of gate objects
export function createOrbitGates(cx, cy, cz, orbitRadius, count, gateSize = 1.2) {
  const gates = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const gx = cx + Math.cos(angle) * orbitRadius;
    const gz = cz + Math.sin(angle) * orbitRadius;
    const rotY = angle + Math.PI / 2; // face tangentially
    const gate = createFlightGate(gx, cy, gz, rotY, gateSize);
    gates.push(gate);
  }
  return gates;
}

// ── Lit inspection tower ─────────────────────────────────────────────────
// Returns the tower group
export function createInspectionTower(x, z, height = 6.0) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.6, metalness: 0.3 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, height, 12), bodyMat);
  shaft.position.y = height / 2;
  shaft.castShadow = true;
  group.add(shaft);

  const capMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffd54f, emissiveIntensity: 0.6, roughness: 0.4 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), capMat);
  cap.position.y = height + 0.3;
  group.add(cap);

  // Point light at top
  const light = new THREE.PointLight(0xffd54f, 1.5, 12);
  light.position.set(x, height + 0.3, z);
  scene.add(light);

  group.position.set(x, 0, z);
  scene.add(group);

  setLevelObjects([...levelObjects, group, light]);
  return group;
}

export function createFlightGate(x, y, z, rotY = 0, size = 1.4) {
  const gateGroup = new THREE.Group();

  // Glowing ring material with higher emissive
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xff9800, roughness: 0.25, metalness: 0.1,
    emissive: 0x7a3800, emissiveIntensity: 0.8
  });
  const thick = 0.12;

  const topSeg = new THREE.Mesh(new THREE.BoxGeometry(size + thick*2, thick, thick), ringMat);
  topSeg.position.set(0,  size/2 + thick/2, 0);
  topSeg.castShadow = true;
  const btmSeg = new THREE.Mesh(new THREE.BoxGeometry(size + thick*2, thick, thick), ringMat);
  btmSeg.position.set(0, -size/2 - thick/2, 0);
  btmSeg.castShadow = true;
  const lSeg = new THREE.Mesh(new THREE.BoxGeometry(thick, size, thick), ringMat);
  lSeg.position.set(-size/2 - thick/2, 0, 0);
  lSeg.castShadow = true;
  const rSeg = new THREE.Mesh(new THREE.BoxGeometry(thick, size, thick), ringMat);
  rSeg.position.set( size/2 + thick/2, 0, 0);
  rSeg.castShadow = true;

  const legHeight = Math.max(0.01, y - size/2 - thick);
  const legGeo  = new THREE.CylinderGeometry(0.04, 0.04, legHeight, 16);
  const legMat  = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-size/2 - thick/2, -size/2 - thick - legHeight/2, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set( size/2 + thick/2, -size/2 - thick - legHeight/2, 0);
  rightLeg.castShadow = true;

  gateGroup.add(topSeg, btmSeg, lSeg, rSeg, leftLeg, rightLeg);
  gateGroup.position.set(x, y, z);
  gateGroup.rotation.y = rotY;
  scene.add(gateGroup);

  // Point light at gate centre for glow effect
  const gateLight = new THREE.PointLight(0xff9800, 0.6, size * 2.5);
  gateLight.position.set(x, y, z);
  scene.add(gateLight);

  const newLevelObjects = [...levelObjects, gateGroup, gateLight];
  setLevelObjects(newLevelObjects);

  const newObstacles = [...obstacles];
  [topSeg, btmSeg, lSeg, rSeg, leftLeg, rightLeg].forEach(part => {
    part.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(part), mesh: part });
  });
  setObstacles(newObstacles);

  return {
    center: new THREE.Vector3(x, y, z),
    radius: size / 2,
    group: gateGroup,
    ringMat,
    gateLight,
    setSuccess: () => {
      ringMat.color.setHex(0x00ffcc);
      ringMat.emissive.setHex(0x007755);
      ringMat.emissiveIntensity = 1.0;
      gateLight.color.setHex(0x00ffcc);
    }
  };
}

export function createSlickZone(x, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0x29b6f6, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.8 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.018, z);
  scene.add(mesh);
  setLevelObjects([...levelObjects, mesh]);
  return {
    mesh,
    bounds: { minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2 }
  };
}

export function createLandingPad(x, z, color = 0xffeb3b) {
  const padMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.022, 32), padMat);
  pad.position.set(x, 0.011, z);
  pad.castShadow = true;
  scene.add(pad);

  // Concentric outer ring
  const ringMat = new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color).multiplyScalar(0.25),
    roughness: 0.3, metalness: 0.2
  });
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.04, 8, 48), ringMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.set(x, 0.024, z);
  scene.add(outerRing);

  // H marker bars
  const hMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  [
    { sx: 0.07, sz: 0.38, px: -0.22, pz: 0 },
    { sx: 0.07, sz: 0.38, px:  0.22, pz: 0 },
    { sx: 0.40, sz: 0.07, px:   0,   pz: 0 },
  ].forEach(({ sx, sz, px, pz }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.005, sz), hMat);
    bar.position.set(x + px, 0.025, z + pz);
    scene.add(bar);
    setLevelObjects([...levelObjects, bar]);
  });

  // Point light over pad for visibility
  const padLight = new THREE.PointLight(new THREE.Color(color), 0.5, 4.0);
  padLight.position.set(x, 1.5, z);
  scene.add(padLight);

  setLevelObjects([...levelObjects, pad, outerRing, padLight]);
  return pad;
}

export function checkGatePass(gate, depthThreshold = 0.5) {
  if (drone.pos.distanceTo(gate.center) >= gate.radius + 0.8) return false;
  gate.group.worldToLocal(_gateLocalPos.copy(drone.pos));
  return Math.sqrt(_gateLocalPos.x * _gateLocalPos.x + _gateLocalPos.y * _gateLocalPos.y) < gate.radius
      && Math.abs(_gateLocalPos.z) < depthThreshold;
}
