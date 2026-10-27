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
    name: "NIVEL 12",
    subtitle: "Atrio Vertical: Cambio de Planta",
    desc: "Asciende con precisión a un altillo superior a 2.8m, cruza la plataforma elevada y desciende sin generar turbulencia.",
    isIndoor: true,
    objectives: [
      "Cruza el Aro 1 inferior",
      "Asciende por el hueco del altillo y cruza el Aro 2 (2.8m)",
      "Avanza por la pasarela superior",
      "Desciende controladamente y aterriza en la planta baja"
    ],
    medalTimes: { gold: 28, silver: 40, bronze: 58 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.2, -4.5, 0, 1.2);
      const g2 = createFlightGate( 0.0, 2.7, -9.0, 0, 1.2);
      const g3 = createFlightGate( 2.2, 2.7, -13.5, -Math.PI / 8, 1.15);
      const g4 = createFlightGate( 0.0, 1.3, -18.0, 0, 1.2);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -22.5, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "ATRIO 1 / 5", desc: "Aro 1 a baja altura", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "ATRIO 2 / 5", desc: "Sube con acelerador firme al Aro 2 superior (2.7m)", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Asegúrate de no chocar con las cerchas del techo." },
        { title: "ATRIO 3 / 5", desc: "Aro 3 en el altillo superior", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "ATRIO 4 / 5", desc: "Desciende despacio hacia el Aro 4 inferior", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess(), hint: "Desciende suave; una caída rápida genera turbulencia de propelas (propwash)." },
        { title: "ATRIO 5 / 5", desc: "Aterriza en el helipuerto azul de la planta baja", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
