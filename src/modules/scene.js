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
  scene    = new THREE.Scene();
  camera   = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  // ── Renderer with cinematic colour grading ──────────────────────────────
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  // outputColorSpace is the current API (Three.js r152+); fall back to the
  // legacy outputEncoding for older builds (r128 used here via CDN).
  if (THREE.SRGBColorSpace !== undefined) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding; // eslint-disable-line
  }
  container.appendChild(renderer.domElement);

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
        // above horizon: blend haze band near 0 then sweep up to top
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
      topColor:     { value: new THREE.Color(0x3a7bd5) },   // deep blue zenith
      hazeColor:    { value: new THREE.Color(0xe8a87c) },   // golden haze mid-sky
      horizonColor: { value: new THREE.Color(0xf5c892) },   // warm peach horizon
      bottomColor:  { value: new THREE.Color(0x3b5e3a) },   // dark green underside
      exponent:     { value: 0.45 }
    },
    side: THREE.BackSide,
    depthWrite: false
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat));

  // ── Sun disc ─────────────────────────────────────────────────────────────
  const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0, fog: false });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 32), sunDiscMat);
  sunDisc.position.set(240, 360, 180);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  // Sun glow halo
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.18, fog: false, side: THREE.DoubleSide });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(30, 32), haloMat);
  halo.position.copy(sunDisc.position);
  halo.lookAt(0, 0, 0);
  scene.add(halo);

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
      // fade at edges
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
    scene.add(cloud);
  });

  // ── Lights ────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xffe4b5, 0x3b5e3a, 0.65));
  const sun = new THREE.DirectionalLight(0xfff0cc, 1.1);
  sun.position.set(40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near  = 0.5;
  sun.shadow.camera.far   = 300;
  sun.shadow.camera.left  = -80;
  sun.shadow.camera.right =  80;
  sun.shadow.camera.top   =  80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Ambient fill light for warmer feel
  scene.add(new THREE.AmbientLight(0xffd580, 0.15));

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
      vec3 colA = vec3(0.29, 0.49, 0.25);  // bright grass
      vec3 colB = vec3(0.18, 0.32, 0.15);  // dark grass
      gl_FragColor = vec4(mix(colA, colB, n), 1.0);
    }
  `;
  const groundMat = new THREE.ShaderMaterial({ vertexShader: groundVS, fragmentShader: groundFS });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Dirt path strip ───────────────────────────────────────────────────────
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 35),
    new THREE.MeshStandardMaterial({ color: 0x8b6244, roughness: 0.95, metalness: 0.0 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.011, -15);
  scene.add(path);

  // ── Grid ──────────────────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(60, 60, 0x6b4f2a, 0x4a3520);
  grid.position.y = 0.012;
  scene.add(grid);

  // ── Start pad – distinctive with rings and H marker ───────────────────────
  const padMat = new THREE.MeshStandardMaterial({ color: 0x0097a7, roughness: 0.35, metalness: 0.2 });
  const startPad = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.025, 32), padMat);
  startPad.position.set(0, 0.01, 0);
  startPad.castShadow = true;
  scene.add(startPad);

  // Concentric ring 1
  const ring1Mat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x003344, roughness: 0.3 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 8, 48), ring1Mat);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.set(0, 0.028, 0);
  scene.add(ring1);

  // Concentric ring 2
  const ring2Mat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, emissive: 0x001a22, roughness: 0.3 });
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 8, 48), ring2Mat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.set(0, 0.028, 0);
  scene.add(ring2);

  // H marker bars (cross shape)
  const hMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333, roughness: 0.4 });
  [
    { sx: 0.06, sz: 0.32, px: -0.18, pz: 0 },
    { sx: 0.06, sz: 0.32, px:  0.18, pz: 0 },
    { sx: 0.34, sz: 0.06, px:   0,   pz: 0 },
  ].forEach(({ sx, sz, px, pz }) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.005, sz), hMat);
    bar.position.set(px, 0.033, pz);
    scene.add(bar);
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

  // ── Wind particles (larger count, varied sizes via scale) ─────────────────
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

  // ── Drone mesh ───────────────────────────────────────────────────────────
  _buildDrone();

  // Initial camera position
  camera.position.set(0, 0.8, 2.2);
  camera.lookAt(0, 0.1, 0);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ─── Environment: trees, houses, rocks ────────────────────────────────────
function _buildEnvironment() {
  const rand = seededRand(42);

  // ── Low-poly trees ──────────────────────────────────────────────────────
  const trunkMat   = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
  const foliageMats = [
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.8 }),
  ];

  for (let t = 0; t < 22; t++) {
    // Scatter outside the central flight corridor (beyond 12 m radius)
    let tx, tz;
    do {
      tx = (rand() - 0.5) * 90;
      tz = (rand() - 0.5) * 90;
    // Reject if inside the drone start zone OR inside the flight path corridor
    } while ((Math.abs(tx) < 8 && Math.abs(tz) < 8) ||
             (Math.abs(tx) < 8 && tz > -30 && tz < 5));

    const treeH   = 2.5 + rand() * 3.5;
    const trunkH  = treeH * 0.45;
    const foliageR = treeH * 0.32 + 0.4;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, trunkH, 7), trunkMat);
    trunk.position.set(tx, trunkH / 2, tz);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);

    // Layered cone foliage (2 layers)
    const fMat = foliageMats[t % foliageMats.length];
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(foliageR, treeH * 0.6, 7), fMat);
    cone1.position.set(tx, trunkH + treeH * 0.22, tz);
    cone1.castShadow = true;
    scene.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(foliageR * 0.65, treeH * 0.45, 7), fMat);
    cone2.position.set(tx, trunkH + treeH * 0.52, tz);
    cone2.castShadow = true;
    scene.add(cone2);
  }

  // ── Low-poly houses ──────────────────────────────────────────────────────
  const wallColors  = [0xdeb887, 0xc8a97a, 0xe8d5b0, 0xb0896a, 0xd4a373];
  const roofColors  = [0x8b3a3a, 0x6b3030, 0xa04545, 0x7a4040, 0x5c2e2e];

  const housePositions = [
    { x: -28, z: -18 }, { x: 32, z: -22 }, { x: -35, z: 20 },
    { x: 25,  z: 25  }, { x:  0, z: -38 }
  ];

  housePositions.forEach(({ x, z }, i) => {
    const w = 3.5 + rand() * 1.5;
    const d = 2.5 + rand() * 1.0;
    const wallH = 2.0 + rand() * 0.8;
    const rot = rand() * Math.PI * 2;

    const houseGroup = new THREE.Group();
    houseGroup.rotation.y = rot;

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[i % wallColors.length], roughness: 0.85 });
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    wallMesh.position.y = wallH / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    houseGroup.add(wallMesh);

    // Roof (pyramid via ConeGeometry with 4 sides)
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[i % roofColors.length], roughness: 0.7 });
    const roofW = Math.max(w, d) * 0.72;
    const roofH = 1.2 + rand() * 0.6;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(roofW, roofH, 4), roofMat);
    roof.position.y = wallH + roofH / 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    houseGroup.add(roof);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.05), doorMat);
    door.position.set(0, 0.45, d / 2 + 0.01);
    houseGroup.add(door);

    houseGroup.position.set(x, 0, z);
    scene.add(houseGroup);
  });

  // ── Rocks / boulders ────────────────────────────────────────────────────
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7a6a, roughness: 0.9, metalness: 0.0 });
  for (let r = 0; r < 14; r++) {
    let rx, rz;
    do {
      rx = (rand() - 0.5) * 70;
      rz = (rand() - 0.5) * 70;
    } while (Math.abs(rx) < 6 && Math.abs(rz) < 6);

    const rs = 0.15 + rand() * 0.35;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), rockMat);
    rock.position.set(rx, rs * 0.5, rz);
    rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  // ── Perimeter fence ──────────────────────────────────────────────────────
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.85 });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x9e8060 });
  const fenceR  = 32;
  const postCount = 40;
  for (let p = 0; p < postCount; p++) {
    const angle = (p / postCount) * Math.PI * 2;
    const fx = Math.cos(angle) * fenceR;
    const fz = Math.sin(angle) * fenceR;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), postMat);
    post.position.set(fx, 0.5, fz);
    post.castShadow = true;
    scene.add(post);

    // Wire between consecutive posts
    const nextAngle = ((p + 1) / postCount) * Math.PI * 2;
    const nx = Math.cos(nextAngle) * fenceR;
    const nz = Math.sin(nextAngle) * fenceR;
    const wGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(fx, 0.7, fz),
      new THREE.Vector3(nx, 0.7, nz)
    ]);
    scene.add(new THREE.Line(wGeo, wireMat));
    const wGeo2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(fx, 0.35, fz),
      new THREE.Vector3(nx, 0.35, nz)
    ]);
    scene.add(new THREE.Line(wGeo2, wireMat));
  }
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
  baseMesh.castShadow = true;
  droneGroup.add(baseMesh);

  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.018, 8), topCapMat);
  topCap.position.y = 0.029;
  droneGroup.add(topCap);

  // Camera bump (front)
  const camMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3 });
  const camBump = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), camMat);
  camBump.position.set(0, 0.01, -0.09);
  droneGroup.add(camBump);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshStandardMaterial({ color: 0x1a3a5c, metalness: 0.8, roughness: 0.1 }));
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
    // Motor cylinder
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.018, 12), motorMat);
    motor.position.set(x, y - 0.005, z);
    droneGroup.add(motor);

    // Propeller group
    const g = new THREE.Group();

    // Disc (more segments for smoothness)
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.058, 32), propMat);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);

    // Ellipse blades
    [-1, 1].forEach(sign => {
      // Build an ellipse curve for blade shape
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

  // LED lights: emissive spheres (red=front, green=rear)
  const ledDefs = [
    { pos: [ 0.115, 0.024,  0.115], color: 0x00ff44 },   // rear-right  green
    { pos: [-0.115, 0.024,  0.115], color: 0x00ff44 },   // rear-left   green
    { pos: [ 0.115, 0.024, -0.115], color: 0xff2200 },   // front-right red
    { pos: [-0.115, 0.024, -0.115], color: 0xff2200 },   // front-left  red
  ];
  const ledMeshes = [];
  ledDefs.forEach(({ pos, color }) => {
    const ledMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.3 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), ledMat);
    led.position.set(...pos);
    droneGroup.add(led);
    ledMeshes.push(led);
  });

  // Motor lights (point lights, still exported for physics.js ramp animation)
  motorLights = propPositions.map(([x, y, z], i) => {
    const light = new THREE.PointLight(ledDefs[i] ? ledDefs[i].color : 0xffffff, 0, 0.5);
    light.position.set(x, y + 0.02, z);
    droneGroup.add(light);
    // Also link led emissive intensity
    light._led = ledMeshes[i];
    return light;
  });

  droneGroup.position.set(0, 0.02, 0);
  scene.add(droneGroup);
}
