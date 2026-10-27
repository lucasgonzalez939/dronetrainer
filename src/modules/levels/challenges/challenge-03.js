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
    name: "DESAFÍO 3",
    subtitle: "El Túnel a Ciegas",
    desc: "Vuelo interior con suelo completamente reflectante. Cero frenado automático: control manual absoluto.",
    objectives: [
      "Suelo reflectante continuo: VPS desactivado (inercia total)",
      "Frena y contrarresta derrapes manualmente para cruzar los 4 aros",
      "Aterriza suavemente en la plataforma naranja"
    ],
    isIndoor: true,
    isChallenge: true,
    medalTimes: { gold: 30, silver: 44, bronze: 62 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false }, // slick zone covers everything
    setup() {
      setLevelSlickZones([createSlickZone(0, -15, 12, 30)]);

      const g1 = createFlightGate( 0.0, 1.3, -4.5, 0, 1.2);
      const g2 = createFlightGate(-2.2, 1.3, -9.5, Math.PI / 8, 1.15);
      const g3 = createFlightGate( 2.2, 1.3, -15.5, -Math.PI / 8, 1.15);
      const g4 = createFlightGate( 0.0, 1.3, -21.0, 0, 1.2);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -26.0, 0xff7043);
      setLevelLandingPad(pad);

      setMissions([
        { title: "MANUAL 1/5", desc: "Cruza el Aro 1 — siente la inercia total", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "MANUAL 2/5", desc: "Aro 2 a la izquierda — frena activamente con stick opuesto", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "MANUAL 3/5", desc: "Aro 3 a la derecha — controla el deslizamiento", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "MANUAL 4/5", desc: "Aro 4 de salida", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "MANUAL 5/5", desc: "Aterriza en la plataforma naranja sin rebotar", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
