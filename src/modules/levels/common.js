/**
 * common.js – Shared building blocks, procedural generators, and helpers for levels.
 */

import * as THREE from '../three.js';
import { scene } from '../scene.js';
import {
  drone,
  levelObjects, setLevelObjects,
  obstacles, setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates, setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate, setMovingGate,
  softCheckpoints, setSoftCheckpoints,
  missions, setMissions,
  setWindVector,
  operationalEntities, setOperationalEntities
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
  drone,
  levelObjects, setLevelObjects,
  obstacles, setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates, setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate, setMovingGate,
  softCheckpoints, setSoftCheckpoints,
  missions, setMissions,
  setWindVector,
  operationalEntities, setOperationalEntities,
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

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL & CINEMATIC ENTITIES (Advanced Missions)
// ─────────────────────────────────────────────────────────────────────────────

export function createGroundVehicle(waypoints, speed = 5.5, color = 0xffab00) {
  const group = new THREE.Group();

  // Chassis
  const bodyGeo = new THREE.BoxGeometry(1.5, 0.45, 3.0);
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.42;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.2, 0.42, 1.6);
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 0.76, -0.2);
  group.add(cabin);

  // Headlights (front at z = -1.5)
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
  const hlGeo = new THREE.BoxGeometry(0.25, 0.12, 0.05);
  const hlLeft = new THREE.Mesh(hlGeo, hlMat);
  hlLeft.position.set(-0.55, 0.42, -1.52);
  const hlRight = new THREE.Mesh(hlGeo, hlMat);
  hlRight.position.set( 0.55, 0.42, -1.52);
  group.add(hlLeft, hlRight);

  // Taillights (back at z = +1.5)
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  const tlLeft = new THREE.Mesh(hlGeo, tlMat);
  tlLeft.position.set(-0.55, 0.42, 1.52);
  const tlRight = new THREE.Mesh(hlGeo, tlMat);
  tlRight.position.set( 0.55, 0.42, 1.52);
  group.add(tlLeft, tlRight);

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x212121 });
  const wheels = [];
  [
    [-0.8, 0.32, -0.9],
    [ 0.8, 0.32, -0.9],
    [-0.8, 0.32,  0.9],
    [ 0.8, 0.32,  0.9]
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    group.add(wheel);
    wheels.push(wheel);
  });

  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  // Compute waypoint segment lengths and cumulative distances
  const pts = waypoints.map(p => ({ x: p[0], z: p[1] }));
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    const d = Math.hypot(next.x - pts[i].x, next.z - pts[i].z);
    segLengths.push(d);
    totalLength += d;
  }

  let distAlong = 0;

  // Obstacle box for car
  const carBox = { box: new THREE.Box3(), mesh: body };
  setObstacles([...obstacles, carBox]);

  const vehicleObj = {
    group,
    body,
    center: new THREE.Vector3(),
    speed,
    trackingTime: 0,
    update(dt) {
      if (totalLength === 0) return;
      distAlong = (distAlong + this.speed * dt) % totalLength;

      // Find current segment
      let accum = 0;
      let segIdx = 0;
      while (segIdx < segLengths.length - 1 && accum + segLengths[segIdx] < distAlong) {
        accum += segLengths[segIdx];
        segIdx++;
      }
      const segT = (distAlong - accum) / (segLengths[segIdx] || 1);
      const p1 = pts[segIdx];
      const p2 = pts[(segIdx + 1) % pts.length];

      const curX = p1.x + (p2.x - p1.x) * segT;
      const curZ = p1.z + (p2.z - p1.z) * segT;
      const yaw = Math.atan2(p2.x - p1.x, p2.z - p1.z) + Math.PI;

      group.position.set(curX, 0, curZ);
      group.rotation.y = yaw;
      this.center.set(curX, 0.6, curZ);

      wheels.forEach(w => {
        w.rotation.x += (this.speed * dt) / 0.32;
      });

      body.updateWorldMatrix(true, false);
      carBox.box.setFromObject(body);
    },
    checkTracking(drone, minDistance = 2.0, maxDistance = 9.5) {
      const d = drone.pos.distanceTo(this.center);
      return (d >= minDistance && d <= maxDistance);
    }
  };

  setOperationalEntities([...operationalEntities, vehicleObj]);
  return vehicleObj;
}

