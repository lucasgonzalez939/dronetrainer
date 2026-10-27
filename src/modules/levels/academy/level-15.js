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
    name: "NIVEL 15",
    subtitle: "Pérdida de VPS: Modo Manual Puro",
    desc: "En las zonas celestes los sensores de flujo óptico fallan. El dron no frena al soltar el stick; debes frenar activamente.",
    objectives: [
      "Cruza el Aro 1 con VPS activo",
      "Entra en la zona celeste (VPS ciego) y frena manualmente antes del Aro 2",
      "Cruza el Aro 3 bajo deriva inercial",
      "Aterriza en el helipuerto rojo con control manual estricto"
    ],
    medalTimes: { gold: 28, silver: 40, bronze: 60 },
    windScale: 1.2,
    windDir: new THREE.Vector3(0.4, 0, 0.2),
    hazards: { vpsOn: true, windOn: true, windStrength: 1.2 },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.0, 0, 1.25);
      const g2 = createFlightGate(-2.5, 1.3, -9.5, Math.PI / 8, 1.2);
      const g3 = createFlightGate( 2.5, 1.3, -15.5, -Math.PI / 8, 1.2);
      setLevelGates([g1, g2, g3]);

      // Extensive slick zone where optical flow is blind
      setLevelSlickZones([createSlickZone(0, -12.5, 8, 14)]);

      const pad = createLandingPad(0, -21.0, 0xff3d00);
      setLevelLandingPad(pad);

      setMissions([
        { title: "VPS 1 / 4", desc: "Aro 1 — vuelo normal con asistencia activa", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "VPS 2 / 4", desc: "Entra a la zona celeste: ¡El dron NO frena solo!", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Tira la palanca en sentido contrario para frenar la inercia manualmente." },
        { title: "VPS 3 / 4", desc: "Cruza hacia el Aro 3 controlando la deriva", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "VPS 4 / 4", desc: "Aterriza con suavidad en el helipuerto rojo", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
