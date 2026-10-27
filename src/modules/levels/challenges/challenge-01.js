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
    name: "DESAFÍO 1",
    subtitle: "Carrera Contrarreloj",
    desc: "Circuito de alta velocidad: 7 aros rápidos donde cada décima de segundo cuenta.",
    objectives: [
      "Acelera a fondo y supera los 7 aros del óvalo veloz",
      "Aterriza en la plataforma para detener el cronómetro"
    ],
    isChallenge: true,
    medalTimes: { gold: 20, silver: 27, bronze: 38 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.4, -4.5, 0, 1.35);
      const g2 = createFlightGate( 3.5, 1.4, -8.5, Math.PI / 4, 1.35);
      const g3 = createFlightGate( 3.5, 1.4, -14.5, Math.PI / 4, 1.35);
      const g4 = createFlightGate( 0.0, 1.4, -19.5, 0, 1.35);
      const g5 = createFlightGate(-3.5, 1.4, -14.5, -Math.PI / 4, 1.35);
      const g6 = createFlightGate(-3.5, 1.4, -8.5, -Math.PI / 4, 1.35);
      const g7 = createFlightGate( 0.0, 1.4, -3.5, 0, 1.35);
      setLevelGates([g1, g2, g3, g4, g5, g6, g7]);

      const pad = createLandingPad(0, 0.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "SPEED 1/8", desc: "¡Acelera a fondo hacia el Aro 1!", target: g1.center, check: () => checkGatePass(g1, 0.5), onComplete: () => g1.setSuccess() },
        { title: "SPEED 2/8", desc: "Curva derecha rápida: Aro 2", target: g2.center, check: () => checkGatePass(g2, 0.5), onComplete: () => g2.setSuccess() },
        { title: "SPEED 3/8", desc: "Recta lateral: Aro 3", target: g3.center, check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess() },
        { title: "SPEED 4/8", desc: "Fondo del óvalo: Aro 4", target: g4.center, check: () => checkGatePass(g4, 0.5), onComplete: () => g4.setSuccess() },
        { title: "SPEED 5/8", desc: "Curva izquierda: Aro 5", target: g5.center, check: () => checkGatePass(g5, 0.5), onComplete: () => g5.setSuccess() },
        { title: "SPEED 6/8", desc: "Recta de regreso: Aro 6", target: g6.center, check: () => checkGatePass(g6, 0.5), onComplete: () => g6.setSuccess() },
        { title: "SPEED 7/8", desc: "Último aro antes de meta: Aro 7", target: g7.center, check: () => checkGatePass(g7, 0.5), onComplete: () => g7.setSuccess() },
        { title: "SPEED 8/8", desc: "¡Aterriza de inmediato para detener el cronómetro!", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
