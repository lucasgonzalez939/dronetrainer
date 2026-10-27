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
    name: "DESAFÍO 5",
    subtitle: "Doble Aro Móvil",
    desc: "Dos aros en movimiento armónico continuo a diferentes velocidades y alturas. Prueba tu sincronización.",
    objectives: [
      "Calcula la sincronización con dos aros móviles a diferente altura",
      "Cruza el aro oscilante bajo y el aro oscilante alto",
      "Aterriza en el helipuerto azul"
    ],
    isChallenge: true,
    medalTimes: { gold: 30, silver: 44, bronze: 62 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.3, -4.5, 0, 1.3);

      const gm1 = createFlightGate(0.0, 1.3, -10.5, 0, 1.35);
      gm1.speed = 1.1;
      gm1.amplitude = 3.0;
      gm1.phase = 0;

      const gm2 = createFlightGate(0.0, 2.2, -17.0, 0, 1.35);
      gm2.speed = 0.65;
      gm2.amplitude = 3.8;
      gm2.phase = Math.PI / 2;

      setMovingGate([gm1, gm2]);

      const g4 = createFlightGate(0.0, 1.4, -22.5, 0, 1.25);
      setLevelGates([g1, gm1, gm2, g4]);

      const pad = createLandingPad(0, -27.0, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "MÓVIL 1/5", desc: "Aro 1 de alineación", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "MÓVIL 2/5", desc: "Aro Móvil Rápido (1.3m) — oscilación baja", target: gm1.center, check: () => checkGatePass(gm1, 0.55), onComplete: () => gm1.setSuccess() },
        { title: "MÓVIL 3/5", desc: "Aro Móvil Amplio (2.2m) — sube e intercepta", target: gm2.center, check: () => checkGatePass(gm2, 0.55), onComplete: () => gm2.setSuccess() },
        { title: "MÓVIL 4/5", desc: "Aro 4 estático de salida", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "MÓVIL 5/5", desc: "Aterriza en el helipuerto azul", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
