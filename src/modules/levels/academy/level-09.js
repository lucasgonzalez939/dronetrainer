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
    name: "NIVEL 9",
    subtitle: "Órbita de Inspección 360°",
    desc: "Aprende a orbitar un Punto de Interés (POI) manteniendo siempre el morro y la cámara apuntando hacia la torre central.",
    objectives: [
      "Avanza al punto de inicio de la órbita",
      "Orbita los 4 cuadrantes manteniendo la torre centrada en cámara",
      "Sal de la órbita y aterriza con precisión"
    ],
    medalTimes: { gold: 34, silver: 48, bronze: 68 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      createInspectionTower(0, -11.0, 5.0);

      const r = 3.6;
      const cz = -11.0;
      const w1 = createWaypoint( 0.0, 1.4, cz + r, 0x00e5ff, 0.5); // South of tower
      const w2 = createWaypoint(   r, 1.4, cz,     0x00e5ff, 0.5); // East
      const w3 = createWaypoint( 0.0, 1.4, cz - r, 0x00e5ff, 0.5); // North
      const w4 = createWaypoint(  -r, 1.4, cz,     0x00e5ff, 0.5); // West

      const pad = createLandingPad(0, -18.5, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        { title: "ÓRBITA 1 / 5", desc: "Avanza al punto Sur de la torre", target: w1.center, check: () => w1.check(), onComplete: () => w1.setSuccess() },
        { title: "ÓRBITA 2 / 5", desc: "Orbita hacia el Este manteniendo la torre en el centro", target: w2.center, check: () => w2.check(), onComplete: () => w2.setSuccess(), hint: "Aplica Roll a la derecha y rota Yaw suavemente a la izquierda hacia la torre." },
        { title: "ÓRBITA 3 / 5", desc: "Continúa la órbita hacia el punto Norte", target: w3.center, check: () => w3.check(), onComplete: () => w3.setSuccess() },
        { title: "ÓRBITA 4 / 5", desc: "Completa el giro en el punto Oeste", target: w4.center, check: () => w4.check(), onComplete: () => w4.setSuccess() },
        { title: "ÓRBITA 5 / 5", desc: "Sal de la órbita y aterriza en el helipuerto amarillo", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
