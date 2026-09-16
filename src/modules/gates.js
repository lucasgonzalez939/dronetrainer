/**
 * gates.js – Gate / landing pad / slick zone creation and gate-pass detection.
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
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.3, emissive: 0x331e00 });
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
  const legGeo  = new THREE.CylinderGeometry(0.04, 0.04, legHeight, 16);
  const legMat  = new THREE.MeshStandardMaterial({ color: 0x37474f });
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

  return {
    center: new THREE.Vector3(x, y, z),
    radius: size / 2,
    group: gateGroup,
    ringMat,
    setSuccess: () => {
      ringMat.color.setHex(0x00ffcc);
      ringMat.emissive.setHex(0x003322);
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
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.02, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3 })
  );
  pad.position.set(x, 0.01, z);
  scene.add(pad);
  setLevelObjects([...levelObjects, pad]);
  return pad;
}

export function checkGatePass(gate, depthThreshold = 0.5) {
  if (drone.pos.distanceTo(gate.center) >= gate.radius + 0.8) return false;
  gate.group.worldToLocal(_gateLocalPos.copy(drone.pos));
  return Math.sqrt(_gateLocalPos.x * _gateLocalPos.x + _gateLocalPos.y * _gateLocalPos.y) < gate.radius
      && Math.abs(_gateLocalPos.z) < depthThreshold;
}
