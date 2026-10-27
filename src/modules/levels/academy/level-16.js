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
    name: "NIVEL 16",
    subtitle: "Gestión Crítica de Batería",
    desc: "Misión de rescate con batería limitada (75 segundos). Localiza 4 puntos de víctimas optimizando la ruta sin perder tiempo.",
    objectives: [
      "Localiza a los 4 supervivientes en la zona de escombros",
      "Vuela de forma eficiente: frenar y acelerar bruscamente agota el tiempo",
      "Aterriza en la zona de evacuación antes de que se agote la batería"
    ],
    medalTimes: { gold: 38, silver: 52, bronze: 70 },
    windScale: 1.0,
    windDir: new THREE.Vector3(0.3, 0, 0.1),
    hazards: { batteryOn: true, batteryTime: 75, windOn: true, windStrength: 1.0, vpsOn: true },
    setup() {
      const w1 = createWaypoint(-2.5, 1.2, -5.0,  0x00e676);
      const w2 = createWaypoint( 3.2, 1.4, -10.0, 0x00e676);
      const w3 = createWaypoint(-3.0, 1.1, -15.5, 0x00e676);
      const w4 = createWaypoint( 1.5, 1.5, -21.0, 0x00e676);

      createGhostDrone(1.2, 1.4, -7.0);
      createGhostDrone(-2.8, 1.0, -13.0);

      const pad = createLandingPad(0, -26.0, 0xef5350);
      setLevelLandingPad(pad);

      setMissions([
        { title: "RESCATE 1 / 5", desc: "Sobrevuela el superviviente 1 a la izquierda", target: w1.center, check: () => w1.check(), onComplete: () => w1.setSuccess(), hint: "Pasa a menos de 0.4m del marcador verde." },
        { title: "RESCATE 2 / 5", desc: "Punto 2 a la derecha — traza una trayectoria directa", target: w2.center, check: () => w2.check(), onComplete: () => w2.setSuccess() },
        { title: "RESCATE 3 / 5", desc: "Punto 3 — vuela bajo entre los escombros", target: w3.center, check: () => w3.check(), onComplete: () => w3.setSuccess() },
        { title: "RESCATE 4 / 5", desc: "Último superviviente — ¡cuida el nivel de batería!", target: w4.center, check: () => w4.check(), onComplete: () => w4.setSuccess() },
        { title: "RESCATE 5 / 5", desc: "¡Aterriza en la zona de evacuación roja!", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
