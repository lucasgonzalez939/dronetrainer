import {
  THREE, scene, drone,
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
  createGhostDrone, checkGatePass,
  createFloatingObstacle
} from '../common.js';

export const level = {
  name: "MISIÓN 6",
  subtitle: "Festival de Globos y Esferas Flotantes",
  desc: "Navegación aérea de exhibición: sobrevuela el festival escolar sorteando racimos de globos aerostáticos y esferas de helio cinéticas que oscilan dinámicamente en el aire.",
  objectives: [
    "Vuela a través del festival sorteando esferas y globos en movimiento continuo",
    "Sincroniza los pasos a diferentes cotas sin rozar los obstáculos flotantes",
    "Supera las 5 compuertas de festival con trazado en eslalon tridimensional",
    "Aterriza con honores en el helipuerto ceremonial"
  ],
  isOperation: true,
  medalTimes: { gold: 58, silver: 82, bronze: 115 },
  windScale: 0.6,
  windDir: new THREE.Vector3(0.4, 0, 0.2).normalize(),
  hazards: { vpsOn: true, windOn: true },
  setup() {
    // Dynamic floating festival spheres and balloons
    const ball1 = createFloatingObstacle(-2.0, 1.8, -10.0, { color: 0xe91e63, ampX: 1.8, speedX: 1.0, ampY: 0.4 });
    const ball2 = createFloatingObstacle( 2.2, 2.2, -16.0, { color: 0x9c27b0, ampX: 1.6, speedX: 0.8, ampY: 0.5, phase: Math.PI });
    const ball3 = createFloatingObstacle( 0.0, 3.2, -22.0, { color: 0x00bcd4, ampX: 2.2, speedX: 1.1, ampY: 0.6 });
    const ball4 = createFloatingObstacle(-2.5, 2.4, -28.0, { color: 0xff9800, ampX: 1.5, speedX: 0.9, ampY: 0.5 });
    const ball5 = createFloatingObstacle( 2.5, 1.6, -34.0, { color: 0x4caf50, ampX: 1.8, speedX: 1.2, ampY: 0.4, phase: Math.PI / 2 });

    // Flight gates interwoven between the dynamic spheres
    const gEntry = createFlightGate(0.0, 1.6, -5.0, 0, 1.4);
    const g1 = createFlightGate( 1.5, 1.8, -12.5, -Math.PI / 10, 1.35);
    const g2 = createFlightGate(-1.5, 2.2, -19.0,  Math.PI / 10, 1.35);
    const g3 = createFlightGate( 0.0, 3.0, -25.0, 0, 1.4);
    const g4 = createFlightGate( 1.8, 2.0, -31.0, -Math.PI / 10, 1.35);
    const gFinal = createFlightGate(0.0, 1.4, -38.0, 0, 1.4);

    setLevelGates([gEntry, g1, g2, g3, g4, gFinal]);

    // Checkpoint in the middle of festival
    const cp = createSoftCheckpoint(0.0, 2.6, -22.0, 0, 1.4);
    setSoftCheckpoints([cp]);

    const pad = createLandingPad(0.0, -44.0, 0xffd700);
    setLevelLandingPad(pad);

    setMissions([
      { title: "ENTRADA 1/11", desc: "Compuerta de entrada al festival", target: gEntry.center, check: () => checkGatePass(gEntry, 0.5), onComplete: () => gEntry.setSuccess() },
      { title: "ESLALON 2/11", desc: "Supera la Compuerta 1 esquivando la Esfera Rosa en oscilación", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess(), hint: "Calcula el movimiento pendular del globo antes de entrar al aro." },
      { title: "ESLALON 3/11", desc: "Compuerta 2: Cruza evitando el Globo Púrpura", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
      { title: "CHECKPOINT 4/11", desc: "Punto de guardado aéreo sobre el festival", target: cp.center, check: () => cp.check(), onComplete: () => cp.setActivated() },
      { title: "ALTA COTA 5/11", desc: "Compuerta 3 a 3.0m sobre la Esfera Cian", target: g3.center, check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess() },
      { title: "DESCENSO 6/11", desc: "Compuerta 4 en descenso sincronizado", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
      { title: "FILTRADO 7/11", desc: "Sortear la Esfera Naranja por el flanco derecho", target: ball4.center, check: () => drone.pos.z <= -28.0 && drone.pos.distanceTo(ball4.center) > 1.2 },
      { title: "FILTRADO 8/11", desc: "Esquiva la Esfera Verde en aproximación baja", target: ball5.center, check: () => drone.pos.z <= -34.0 && drone.pos.distanceTo(ball5.center) > 1.2 },
      { title: "RECTA META 9/11", desc: "Alinea con el eje final de exhibición", target: gFinal.center, check: () => drone.pos.z <= -36.0 },
      { title: "ARCO FINAL 10/11", desc: "Supera la compuerta final del festival", target: gFinal.center, check: () => checkGatePass(gFinal, 0.5), onComplete: () => gFinal.setSuccess() },
      { title: "CEREMONIAL 11/11", desc: "Aterriza con suavidad en el helipuerto dorado", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
