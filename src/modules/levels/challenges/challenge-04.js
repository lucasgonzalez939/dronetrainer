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
    name: "DESAFÍO 4",
    subtitle: "Batería Extrema (35s)",
    desc: "Solo 35 segundos de energía para completar un circuito de 5 aros a gran altitud. Cero vacilaciones.",
    objectives: [
      "Batería ultra-limitada: solo 35 segundos de vuelo",
      "Cruza 5 aros a gran altitud sin vacilaciones",
      "Aterriza antes de que se agote la energía"
    ],
    isChallenge: true,
    medalTimes: { gold: 22, silver: 28, bronze: 34 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { batteryOn: true, batteryTime: 35, vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.8, -4.5, 0, 1.3);
      const g2 = createFlightGate( 2.8, 2.3, -9.5, Math.PI / 8, 1.25);
      const g3 = createFlightGate(-2.8, 2.5, -15.0, -Math.PI / 8, 1.25);
      const g4 = createFlightGate( 2.0, 2.0, -20.5, Math.PI / 8, 1.25);
      const g5 = createFlightGate( 0.0, 1.4, -25.5, 0, 1.3);
      setLevelGates([g1, g2, g3, g4, g5]);

      const pad = createLandingPad(0, -29.5, 0xef5350);
      setLevelLandingPad(pad);

      setMissions([
        { title: "35s (1/6)", desc: "¡Despega rápido hacia el Aro 1!", target: g1.center, check: () => checkGatePass(g1, 0.5), onComplete: () => g1.setSuccess() },
        { title: "35s (2/6)", desc: "Aro 2 a 2.3m — mantén acelerador constante", target: g2.center, check: () => checkGatePass(g2, 0.5), onComplete: () => g2.setSuccess() },
        { title: "35s (3/6)", desc: "Aro 3 en altitud máxima", target: g3.center, check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess() },
        { title: "35s (4/6)", desc: "Aro 4 — inicia descenso suave", target: g4.center, check: () => checkGatePass(g4, 0.5), onComplete: () => g4.setSuccess() },
        { title: "35s (5/6)", desc: "Aro 5 de aproximación final", target: g5.center, check: () => checkGatePass(g5, 0.5), onComplete: () => g5.setSuccess() },
        { title: "35s (6/6)", desc: "¡Aterriza antes de que la batería llegue a cero!", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
