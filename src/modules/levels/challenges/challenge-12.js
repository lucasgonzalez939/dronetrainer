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
  createGhostDrone, checkGatePass,
  setupProceduralOutdoorCourse, setupProceduralIndoorWarehouse, setupProceduralStormCourse
} from '../common.js';

export const level = {
  name: "DESAFÍO 12",
  subtitle: "Tráfico Cinético Cruzado",
  desc: "Dos compuertas móviles a frecuencias desfasadas y alta velocidad. Sincronización milimétrica sin detenerte.",
  objectives: [
    "Compuerta móvil 1 oscilando a alta frecuencia (1.3 rad/s)",
    "Compuerta móvil 2 con oscilación desfasada a 2.3m de cota",
    "Intercepta ambas compuertas en trayectoria fluida y aterriza"
  ],
  isChallenge: true,
  medalTimes: { gold: 26, silver: 38, bronze: 52 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    const g1 = createFlightGate(0.0, 1.4, -4.5, 0, 1.35);

    // Fast moving gate 1
    const gm1 = createFlightGate(0.0, 1.3, -10.5, 0, 1.35);
    gm1.speed = 1.35;
    gm1.amplitude = 3.2;
    gm1.phase = 0;

    // Desynchronized moving gate 2
    const gm2 = createFlightGate(0.0, 2.2, -16.5, 0, 1.35);
    gm2.speed = 0.95;
    gm2.amplitude = 3.6;
    gm2.phase = Math.PI; // Opposite phase

    setMovingGate([gm1, gm2]);

    const g4 = createFlightGate(0.0, 1.4, -22.5, 0, 1.25);
    setLevelGates([g1, gm1, gm2, g4]);

    const pad = createLandingPad(0.0, -27.0, 0x00e5ff);
    setLevelLandingPad(pad);

    setMissions([
      { title: "ALINEACIÓN 1/5", desc: "Supera la Compuerta 1 de entrada", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
      { title: "CINÉTICA 2/5", desc: "Intercepta la Compuerta Móvil Alfa a 1.3m", target: gm1.center, check: () => checkGatePass(gm1, 0.55), onComplete: () => gm1.setSuccess(), hint: "Calcula el punto de cruce cuando la compuerta se aproxima al centro de tu eje." },
      { title: "CINÉTICA 3/5", desc: "Eleva cota a 2.2m e intercepta la Compuerta Móvil Bravo", target: gm2.center, check: () => checkGatePass(gm2, 0.55), onComplete: () => gm2.setSuccess(), hint: "Observa la oscilación desfasada: acelera o frena ligeramente para encajar el hueco." },
      { title: "SALIDA 4/5", desc: "Supera la Compuerta 4 estática", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
      { title: "META 5/5", desc: "Aterriza en el helipuerto azul", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
