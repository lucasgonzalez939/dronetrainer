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
  name: "NIVEL 24",
  subtitle: "Certificación Máster Profesional (Examen Integral)",
  desc: "Examen de graduación de la Academia. Combina paso oblicuo, ascenso helicoidal, giro nose-in y aterrizaje con viento cruzado.",
  objectives: [
    "Cruza la compuerta inclinada Alfa y la compuerta normal Bravo",
    "Asciende en espiral por la torre de inspección hasta el punto de cota alta",
    "Gira 180° y supera la compuerta Nose-In en aproximación descendente",
    "Aterriza con precisión certificada en el helipuerto principal"
  ],
  medalTimes: { gold: 35, silver: 50, bronze: 70 },
  windScale: 0.9,
  windDir: new THREE.Vector3(1, 0, -0.3).normalize(),
  hazards: { vpsOn: true, windOn: true },
  setup() {
    // 1. Tilted Gate
    const g1 = createFlightGate(0.0, 1.4, -6.0, 0, 1.3);
    g1.group.rotation.z = Math.PI / 8; // ~22.5 deg tilt

    // 2. Mid gate
    const g2 = createFlightGate(-2.5, 1.8, -12.0, -Math.PI / 8, 1.3);

    // 3. Central tower and high waypoint
    const tower = createInspectionTower(0.0, -20.0);
    const wpHeli = createWaypoint(2.5, 3.8, -20.0, 0x00e5ff);

    // 4. Return gate (Nose-in)
    const gReturn = createFlightGate(0.0, 2.0, -13.0, 0, 1.35);

    // 5. Final low gate
    const gFinal = createFlightGate(0.0, 1.2, -6.0, 0, 1.3);

    setLevelGates([g1, g2, gReturn, gFinal]);

    // Checkpoint ring near the tower
    const cp = createSoftCheckpoint(0.0, 2.8, -17.0, 0, 1.4);
    setSoftCheckpoints([cp]);

    const pad = createLandingPad(0.0, 0.5, 0x00e676);
    pad._precisionRadius = 0.65;
    setLevelLandingPad(pad);

    setMissions([
      { title: "FASE 1/6", desc: "Compuerta 1: Ajusta la inclinación de balanceo", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess(), hint: "Inclina levemente a estribor para sortear los marcos." },
      { title: "FASE 2/6", desc: "Compuerta 2: Viraje a babor con viento lateral", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
      { title: "FASE 3/6", desc: "Ascenso en espiral: Alcanza el sensor de alta cota (3.8m)", target: wpHeli.center, check: () => wpHeli.check(), onComplete: () => wpHeli.setSuccess(), hint: "Acelera suavemente rodeando la torre. Cuidado con el viento en altura." },
      { title: "FASE 4/6", desc: "Viraje y Retorno: Encara hacia la base y supera la compuerta de descenso", target: gReturn.center, check: () => checkGatePass(gReturn, 0.45), onComplete: () => gReturn.setSuccess(), hint: "Vuela de frente hacia ti (Nose-In) invirtiendo mentalmente la corrección del stick derecho." },
      { title: "FASE 5/6", desc: "Aproximación corta baja", target: gFinal.center, check: () => checkGatePass(gFinal, 0.45), onComplete: () => gFinal.setSuccess() },
      { title: "GRADUACIÓN 6/6", desc: "Aterriza con suavidad en el helipuerto verde", target: pad.center, check: () => false, hint: "Mantén el dron estabilizado contra la brisa y aterriza." }
    ]);
  }
};

export default level;
