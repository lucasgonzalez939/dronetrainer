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
    name: "NIVEL 17",
    subtitle: "Aro Móvil Dinámico",
    desc: "Un aro se desplaza lateralmente a velocidad armónica continua. Aprende a calcular el punto de intercepción.",
    objectives: [
      "Cruza el Aro 1 de entrada",
      "Calcula la trayectoria del Aro 2 móvil e intercéptalo",
      "Cruza el Aro 3 final y aterriza"
    ],
    medalTimes: { gold: 26, silver: 38, bronze: 56 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.4, -5.0, 0, 1.3);
      const gMove = createFlightGate(0.0, 1.5, -11.0, 0, 1.4);
      gMove.speed = 0.8;
      gMove.amplitude = 3.2;
      setMovingGate(gMove);

      const g3 = createFlightGate(0.0, 1.4, -17.0, 0, 1.25);
      setLevelGates([g1, gMove, g3]);

      const pad = createLandingPad(0, -22.0, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "INTERCEPCIÓN 1 / 4", desc: "Aro 1 estático de aproximación", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "INTERCEPCIÓN 2 / 4", desc: "⚡ ¡El Aro 2 se mueve lateralmente! Intercepta su paso", target: gMove.center, check: () => checkGatePass(gMove, 0.55), onComplete: () => gMove.setSuccess(), hint: "No persigas el aro: apunta al punto donde va a estar en 1 segundo." },
        { title: "INTERCEPCIÓN 3 / 4", desc: "Cruza el Aro 3 de estabilización", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "INTERCEPCIÓN 4 / 4", desc: "Aterriza con suavidad en el helipuerto azul", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
