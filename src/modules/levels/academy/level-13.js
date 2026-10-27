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
    name: "NIVEL 13",
    subtitle: "Laberinto de Precisión",
    desc: "Vuelo en espacio confinado con aros estrechos. El punto de control intermedio guarda tu avance en caso de rozar una pared.",
    isIndoor: true,
    objectives: [
      "Cruza los Aros estrechos 1 y 2",
      "Activa el checkpoint de seguridad intermedio",
      "Cruza los Aros 3 y 4",
      "Aterriza en la zona verde de precisión"
    ],
    medalTimes: { gold: 34, silver: 48, bronze: 68 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.2, -4.5, 0, 1.05);
      const g2 = createFlightGate(-2.5, 1.3, -8.5, Math.PI / 7, 1.05);
      const cp = createSoftCheckpoint(0.0, 1.3, -12.5, 0, 1.1);
      const g3 = createFlightGate( 2.5, 1.3, -16.5, -Math.PI / 7, 1.05);
      const g4 = createFlightGate( 0.0, 1.2, -21.0, 0, 1.05);
      setLevelGates([g1, g2, g3, g4]);
      setSoftCheckpoints([cp]);

      const pad = createLandingPad(0, -25.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "LABERINTO 1 / 5", desc: "Aro estrecho 1 de entrada", target: g1.center, check: () => checkGatePass(g1, 0.4), onComplete: () => g1.setSuccess() },
        { title: "LABERINTO 2 / 5", desc: "Aro estrecho 2 en curva izquierda", target: g2.center, check: () => checkGatePass(g2, 0.4), onComplete: () => g2.setSuccess() },
        { title: "CHECKPOINT", desc: "Pasa por el anillo azul para guardar punto de reaparición", target: cp.center, check: () => cp.check(), onComplete: () => cp.setActivated(), hint: "Si colisionas más adelante, reaparecerás en este punto." },
        { title: "LABERINTO 3 / 5", desc: "Aro estrecho 3 en curva derecha", target: g3.center, check: () => checkGatePass(g3, 0.4), onComplete: () => g3.setSuccess() },
        { title: "LABERINTO 4 / 5", desc: "Aro 4 de salida y alineación", target: g4.center, check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
        { title: "LABERINTO 5 / 5", desc: "Aterriza en la plataforma verde", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
