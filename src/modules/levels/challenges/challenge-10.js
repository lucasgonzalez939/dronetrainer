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
    name: "DESAFÍO 10",
    subtitle: "La Prueba Definitiva (Gauntlet)",
    desc: "El desafío supremo: batería de 80s, viento cruzado, aro móvil y puertas de alta precisión. La prueba de los campeones.",
    objectives: [
      "La prueba definitiva: batería de 80s, viento cruzado y aro móvil",
      "Supera las 4 compuertas de alta precisión",
      "Aterriza en el helipuerto de campeones para graduarte"
    ],
    isChallenge: true,
    medalTimes: { gold: 48, silver: 65, bronze: 80 },
    windScale: 2.0,
    windDir: new THREE.Vector3(0.6, 0, 0.2),
    hazards: { batteryOn: true, batteryTime: 80, windOn: true, windStrength: 2.0, vpsOn: true },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.5, 0, 1.2);
      const g2 = createFlightGate(-3.0, 1.4, -9.5, Math.PI / 7, 1.15);

      const gm = createFlightGate(0.0, 1.5, -15.0, 0, 1.3);
      gm.speed = 0.9;
      gm.amplitude = 3.2;
      setMovingGate(gm);

      const cp = createSoftCheckpoint(0.0, 1.3, -19.5, 0, 1.1);
      const g3 = createFlightGate( 3.0, 1.4, -24.0, -Math.PI / 7, 1.15);
      const g4 = createFlightGate( 0.0, 1.3, -29.0, 0, 1.15);
      setLevelGates([g1, g2, gm, g3, g4]);
      setSoftCheckpoints([cp]);

      setLevelSlickZones([createSlickZone(0, -24.0, 8, 8)]);

      const pad = createLandingPad(0, -34.0, 0xffd700);
      setLevelLandingPad(pad);

      setMissions([
        { title: "GAUNTLET 1/7", desc: "Aro 1 con viento cruzado", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "GAUNTLET 2/7", desc: "Aro 2 a la izquierda — controla el tiempo de batería", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "GAUNTLET 3/7", desc: "⚡ Intercepta el Aro Móvil 3 sin dudar", target: gm.center, check: () => checkGatePass(gm, 0.55), onComplete: () => gm.setSuccess() },
        { title: "CHECKPOINT", desc: "Punto de guardado de emergencia", target: cp.center, check: () => cp.check(), onComplete: () => cp.setActivated() },
        { title: "GAUNTLET 4/7", desc: "Aro 4 sobre zona VPS ciega", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "GAUNTLET 5/7", desc: "Aro 5 de salida", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "GAUNTLET 6/7", desc: "¡Aterriza en el helipuerto dorado antes de 0%!", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
