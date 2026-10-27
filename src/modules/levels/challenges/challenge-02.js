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
    name: "DESAFÍO 2",
    subtitle: "Rescate en Tormenta",
    desc: "Viento violento y racheado con turbulencia severa. Encuentra y sobrevuela a los supervivientes.",
    objectives: [
      "Viento lateral severo (3.5x) y turbulencia racheada",
      "Localiza y sobrevuela a los 4 supervivientes",
      "Aterriza en la zona de rescate roja"
    ],
    isChallenge: true,
    medalTimes: { gold: 38, silver: 52, bronze: 75 },
    windScale: 3.5,
    windDir: new THREE.Vector3(0.9, 0, 0.3),
    hazards: { vpsOn: true, windOn: true, windStrength: 3.5, turbOn: true, turbStrength: 2.2 },
    setup() {
      const w1 = createWaypoint( 3.5, 1.3, -6.0,  0x00e676);
      const w2 = createWaypoint(-3.8, 1.5, -12.0, 0x00e676);
      const w3 = createWaypoint( 2.8, 1.2, -18.0, 0x00e676);
      const w4 = createWaypoint(-2.0, 1.4, -24.0, 0x00e676);

      const pad = createLandingPad(0, -29.0, 0xef5350);
      setLevelLandingPad(pad);

      setMissions([
        { title: "TORMENTA 1/5", desc: "Superviviente 1 a sotavento", target: w1.center, check: () => w1.check(), onComplete: () => w1.setSuccess() },
        { title: "TORMENTA 2/5", desc: "Superviviente 2 — contrarresta la turbulencia", target: w2.center, check: () => w2.check(), onComplete: () => w2.setSuccess(), hint: "La turbulencia sacude el dron: haz correcciones rápidas y constantes." },
        { title: "TORMENTA 3/5", desc: "Superviviente 3 en zona profunda", target: w3.center, check: () => w3.check(), onComplete: () => w3.setSuccess() },
        { title: "TORMENTA 4/5", desc: "Superviviente 4 — mantén el control", target: w4.center, check: () => w4.check(), onComplete: () => w4.setSuccess() },
        { title: "TORMENTA 5/5", desc: "Aterriza en la zona de rescate roja", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
