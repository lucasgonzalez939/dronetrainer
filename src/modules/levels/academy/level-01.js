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
    name: "NIVEL 1",
    subtitle: "Altura y Toma de Contacto",
    desc: "Aprende a controlar la altitud vertical (Throttle) y realizar un aterrizaje suave y controlado.",
    objectives: [
      "Despega con suavidad y atraviesa el Aro 1 a 1.2 m de altura",
      "Asciende gradualmente y cruza el Aro 2 a 1.8 m",
      "Desciende despacio y aterriza en el helipuerto verde"
    ],
    medalTimes: { gold: 18, silver: 28, bronze: 42 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0, 1.2, -3.5, 0, 1.5);
      const g2 = createFlightGate(0, 1.8, -7.5, 0, 1.5);
      setLevelGates([g1, g2]);

      const pad = createLandingPad(0, -11.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 3",
          desc: "Despega y atraviesa lentamente el Aro 1 (1.2m)",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess(),
          hint: "Usa pulsaciones cortas de acelerador para estabilizar la altitud."
        },
        {
          title: "MISIÓN 2 / 3",
          desc: "Asciende y cruza el Aro 2 (1.8m)",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess(),
          hint: "Sube poco a poco; no des acelerador a fondo."
        },
        {
          title: "MISIÓN 3 / 3",
          desc: "Desciende con calma y aterriza en el helipuerto verde",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  };

export default level;
