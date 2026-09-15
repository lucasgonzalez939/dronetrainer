/**
 * scene.js – Three.js scene, renderer, camera, environment, drone mesh.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export let scene, camera, renderer;

// Visual aid objects (exported for physics/loop to update)
export let shadowDisc, shadowMat;
export let vpsBeam, vpsBeamMat;
export let headingArrow, headingArrowMat;
export const YAW_ARC_SEGS = 32;
export const yawArcPositions = new Float32Array(32 * 3);
export let yawArcGeo, yawArcMat, yawArcLine;
export let yawArcStartAngle = 0;
export let yawArcAlpha      = 0;
export const TRAIL_LEN = 24;
export const trailPositions = new Float32Array(24 * 3);
export let trailGeo, trailMat, trailLine;
export const trailHistory = [];
export let altRing, altRingMat;
export const WIND_PARTICLE_COUNT = 180;
export const windParticlePositions = new Float32Array(180 * 3);
export let windParticleGeo, windParticleMat, windParticles;

// Drone mesh objects
export let droneGroup;
export let propGroups = [];
export let motorLights = [];
export let motorStartupTimer = 0;

// Setters for mutable primitives
export function setYawArcStartAngle(v) { yawArcStartAngle = v; }
export function setYawArcAlpha(v)      { yawArcAlpha = v; }
export function setMotorStartupTimer(v){ motorStartupTimer = v; }

export function initScene() {
  const container = document.getElementById('canvas-container');
  scene    = new THREE.Scene();
  camera   = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Sky dome
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;
  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform vec3 groundHorizonColor;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      if (h >= 0.0) {
        gl_FragColor = vec4(mix(groundHorizonColor, topColor, max(pow(h, exponent), 0.0)), 1.0);
      } else {
        gl_FragColor = vec4(mix(groundHorizonColor, bottomColor, max(pow(-h, exponent), 0.0)), 1.0);
      }
    }
  `;
  const skyMat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: {
      topColor:           { value: new THREE.Color(0x1976d2) },
      groundHorizonColor: { value: new THREE.Color(0xcce0ff) },
      bottomColor:        { value: new THREE.Color(0x2d3a2e) },
      exponent:           { value: 0.5 }
    },
    side: THREE.BackSide
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat));

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 2048;
  sun.shadow.mapSize.height = 2048;
  scene.add(sun);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshLambertMaterial({ color: 0x243326 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(60, 60, 0x00ffcc, 0x37474f);
  grid.position.y = 0.01;
  scene.add(grid);

  // Start pad
  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.02, 32),
    new THREE.MeshStandardMaterial({ color: 0x00bcd4, roughness: 0.4 })
  );
  startPad.position.set(0, 0.01, 0);
  scene.add(startPad);

  // --- Visual aids ---
  shadowMat  = new THREE.MeshBasicMaterial({ color: 0x050d0a, transparent: true, opacity: 0.65, depthWrite: false });
  shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  scene.add(shadowDisc);

  const vpsBeamGeo = new THREE.CylinderGeometry(0.02, 0.25, 1.0, 16, 1, true);
  vpsBeamMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.15, wireframe: true, depthWrite: false });
  vpsBeam = new THREE.Mesh(vpsBeamGeo, vpsBeamMat);
  scene.add(vpsBeam);

  const headingArrowShape = new THREE.Shape();
  headingArrowShape.moveTo(0, 0.32);
  headingArrowShape.lineTo(0.10, 0.0);
  headingArrowShape.lineTo(0.04, 0.0);
  headingArrowShape.lineTo(0.04, -0.18);
  headingArrowShape.lineTo(-0.04, -0.18);
  headingArrowShape.lineTo(-0.04, 0.0);
  headingArrowShape.lineTo(-0.10, 0.0);
  headingArrowShape.closePath();
  const headingArrowGeo = new THREE.ShapeGeometry(headingArrowShape);
  headingArrowGeo.rotateX(-Math.PI / 2);
  headingArrowMat = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  headingArrow = new THREE.Mesh(headingArrowGeo, headingArrowMat);
  headingArrow.position.y = 0.022;
  scene.add(headingArrow);

  yawArcGeo = new THREE.BufferGeometry();
  yawArcGeo.setAttribute('position', new THREE.BufferAttribute(yawArcPositions, 3));
  yawArcMat  = new THREE.LineBasicMaterial({ color: 0xff9800, transparent: true, opacity: 0.55, depthWrite: false });
  yawArcLine = new THREE.Line(yawArcGeo, yawArcMat);
  yawArcLine.position.y = 0.024;
  scene.add(yawArcLine);

  trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setDrawRange(0, 2);
  trailMat  = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45, depthWrite: false });
  trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  altRingMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.4, depthWrite: false });
  altRing    = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.008, 8, 48), altRingMat);
  scene.add(altRing);

  for (let i = 0; i < WIND_PARTICLE_COUNT; i++) {
    windParticlePositions[i*3+0] = (Math.random() - 0.5) * 40;
    windParticlePositions[i*3+1] = Math.random() * 4.0 + 0.2;
    windParticlePositions[i*3+2] = (Math.random() - 0.5) * 40;
  }
  windParticleGeo = new THREE.BufferGeometry();
  windParticleGeo.setAttribute('position', new THREE.BufferAttribute(windParticlePositions, 3));
  windParticleMat = new THREE.PointsMaterial({ color: 0xaaddff, size: 0.08, transparent: true, opacity: 0.28, depthWrite: false });
  windParticles   = new THREE.Points(windParticleGeo, windParticleMat);
  scene.add(windParticles);

  // --- Drone mesh ---
  droneGroup = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
  const topMat  = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), bodyMat);
  baseMesh.castShadow = true;
  droneGroup.add(baseMesh);

  const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.14), topMat);
  topCap.position.y = 0.025;
  droneGroup.add(topCap);

  const frontArmMat = new THREE.MeshStandardMaterial({ color: 0xff1744 });
  const rearArmMat  = new THREE.MeshStandardMaterial({ color: 0x424242 });
  [
    { x:  0.055, z: -0.055, mat: frontArmMat, ry:  Math.PI/4 },
    { x: -0.055, z: -0.055, mat: frontArmMat, ry: -Math.PI/4 },
    { x:  0.055, z:  0.055, mat: rearArmMat,  ry: -Math.PI/4 },
    { x: -0.055, z:  0.055, mat: rearArmMat,  ry:  Math.PI/4 },
  ].forEach(({ x, z, mat, ry }) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.014), mat);
    arm.position.set(x, 0.01, z);
    arm.rotation.y = ry;
    droneGroup.add(arm);
  });

  const propPositions = [[0.11,0.02,0.11],[-0.11,0.02,0.11],[0.11,0.02,-0.11],[-0.11,0.02,-0.11]];
  const propMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
  propGroups = propPositions.map(([x, y, z]) => {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), propMat);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    [-1, 1].forEach(sign => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.005, 0.016),
        new THREE.MeshBasicMaterial({ color: 0x555555 }));
      blade.rotation.y = sign * Math.PI / 4;
      g.add(blade);
    });
    g.position.set(x, y, z);
    droneGroup.add(g);
    return g;
  });

  motorLights = propPositions.map(([x, y, z]) => {
    const light = new THREE.PointLight(0xffffff, 0, 0.35);
    light.position.set(x, y + 0.02, z);
    droneGroup.add(light);
    return light;
  });

  droneGroup.position.set(0, 0.02, 0);
  scene.add(droneGroup);

  // Initial camera position
  camera.position.set(0, 0.8, 2.2);
  camera.lookAt(0, 0.1, 0);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
