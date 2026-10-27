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
    name: "NIVEL 10",
    subtitle: "Entrada al Hangar",
    desc: "Primer vuelo en espacio cerrado. Controla el efecto suelo cerca del piso y respeta la altura máxima del techo.",
    isIndoor: true,
    objectives: [
      "Cruza el Aro 1 de aproximación exterior",
      "Pasa la compuerta de acceso baja a 1.2 m sin tocar el marco",
      "Estabiliza dentro de la nave y aterriza en el helipuerto interior"
    ],
    medalTimes: { gold: 20, silver: 30, bronze: 44 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.3, -3.5, 0, 1.3);
      const gDoor = createFlightGate(0.0, 1.2, -8.0, 0, 1.1);
      const g2 = createFlightGate(0.0, 1.4, -13.0, 0, 1.3);
      setLevelGates([g1, gDoor, g2]);

      const pad = createLandingPad(0, -17.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "ENTRADA 1 / 4", desc: "Alinea la trayectoria con el Aro 1", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "ENTRADA 2 / 4", desc: "Cruza la compuerta estrecha (cuidado con el techo)", target: gDoor.center, check: () => checkGatePass(gDoor, 0.4), onComplete: () => gDoor.setSuccess(), hint: "Mantén el acelerador estable a media altura para no golpear el dintel." },
        { title: "ENTRADA 3 / 4", desc: "Avanza por el pasillo central del hangar", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "ENTRADA 4 / 4", desc: "Aterriza en el helipuerto interior verde", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
