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
    name: "NIVEL 3",
    subtitle: "Desplazamiento Lateral",
    desc: "Aprende el movimiento lateral puro (Roll) sin alterar el rumbo del dron.",
    objectives: [
      "Cruza el Aro central 1",
      "Desplázate a la derecha para cruzar el Aro 2 (sin girar el rumbo)",
      "Desplázate a la izquierda para cruzar el Aro 3",
      "Centra el dron y aterriza en la plataforma"
    ],
    medalTimes: { gold: 26, silver: 38, bronze: 55 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -3.5, 0, 1.3);
      const g2 = createFlightGate( 3.2, 1.3, -8.0, 0, 1.3);
      const g3 = createFlightGate(-3.2, 1.3, -12.5, 0, 1.3);
      setLevelGates([g1, g2, g3]);

      const pad = createLandingPad(0, -16.5, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 4",
          desc: "Avanza y cruza el Aro 1",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "MISIÓN 2 / 4",
          desc: "Desplázate a la derecha hacia el Aro 2 (mantén rumbo al norte)",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess(),
          hint: "No gires la palanca de dirección; empuja la palanca derecha lateralmente."
        },
        {
          title: "MISIÓN 3 / 4",
          desc: "Desplázate a la izquierda hacia el Aro 3",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess()
        },
        {
          title: "MISIÓN 4 / 4",
          desc: "Centra el vuelo y aterriza en el helipuerto azul",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  };

export default level;
