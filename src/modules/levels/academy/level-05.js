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
    name: "NIVEL 5",
    subtitle: "La Caja Translacional",
    desc: "Vuela el perímetro de un cuadrado manteniendo siempre el morro mirando al frente (Norte).",
    objectives: [
      "Vértice 1: Avanza 5 metros al frente",
      "Vértice 2: Desplázate a la derecha 4 metros",
      "Vértice 3: Retrocede 5 metros",
      "Vértice 4: Desplázate a la izquierda y aterriza"
    ],
    medalTimes: { gold: 30, silver: 45, bronze: 65 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.4, -5.5, 0, 1.3);
      const g2 = createFlightGate(4.2, 1.4, -5.5, Math.PI / 2, 1.3);
      const g3 = createFlightGate(4.2, 1.4, -1.2, 0, 1.3);
      setLevelGates([g1, g2, g3]);

      const pad = createLandingPad(0, -1.2, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "ESQUINA 1 / 4",
          desc: "Avanza recto al frente a través del Aro 1",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "ESQUINA 2 / 4",
          desc: "Desplázate a la derecha a través del Aro 2 (sin girar Yaw)",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess(),
          hint: "Mantén el morro apuntando al Norte en todo momento."
        },
        {
          title: "ESQUINA 3 / 4",
          desc: "Retrocede hacia el Aro 3",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess()
        },
        {
          title: "ESQUINA 4 / 4",
          desc: "Desplázate a la izquierda y aterriza en el helipuerto",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  };

export default level;