export function createMovingPlatform(waypoints, speed = 3.2, padColor = 0x00e676) {
  const group = new THREE.Group();

  // Truck bed platform
  const bedMat = new THREE.MeshLambertMaterial({ color: 0x455a64 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 4.4), bedMat);
  bed.position.y = 0.25;

  // Cabin
  const cabMat = new THREE.MeshLambertMaterial({ color: 0x1e88e5 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.4), cabMat);
  cab.position.set(0, 0.9, -1.8);
  group.add(bed, cab);

  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  // Landing pad attached on truck bed
  const pad = createLandingPad(0, 0, padColor);
  pad._precisionRadius = 0.95;
  setLevelLandingPad(pad);

  // Compute waypoint segments
  const pts = waypoints.map(p => ({ x: p[0], z: p[1] }));
  const segLengths = [];
  let totalLength = 0;
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    const d = Math.hypot(next.x - pts[i].x, next.z - pts[i].z);
    segLengths.push(d);
    totalLength += d;
  }

  let distAlong = 0;

  const platformBox = { box: new THREE.Box3(), mesh: bed };
  setObstacles([...obstacles, platformBox]);

  const platformObj = {
    group,
    pad,
    center: new THREE.Vector3(),
    speed,
    update(dt) {
      if (totalLength === 0) return;
      distAlong = (distAlong + this.speed * dt) % totalLength;

      let accum = 0;
      let segIdx = 0;
      while (segIdx < segLengths.length - 1 && accum + segLengths[segIdx] < distAlong) {
        accum += segLengths[segIdx];
        segIdx++;
      }
      const segT = (distAlong - accum) / (segLengths[segIdx] || 1);
      const p1 = pts[segIdx];
      const p2 = pts[(segIdx + 1) % pts.length];

      const curX = p1.x + (p2.x - p1.x) * segT;
      const curZ = p1.z + (p2.z - p1.z) * segT;
      const yaw = Math.atan2(p2.x - p1.x, p2.z - p1.z) + Math.PI;

      group.position.set(curX, 0, curZ);
      group.rotation.y = yaw;

      pad.position.set(curX, 0.48, curZ);
      pad.center.set(curX, 0.48, curZ);

      bed.updateWorldMatrix(true, false);
      platformBox.box.setFromObject(bed);
    }
  };

  setOperationalEntities([...operationalEntities, platformObj]);
  return platformObj;
}

export function createWindTurbine(x, z, towerHeight = 11.0, rotorSpeed = 0.35) {
  const group = new THREE.Group();

  // Tapered tower
  const towerGeo = new THREE.CylinderGeometry(0.35, 0.65, towerHeight, 16);
  const towerMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.y = towerHeight / 2;
  group.add(tower);

  // Nacelle
  const nacelleGeo = new THREE.BoxGeometry(1.2, 1.1, 2.6);
  const nacelleMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
  const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
  nacelle.position.set(0, towerHeight, 0);
  group.add(nacelle);

  // Rotor group
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(0, towerHeight, -1.35);

  // Hub spinner
  const hubGeo = new THREE.ConeGeometry(0.4, 0.7, 16);
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  hub.rotation.x = -Math.PI / 2;
  rotorGroup.add(hub);

  // 3 blades
  const bladeLength = 4.8;
  const bladeGeo = new THREE.BoxGeometry(0.24, bladeLength, 0.08);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3;
    const bladeArm = new THREE.Group();
    bladeArm.rotation.z = angle;

    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    bladeMesh.position.y = bladeLength / 2;

    const tipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.6, 0.09), hubMat);
    tipMesh.position.y = bladeLength - 0.3;
    bladeArm.add(bladeMesh, tipMesh);

    rotorGroup.add(bladeArm);
  }

  group.add(rotorGroup);
  group.position.set(x, 0, z);
  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  tower.updateWorldMatrix(true, false);
  const towerBox = { box: new THREE.Box3().setFromObject(tower), mesh: tower };
  setObstacles([...obstacles, towerBox]);

  const turbineObj = {
    group,
    rotorGroup,
    hubPos: new THREE.Vector3(x, towerHeight, z - 1.4),
    topTipPos: new THREE.Vector3(x, towerHeight + bladeLength, z - 1.4),
    midBladePos: new THREE.Vector3(x - 2.8, towerHeight - 2.0, z - 1.4),
    rotorSpeed,
    update(dt) {
      rotorGroup.rotation.z += this.rotorSpeed * dt;
    }
  };

  setOperationalEntities([...operationalEntities, turbineObj]);
  return turbineObj;
}

export function createRescueStation(x, y, z) {
  const group = new THREE.Group();

  // Wreckage crate
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xff5722 });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), crateMat);
  crate.position.set(0, y - 0.25, 0);
  group.add(crate);

  // Strobe beacon light
  const beaconGeo = new THREE.SphereGeometry(0.22, 12, 10);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, y + 0.25, 0);
  group.add(beacon);

  // Outer pulse ring
  const ringGeo = new THREE.TorusGeometry(0.85, 0.03, 6, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, y, 0);
  group.add(ring);

  group.position.set(x, 0, z);
  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  const stationObj = {
    group,
    center: new THREE.Vector3(x, y, z),
    hoverTime: 0,
    requiredTime: 4.0,
    isCompleted: false,
    update(dt, elapsedTime) {
      const pulse = 0.4 + 0.6 * Math.sin(elapsedTime * 8);
      ring.scale.setScalar(0.85 + pulse * 0.25);
      ringMat.opacity = 0.3 + pulse * 0.4;
      beaconMat.color.setHex(pulse > 0.5 ? 0x00e5ff : 0xff1744);
    },
    checkHover(drone, dt) {
      if (this.isCompleted) return { active: true, progress: 1.0, done: true };
      const dist = drone.pos.distanceTo(this.center);
      const speed = drone.vel.length();
      const inZone = (dist <= 1.25 && speed <= 0.45);
      if (inZone) {
        this.hoverTime += dt;
        if (this.hoverTime >= this.requiredTime) {
          this.isCompleted = true;
          beaconMat.color.setHex(0x00e676);
          ringMat.color.setHex(0x00e676);
          return { active: true, progress: 1.0, done: true };
        }
        return { active: true, progress: this.hoverTime / this.requiredTime, done: false };
      } else {
        this.hoverTime = Math.max(0, this.hoverTime - dt * 1.5);
        return { active: false, progress: this.hoverTime / this.requiredTime, done: false };
      }
    }
  };

  setOperationalEntities([...operationalEntities, stationObj]);
  return stationObj;
}

