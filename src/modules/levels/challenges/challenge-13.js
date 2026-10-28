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
  name: "DESAFÍO 13",
  subtitle: "Batería Ultracrítica (Sprint 25s)",
  desc: "Crono mortal: solo 25 segundos totales de batería para superar 4 aros a velocidad máxima y tocar tierra.",
  objectives: [
    "Reserva energética mínima: exactamente 25 segundos",
    "Aceleración a fondo sin titubeos por 4 aros rápidos",
    "Aterrizaje forzoso en el helipuerto rojo antes del corte de energía"
  ],
  isChallenge: true,
  medalTimes: { gold: 16, silver: 20, bronze: 24 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  hazards: { batteryOn: true, batteryTime: 25, vpsOn: true, windOn: false },
  setup() {
    const g1 = createFlightGate( 0.0, 1.4, -4.5, 0, 1.35);
    const g2 = createFlightGate( 1.8, 1.8, -10.0, Math.PI / 10, 1.3);
    const g3 = createFlightGate(-1.8, 1.9, -15.5, -Math.PI / 10, 1.3);
    const g4 = createFlightGate( 0.0, 1.3, -20.5, 0, 1.35);
    setLevelGates([g1, g2, g3, g4]);

    const pad = createLandingPad(0.0, -24.5, 0xff1744);
    setLevelLandingPad(pad);

    setMissions([
      { title: "25s (1/5)", desc: "¡Acelera de inmediato al Aro 1!", target: g1.center, check: () => checkGatePass(g1, 0.5), onComplete: () => g1.setSuccess() },
      { title: "25s (2/5)", desc: "Aro 2 a la derecha — curva a fondo", target: g2.center, check: () => checkGatePass(g2, 0.5), onComplete: () => g2.setSuccess() },
      { title: "25s (3/5)", desc: "Aro 3 a la izquierda — mantén impulso", target: g3.center, check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess() },
      { title: "25s (4/5)", desc: "Aro 4 de entrada a helipuerto", target: g4.center, check: () => checkGatePass(g4, 0.5), onComplete: () => g4.setSuccess() },
      { title: "25s (5/5)", desc: "¡Corta gas y aterriza antes de 0%!", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
