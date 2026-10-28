/**
 * scene.js – Three.js scene, renderer, camera, environment, drone mesh.
 */

import * as THREE from './three.js';
import { PERFORMANCE } from './state.js';

export let scene, camera, renderer;
export let fpvPipCamera;

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
export const planeWidth = 52;
export const planeHeight = 64;

// Environment groups
export let outdoorGroup, indoorGroup;

// Drone mesh objects
export let droneGroup;
export let propGroups = [];
export let motorLights = [];
export let motorStartupTimer = 0;
const performanceClouds = [];
const performanceEnvironment = [];

export function setEnvironmentMode(isIndoor = false) {
  if (outdoorGroup) outdoorGroup.visible = !isIndoor;
  if (indoorGroup) indoorGroup.visible = isIndoor;
  if (scene && scene.fog) {
    if (isIndoor) {
      scene.fog.color.setHex(0x1a2129);
      scene.fog.density = 0.012;
    } else {
      scene.fog.color.setHex(0xd4956a);
      scene.fog.density = 0.008;
    }
  }
}

export function registerPerformanceObject(obj, kind = 'environment') {
  if (!obj) return;
  if (kind === 'cloud') {
    performanceClouds.push(obj);
  } else {
    performanceEnvironment.push(obj);
  }
}

export function getViewportSize() {
  const container = document.getElementById('canvas-container');
  const doc = document.documentElement || {};
  const pick = (primary, fallbackA, fallbackB) => (
    primary > 0 ? primary : (fallbackA > 0 ? fallbackA : (fallbackB > 0 ? fallbackB : 1))
  );
  const w = pick(container?.clientWidth || 0, window.innerWidth || 0, doc.clientWidth || 0);
  const h = pick(container?.clientHeight || 0, window.innerHeight || 0, doc.clientHeight || 0);
  return { w: Math.max(w, 320), h: Math.max(h, 240) };
}

export function updatePerformanceSettings() {
  if (!renderer) return;
  const lowPower = PERFORMANCE.lowPowerMode;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.0 : 1.25));
  renderer.shadowMap.enabled = !lowPower && PERFORMANCE.shadows;

  // Recalculate camera aspect ratio and viewport buffer dimensions
  if (camera) {
    const { w, h } = getViewportSize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  performanceClouds.forEach(obj => {
    obj.visible = !lowPower && PERFORMANCE.environment;
  });
  performanceEnvironment.forEach(obj => {
    obj.visible = !lowPower && PERFORMANCE.environment;
  });

  if (windParticles) {
    windParticles.visible = !lowPower && PERFORMANCE.windParticles && !!scene?.fog;
  }
}

// Setters for mutable primitives
export function setYawArcStartAngle(v) { yawArcStartAngle = v; }
export function setYawArcAlpha(v)      { yawArcAlpha = v; }
export function setMotorStartupTimer(v){ motorStartupTimer = v; }

// ─── Seeded pseudo-random for deterministic world layout ───────────────────
function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

