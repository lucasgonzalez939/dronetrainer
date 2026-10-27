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
    name: "NIVEL 7",
    subtitle: "Slalom Continuo",
    desc: "Desarrolla anticipación y fluidez coordinando virajes continuos en 'S' entre 5 aros.",
    objectives: [
      "Cruza el Aro 1 central",
      "Vira a la izquierda al Aro 2",
      "Contravira a la derecha al Aro 3",
      "Curva a la izquierda al Aro 4 y cruza el Aro 5 final"
    ],
    medalTimes: { gold: 25, silver: 36, bronze: 52 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.0,  0,           1.2);
      const g2 = createFlightGate(-2.6, 1.4, -8.5,  Math.PI / 6, 1.2);
      const g3 = createFlightGate( 2.6, 1.4, -13.5, -Math.PI / 6, 1.2);
      const g4 = createFlightGate(-2.2, 1.4, -18.5, Math.PI / 7, 1.2);
      const g5 = createFlightGate( 0.0, 1.3, -23.0, 0,           1.2);
      setLevelGates([g1, g2, g3, g4, g5]);

      const pad = createLandingPad(0, -27.0, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "SLALOM 1 / 6", desc: "Aro 1 central — inicia con velocidad controlada", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "SLALOM 2 / 6", desc: "Aro 2 a la izquierda — coordina Yaw y Roll", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Inicia el viraje antes de rebasar el aro anterior." },
        { title: "SLALOM 3 / 6", desc: "Aro 3 a la derecha — cambio fluido de peso", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "SLALOM 4 / 6", desc: "Aro 4 a la izquierda — mantén altitud constante", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "SLALOM 5 / 6", desc: "Aro 5 final — estabiliza el rumbo", target: g5.center, check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: "SLALOM 6 / 6", desc: "Aterriza con precisión en el helipuerto azul", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
