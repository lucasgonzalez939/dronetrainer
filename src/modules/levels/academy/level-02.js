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
    name: "NIVEL 2",
    subtitle: "Avance y Retroceso Lineal",
    desc: "Domina el eje longitudinal (Pitch). Aprende a acelerar hacia adelante, detenerte en estacionario y frenar marcha atrás.",
    objectives: [
      "Avanza en línea recta atravesando los Aros 1, 2 y 3 manteniendo 1.4m",
      "Detente en el punto de espera",
      "Regresa marcha atrás y aterriza en el helipuerto de origen"
    ],
    medalTimes: { gold: 24, silver: 35, bronze: 50 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0, 1.4, -4.0,  0, 1.3);
      const g2 = createFlightGate(0, 1.4, -9.0,  0, 1.3);
      const g3 = createFlightGate(0, 1.4, -14.0, 0, 1.3);
      setLevelGates([g1, g2, g3]);

      const wTurn = createWaypoint(0, 1.4, -17.5, 0x00e5ff, 0.5);
      const pad = createLandingPad(0, 0, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 5",
          desc: "Avanza hacia adelante a través del Aro 1",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "MISIÓN 2 / 5",
          desc: "Mantén velocidad constante y cruza el Aro 2",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess()
        },
        {
          title: "MISIÓN 3 / 5",
          desc: "Cruza el Aro 3 final",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess()
        },
        {
          title: "MISIÓN 4 / 5",
          desc: "Frena y toca el punto de espera para iniciar retorno",
          target: wTurn.center,
          check: () => wTurn.check(),
          onComplete: () => wTurn.setSuccess(),
          hint: "Tira suavemente de la palanca derecha hacia ti para frenar el avance."
        },
        {
          title: "MISIÓN 5 / 5",
          desc: "Regresa marcha atrás y aterriza en el helipuerto de salida",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  };

export default level;
