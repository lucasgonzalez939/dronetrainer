import {
  THREE, scene,
  levelObjects, setLevelObjects,
  obstacles, setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates, setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate, setMovingGate,
  softCheckpoints, setSoftCheckpoints,
  missions, setMissions,
  createFlightGate, createLandingPad, createSlickZone,
  createSoftCheckpoint, createWaypoint, createInspectionTower,
  createGhostDrone, checkGatePass
} from '../common.js';

export const level = {
  name: "NIVEL 23",
  subtitle: "Micro-Helipuerto de Precisión (Tolerancia Crítica)",
  desc: "Perfecciona el toque de aterrizaje en un helipuerto de radio reducido (45 cm de tolerancia) bajo ráfagas de viento variable.",
  objectives: [
    "Cruza las 2 compuertas de aproximación baja con velocidad controlada",
    "Estabiliza el dron en vuelo estacionario sobre el micro-helipuerto",
    "Aterriza dentro de la zona de alta precisión de 45 cm"
  ],
  medalTimes: { gold: 18, silver: 28, bronze: 42 },
  windScale: 0.7,
  windDir: new THREE.Vector3(1, 0, 0.4).normalize(),
  hazards: { vpsOn: true, windOn: true },
  setup() {
    const g1 = createFlightGate(0.0, 1.2, -6.0, 0, 1.25);
    const g2 = createFlightGate(0.0, 1.1, -13.0, 0, 1.15);
    setLevelGates([g1, g2]);

    // Waypoint hover marker above pad
    const wpHover = createWaypoint(0.0, 1.0, -19.0, 0xffeb3b, 0.4);

    // Micro landing pad
    const pad = createLandingPad(0.0, -19.0, 0x00e676);
    pad._precisionRadius = 0.55; // Strict radius

    // Precision boundary ring
    const innerRingGeo = new THREE.TorusGeometry(0.48, 0.02, 6, 24);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(0.0, 0.028, -19.0);
    scene.add(innerRing);
    levelObjects.push(innerRing);

    setLevelLandingPad(pad);

    setMissions([
      { title: "APROXIMACIÓN 1/4", desc: "Supera la Compuerta 1 conteniendo la deriva por viento", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess(), hint: "Aplica leve compensación contra el viento para no desplazarte fuera del centro." },
      { title: "DESCENSO 2/4", desc: "Supera la Compuerta 2 a baja cota (1.1m)", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
      { title: "ESTACIONARIO 3/4", desc: "Mantén estacionario a 1m sobre la vertical del helipuerto", target: wpHover.center, check: () => wpHover.check(), onComplete: () => wpHover.setSuccess(), hint: "Centra el dron exactamente sobre el objetivo antes de iniciar el descenso final." },
      { title: "TOCAR TIERRA 4/4", desc: "Aterriza dentro del anillo rojo de precisión (radio 45cm)", target: pad.center, check: () => false, hint: "Toca el botón ATERRIZAR solo cuando estés perfectamente centrado." }
    ]);
  }
};

export default level;