export function initScene() {
  const container = document.getElementById('canvas-container');
  const applyViewportSize = () => {
    const { w, h } = getViewportSize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const { w: initialW, h: initialH } = getViewportSize();
  scene    = new THREE.Scene();
  camera   = new THREE.PerspectiveCamera(60, initialW / initialH, 0.1, 1000);
  fpvPipCamera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 300);

  // ── Renderer with cinematic colour grading ──────────────────────────────
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setSize(initialW, initialH);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  if (THREE.SRGBColorSpace !== undefined) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  if (container) container.appendChild(renderer.domElement);

  // ── Atmospheric fog ─────────────────────────────────────────────────────
  scene.fog = new THREE.FogExp2(0xd4956a, 0.008);

  // ── Sky dome – golden-hour palette ──────────────────────────────────────
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
    uniform vec3 horizonColor;
    uniform vec3 hazeColor;
    uniform vec3 bottomColor;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      if (h >= 0.0) {
        float t = max(pow(h, exponent), 0.0);
        vec3 upper = mix(hazeColor, topColor, t);
        gl_FragColor = vec4(mix(horizonColor, upper, min(h * 6.0, 1.0)), 1.0);
      } else {
        gl_FragColor = vec4(mix(horizonColor, bottomColor, max(pow(-h, exponent), 0.0)), 1.0);
      }
    }
  `;
  const skyMat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: {
      topColor:     { value: new THREE.Color(0x3a7bd5) },
      hazeColor:    { value: new THREE.Color(0xe8a87c) },
      horizonColor: { value: new THREE.Color(0xf5c892) },
      bottomColor:  { value: new THREE.Color(0x3b5e3a) },
      exponent:     { value: 0.45 }
    },
    side: THREE.BackSide,
    depthWrite: false
  });
  outdoorGroup = new THREE.Group();
  indoorGroup = new THREE.Group();
  scene.add(outdoorGroup);
  scene.add(indoorGroup);

  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat);
  outdoorGroup.add(skyMesh);

  // ── Sun disc ─────────────────────────────────────────────────────────────
  const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0, fog: false });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 32), sunDiscMat);
  sunDisc.position.set(240, 360, 180);
  sunDisc.lookAt(0, 0, 0);
  outdoorGroup.add(sunDisc);

  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.18, fog: false, side: THREE.DoubleSide });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(30, 32), haloMat);
  halo.position.copy(sunDisc.position);
  halo.lookAt(0, 0, 0);
  outdoorGroup.add(halo);

  // ── Cloud planes ─────────────────────────────────────────────────────────
  const cloudVS = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `;
  const cloudFS = `
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
    float noise(vec2 p){
      vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    void main(){
      vec2 uv = vUv * 4.0;
      float n = noise(uv)*0.5 + noise(uv*2.1)*0.25 + noise(uv*4.3)*0.125;
      float mask = smoothstep(0.38, 0.62, n);
      float edge = min(min(vUv.x,1.0-vUv.x), min(vUv.y,1.0-vUv.y)) * 6.0;
      mask *= clamp(edge, 0.0, 1.0);
      if (mask < 0.05) discard;
      gl_FragColor = vec4(color, opacity * mask);
    }
  `;
  const cloudPositions = [
    [-80, 120, -200], [60, 140, -350], [200, 100, -150], [-200, 110, -280]
  ];
  cloudPositions.forEach(([cx, cy, cz]) => {
    const cMat = new THREE.ShaderMaterial({
      vertexShader: cloudVS, fragmentShader: cloudFS,
      uniforms: { color: { value: new THREE.Color(0xfff5e0) }, opacity: { value: 0.72 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(120, 50), cMat);
    cloud.position.set(cx, cy, cz);
    cloud.lookAt(0, cy, 0);
    registerPerformanceObject(cloud, 'cloud');
    outdoorGroup.add(cloud);
  });

  // ── Lights ────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xffe4b5, 0x3b5e3a, 0.65));
  const sun = new THREE.DirectionalLight(0xfff0cc, 1.1);
  sun.position.set(40, 60, 30);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffd580, 0.2));

  // ── Ground – richer grass green with ShaderMaterial ──────────────────────
  const groundVS = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `;
  const groundFS = `
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
    float noise(vec2 p){
      vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    void main(){
      float n = noise(vUv*80.0)*0.5 + noise(vUv*200.0)*0.25;
      vec3 colA = vec3(0.29, 0.49, 0.25);
      vec3 colB = vec3(0.18, 0.32, 0.15);
      gl_FragColor = vec4(mix(colA, colB, n), 1.0);
    }
  `;
  const groundMat = new THREE.ShaderMaterial({ vertexShader: groundVS, fragmentShader: groundFS });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -18);
  outdoorGroup.add(ground);

  // ── Dirt path strip ───────────────────────────────────────────────────────
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 35),
    new THREE.MeshLambertMaterial({ color: 0x8b6244 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.011, -15);
  outdoorGroup.add(path);

  // ── Start pad – distinctive with rings and H marker ───────────────────────
  const padMat = new THREE.MeshLambertMaterial({ color: 0x67686d });
  const startPad = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.001, 24), padMat);
  startPad.position.set(0, 0.025, 0);
  outdoorGroup.add(startPad);

  // H marker bars
  const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [
    { sx: 0.06, sz: 0.32, px: -0.18, pz: 0 },
    { sx: 0.06, sz: 0.32, px:  0.18, pz: 0 },
    { sx: 0.34, sz: 0.06, px:   0,   pz: 0 },
  ].forEach(({ sx, sz, px, pz }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.005, sz), hMat);
    bar.position.set(px, 0.033, pz);
    outdoorGroup.add(bar);
  });

  // ── Visual aids ───────────────────────────────────────────────────────────
  shadowMat  = new THREE.MeshBasicMaterial({ color: 0x050d0a, transparent: true, opacity: 0.65, depthWrite: false });
  shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  scene.add(shadowDisc);

  const vpsBeamGeo = new THREE.CylinderGeometry(0.02, 0.22, 1.0, 10, 1, true);
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

  altRingMat = new THREE.MeshBasicMaterial({ color: 0x7fdfff, transparent: true, opacity: 0.18, depthWrite: false });
  altRing    = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.006, 8, 32), altRingMat);
  scene.add(altRing);

  // ── Wind particles ────────────────────────────────────────────────────────
  for (let i = 0; i < WIND_PARTICLE_COUNT; i++) {
    windParticlePositions[i*3+0] = (Math.random() - 0.5) * 40;
    windParticlePositions[i*3+1] = Math.random() * 5.0 + 0.2;
    windParticlePositions[i*3+2] = (Math.random() - 0.5) * 40;
  }
  windParticleGeo = new THREE.BufferGeometry();
  windParticleGeo.setAttribute('position', new THREE.BufferAttribute(windParticlePositions, 3));
  windParticleMat = new THREE.PointsMaterial({ color: 0xffe0aa, size: 0.10, transparent: true, opacity: 0.30, depthWrite: false, sizeAttenuation: true });
  windParticles   = new THREE.Points(windParticleGeo, windParticleMat);
  scene.add(windParticles);

  // ── Environment: trees, houses, rocks ────────────────────────────────────
  _buildEnvironment();
  _buildIndoorEnvironment();
  setEnvironmentMode(false);

  // Drone mesh
  _buildDrone();

  // Initial camera position
  camera.position.set(0, 0.8, 2.2);
  camera.lookAt(0, 0.1, 0);

  const handleResize = () => {
    applyViewportSize();
    updatePerformanceSettings();
  };

  // Configure DPR & performance first, then apply the correct viewport size
  updatePerformanceSettings();
  applyViewportSize();

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 100);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
  }
}

// ─── Environment: trees, houses, rocks ────────────────────────────────────
function _buildEnvironment() {
  const rand = seededRand(42);

  // ── Low-poly trees (optimized Lambert) ───────────────────────────────────
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
  const foliageMats = [
    new THREE.MeshLambertMaterial({ color: 0x2e7d32 }),
    new THREE.MeshLambertMaterial({ color: 0x388e3c }),
    new THREE.MeshLambertMaterial({ color: 0x1b5e20 })
  ];

  for (let t = 0; t < 12; t++) {
    let tx, tz;
    do {
      tx = (rand() - 0.5) * 44;
      tz = -18 + (rand() - 0.5) * 48;
    } while ((Math.abs(tx) < 7 && Math.abs(tz) < 7) ||
             (Math.abs(tx) < 7 && tz > -36 && tz < 4));

    const treeH = 2.4 + rand() * 2.8;
    const trunkH = treeH * 0.45;
    const foliageR = treeH * 0.32 + 0.3;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, trunkH, 6), trunkMat);
    trunk.position.set(tx, trunkH / 2, tz);
    registerPerformanceObject(trunk);
    outdoorGroup.add(trunk);

    const fMat = foliageMats[t % foliageMats.length];
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(foliageR, treeH * 0.6, 6), fMat);
    cone1.position.set(tx, trunkH + treeH * 0.22, tz);
    registerPerformanceObject(cone1);
    outdoorGroup.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(foliageR * 0.65, treeH * 0.45, 6), fMat);
    cone2.position.set(tx, trunkH + treeH * 0.52, tz);
    registerPerformanceObject(cone2);
    outdoorGroup.add(cone2);
  }

  // ── Low-poly houses (3 houses around perimeter) ──────────────────────────
  const wallColors = [0xdeb887, 0xc8a97a, 0xe8d5b0];
  const roofColors = [0x8b3a3a, 0x6b3030, 0xa04545];
  const housePositions = [
    { x: -22, z: -15 }, { x: 22, z: -20 }, { x: 0, z: -46 }
  ];

  housePositions.forEach(({ x, z }, i) => {
    const w = 3.6 + rand() * 1.0;
    const d = 2.6 + rand() * 0.8;
    const wallH = 2.0 + rand() * 0.6;
    const rot = rand() * Math.PI * 2;

    const houseGroup = new THREE.Group();
    houseGroup.rotation.y = rot;

    const wallMat = new THREE.MeshLambertMaterial({ color: wallColors[i % wallColors.length] });
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    wallMesh.position.y = wallH / 2;
    registerPerformanceObject(wallMesh);
    houseGroup.add(wallMesh);

    const roofMat = new THREE.MeshLambertMaterial({ color: roofColors[i % roofColors.length] });
    const roofW = Math.max(w, d) * 0.72;
    const roofH = 1.2;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(roofW, roofH, 4), roofMat);
    roof.position.y = wallH + roofH / 2;
    roof.rotation.y = Math.PI / 4;
    registerPerformanceObject(roof);
    houseGroup.add(roof);

    houseGroup.position.set(x, 0, z);
    registerPerformanceObject(houseGroup);
    outdoorGroup.add(houseGroup);
  });

  // ── Rocks / boulders (6 rocks) ──────────────────────────────────────────
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x7a7a6a });
  for (let r = 0; r < 6; r++) {
    let rx, rz;
    do {
      rx = (rand() - 0.5) * 40;
      rz = -18 + (rand() - 0.5) * 44;
    } while (Math.abs(rx) < 6 && Math.abs(rz + 18) < 6);

    const rs = 0.2 + rand() * 0.3;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), rockMat);
    rock.position.set(rx, rs * 0.5, rz);
    registerPerformanceObject(rock);
    outdoorGroup.add(rock);
  }

  // ── Perimeter fence (20 posts + single wire buffer) ─────────────────────
  const postMat = new THREE.MeshLambertMaterial({ color: 0x6b4f2a });
  const fenceR = 26;
  const postCount = 20;
  const wirePoints = [];

  for (let p = 0; p < postCount; p++) {
    const angle = (p / postCount) * Math.PI * 2;
    const fx = Math.cos(angle) * fenceR;
    const fz = -18 + Math.sin(angle) * fenceR;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 5), postMat);
    post.position.set(fx, 0.5, fz);
    registerPerformanceObject(post);
    outdoorGroup.add(post);

    const nextAngle = ((p + 1) / postCount) * Math.PI * 2;
    const nx = Math.cos(nextAngle) * fenceR;
    const nz = -18 + Math.sin(nextAngle) * fenceR;
    wirePoints.push(new THREE.Vector3(fx, 0.7, fz), new THREE.Vector3(nx, 0.7, nz));
    wirePoints.push(new THREE.Vector3(fx, 0.35, fz), new THREE.Vector3(nx, 0.35, nz));
  }

  const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x8d6e63 });
  const fenceLines = new THREE.LineSegments(wireGeo, wireMat);
  registerPerformanceObject(fenceLines);
  outdoorGroup.add(fenceLines);
}

// ─── Indoor Hangar Environment ────────────────────────────────────────────
function _buildIndoorEnvironment() {
  // Concrete warehouse floor
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x222831 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 52), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -18);
  indoorGroup.add(floor);

  // Floor border guide lines
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.6 });
  const lineL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 48), lineMat);
  lineL.rotation.x = -Math.PI / 2;
  lineL.position.set(-15, 0.005, -18);
  const lineR = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 48), lineMat);
  lineR.rotation.x = -Math.PI / 2;
  lineR.position.set(15, 0.005, -18);
  indoorGroup.add(lineL, lineR);

  // Hangar walls
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x323a45 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 0.4), wallMat);
  backWall.position.set(0, 3, -44);
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 0.4), wallMat);
  frontWall.position.set(0, 3, 8);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 52), wallMat);
  leftWall.position.set(-18, 3, -18);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 52), wallMat);
  rightWall.position.set(18, 3, -18);
  indoorGroup.add(backWall, frontWall, leftWall, rightWall);

  // Steel ceiling trusses
  const trussMat = new THREE.MeshLambertMaterial({ color: 0x1e242d });
  for (let z = -40; z <= 4; z += 8) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(36, 0.3, 0.3), trussMat);
    beam.position.set(0, 5.8, z);
    indoorGroup.add(beam);
  }

  // Ceiling lamps (visual only)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff8e1 });
  for (let z = -36; z <= 0; z += 12) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.3), lampMat);
    lamp.position.set(0, 5.7, z);
    indoorGroup.add(lamp);
  }

  // Start pad
  const padMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const startPad = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.001, 24), padMat);
  startPad.position.set(0, 0.025, 0);
  indoorGroup.add(startPad);

  // H marker
  const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [
    { sx: 0.06, sz: 0.32, px: -0.18, pz: 0 },
    { sx: 0.06, sz: 0.32, px:  0.18, pz: 0 },
    { sx: 0.34, sz: 0.06, px:   0,   pz: 0 },
  ].forEach(({ sx, sz, px, pz }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.005, sz), hMat);
    bar.position.set(px, 0.033, pz);
    indoorGroup.add(bar);
  });
}

// ─── Drone mesh – improved polygon quality ────────────────────────────────
function _buildDrone() {
  droneGroup = new THREE.Group();

  // Body: octagonal cylinder (CylinderGeometry with 8 sides)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, metalness: 0.55, roughness: 0.35
  });
  const topCapMat = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0, metalness: 0.3, roughness: 0.5
  });
  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 8), bodyMat);
  baseMesh.userData.hideInFpv = true;
  baseMesh.castShadow = true;
  droneGroup.add(baseMesh);

  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.018, 8), topCapMat);
  topCap.userData.hideInFpv = true;
  topCap.position.y = 0.029;
  droneGroup.add(topCap);

  // Camera bump (front)
  const camMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3 });
  const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), camMat);
  camBump.userData.hideInFpv = true;
  camBump.position.set(0, 0.01, -0.09);
  droneGroup.add(camBump);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshStandardMaterial({ color: 0x1a3a5c, metalness: 0.8, roughness: 0.1 }));
  lens.userData.hideInFpv = true;
  lens.rotation.x = -Math.PI / 2 + 0.3;
  lens.position.set(0, 0.02, -0.112);
  droneGroup.add(lens);

  // Arms: tapered cylinders
  const frontArmMat = new THREE.MeshStandardMaterial({ color: 0xff4500, metalness: 0.3, roughness: 0.5 });
  const rearArmMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.4, roughness: 0.45 });
  const armDefs = [
    { x:  0.068, z: -0.068, mat: frontArmMat, ry:  Math.PI / 4 },
    { x: -0.068, z: -0.068, mat: frontArmMat, ry: -Math.PI / 4 },
    { x:  0.068, z:  0.068, mat: rearArmMat,  ry: -Math.PI / 4 },
    { x: -0.068, z:  0.068, mat: rearArmMat,  ry:  Math.PI / 4 },
  ];
  armDefs.forEach(({ x, z, mat, ry }) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.015, 0.155, 8), mat);
    arm.userData.hideInFpv = true;
    arm.rotation.set(0, ry, Math.PI / 2);
    arm.position.set(x, 0.005, z);
    droneGroup.add(arm);
  });

  // Motor mounts + propellers
  const propPositions = [
    [ 0.115, 0.02,  0.115],
    [-0.115, 0.02,  0.115],
    [ 0.115, 0.02, -0.115],
    [-0.115, 0.02, -0.115]
  ];
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 });
  const propMat  = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.88, side: THREE.DoubleSide });

  propGroups = propPositions.map(([x, y, z]) => {
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.018, 12), motorMat);
    motor.position.set(x, y - 0.005, z);
    droneGroup.add(motor);

    const g = new THREE.Group();

    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.058, 32), propMat);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);

    [-1, 1].forEach(sign => {
      const curve = new THREE.EllipseCurve(0, 0, 0.050, 0.009, 0, Math.PI * 2, false, 0);
      const pts   = curve.getPoints(20);
      const shape = new THREE.Shape(pts);
      const bladeGeo = new THREE.ShapeGeometry(shape);
      bladeGeo.rotateX(-Math.PI / 2);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.rotation.y = sign * Math.PI / 2;
      blade.position.y = 0.003;
      g.add(blade);
    });

    g.position.set(x, y, z);
    droneGroup.add(g);
    return g;
  });

  // LED lights: emissive spheres
  const ledDefs = [
    { pos: [ 0.115, 0.024,  0.115], color: 0x00ff44 },
    { pos: [-0.115, 0.024,  0.115], color: 0x00ff44 },
    { pos: [ 0.115, 0.024, -0.115], color: 0xff2200 },
    { pos: [-0.115, 0.024, -0.115], color: 0xff2200 },
  ];
  const ledMeshes = [];
  ledDefs.forEach(({ pos, color }) => {
    const ledMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.3 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), ledMat);
    led.position.set(...pos);
    droneGroup.add(led);
    ledMeshes.push(led);
  });

  motorLights = ledMeshes.map(led => ({
    intensity: 0,
    _led: led
  }));

  droneGroup.position.set(0, 0.02, 0);
  scene.add(droneGroup);
}