export function createCrowdSafetyZone(x, z, width, depth, minAltitude = 3.0) {
  const group = new THREE.Group();

  // Bleachers structure
  const stepMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const stepsCount = 4;
  for (let s = 0; s < stepsCount; s++) {
    const sw = width;
    const sd = depth / stepsCount;
    const sh = 0.35 * (s + 1);
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), stepMat);
    stepMesh.position.set(0, sh / 2, (s - stepsCount / 2 + 0.5) * sd);
    group.add(stepMesh);
  }

  // Spectator crowd figures (stylized colored cylinders)
  const figMatA = new THREE.MeshLambertMaterial({ color: 0x1e88e5 });
  const figMatB = new THREE.MeshLambertMaterial({ color: 0xffb300 });
  const figMatC = new THREE.MeshLambertMaterial({ color: 0xe53935 });
  const mats = [figMatA, figMatB, figMatC];
  const figGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, 8);

  for (let s = 0; s < stepsCount; s++) {
    const sh = 0.35 * (s + 1);
    const zPos = (s - stepsCount / 2 + 0.5) * (depth / stepsCount);
    for (let f = -width / 2 + 0.6; f < width / 2 - 0.4; f += 0.85) {
      const fig = new THREE.Mesh(figGeo, mats[Math.floor(Math.random() * mats.length)]);
      fig.position.set(f + (Math.random() - 0.5) * 0.15, sh + 0.32, zPos);
      group.add(fig);
    }
  }

  // Safety buffer boundary line on ground
  const lineGeo = new THREE.BoxGeometry(width + 0.4, 0.04, depth + 0.4);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xff1744, wireframe: true });
  const lineMesh = new THREE.Mesh(lineGeo, lineMat);
  lineMesh.position.y = 0.02;
  group.add(lineMesh);

  group.position.set(x, 0, z);
  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  const zoneObj = {
    group,
    minAltitude,
    bounds: {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    },
    checkSafety(drone) {
      const inX = drone.pos.x >= this.bounds.minX && drone.pos.x <= this.bounds.maxX;
      const inZ = drone.pos.z >= this.bounds.minZ && drone.pos.z <= this.bounds.maxZ;
      if (inX && inZ) {
        return drone.pos.y >= this.minAltitude;
      }
      return true;
    }
  };

  setOperationalEntities([...operationalEntities, zoneObj]);
  return zoneObj;
}

export function createFloatingObstacle(baseX, baseY, baseZ, options = {}) {
  const group = new THREE.Group();
  const color = options.color || 0xec407a;
  const radius = options.radius || 0.45;

  const sphereGeo = new THREE.SphereGeometry(radius, 14, 12);
  const sphereMat = new THREE.MeshLambertMaterial({ color });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Decorative tail string
  const tailGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0x90a4ae });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.y = -0.55;
  group.add(tail);

  group.position.set(baseX, baseY, baseZ);
  scene.add(group);
  setLevelObjects([...levelObjects, group]);

  const obsBox = { box: new THREE.Box3(), mesh: sphere };
  setObstacles([...obstacles, obsBox]);

  const ampY = options.ampY !== undefined ? options.ampY : 0.6;
  const speedY = options.speedY !== undefined ? options.speedY : 1.2;
  const ampX = options.ampX !== undefined ? options.ampX : 1.4;
  const speedX = options.speedX !== undefined ? options.speedX : 0.8;
  const phase = options.phase || 0;

  const floatingObj = {
    group,
    center: new THREE.Vector3(baseX, baseY, baseZ),
    update(dt, elapsedTime) {
      const curY = baseY + Math.sin(elapsedTime * speedY + phase) * ampY;
      const curX = baseX + Math.sin(elapsedTime * speedX + phase) * ampX;
      group.position.y = curY;
      group.position.x = curX;
      this.center.set(curX, curY, baseZ);
      sphere.updateWorldMatrix(true, false);
      obsBox.box.setFromObject(sphere);
    }
  };

  setOperationalEntities([...operationalEntities, floatingObj]);
  return floatingObj;
}

export function updateOperationalEntities(dt, elapsedTime) {
  if (!operationalEntities || operationalEntities.length === 0) return;
  operationalEntities.forEach(ent => {
    if (ent && typeof ent.update === 'function') {
      ent.update(dt, elapsedTime);
    }
  });
}
