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
    name: "NIVEL 18",
    subtitle: "Examen de Graduación",
    desc: "El circuito maestro de certificación: despegue exterior con viento, slalom, compuerta estrecha de entrada al hangar, órbita interior y aterrizaje de precisión.",
    isIndoor: false,
    objectives: [
      "Supera el tramo exterior compensando el viento cruzado",
      "Pasa la compuerta baja de acceso al hangar",
      "Navega el circuito interior entre columnas",
      "Aterriza con precisión máxima para obtener tu licencia de piloto"
    ],
    medalTimes: { gold: 45, silver: 62, bronze: 85 },
    windScale: 1.6,
    windDir: new THREE.Vector3(0.5, 0, 0.2),
    hazards: { vpsOn: true, windOn: true, windStrength: 1.6 },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.5, 0, 1.2);
      const g2 = createFlightGate(-2.5, 1.4, -9.0, Math.PI / 8, 1.15);
      const g3 = createFlightGate( 2.5, 1.4, -14.0, -Math.PI / 8, 1.15);
      const gGate = createFlightGate(0.0, 1.2, -19.0, 0, 1.05); // Entry gate
      const cp = createSoftCheckpoint(0.0, 1.3, -22.5, 0, 1.1);
      const g4 = createFlightGate(-1.8, 1.3, -26.5, Math.PI / 8, 1.1);
      const g5 = createFlightGate( 0.0, 1.4, -31.0, 0, 1.1);
      setLevelGates([g1, g2, g3, gGate, g4, g5]);
      setSoftCheckpoints([cp]);

      const pad = createLandingPad(0, -35.5, 0xffd700);
      setLevelLandingPad(pad);

      setMissions([
        { title: "GRADUACIÓN 1 / 7", desc: "Aro 1 exterior con viento", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "GRADUACIÓN 2 / 7", desc: "Slalom hacia el Aro 2", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "GRADUACIÓN 3 / 7", desc: "Slalom hacia el Aro 3", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "GRADUACIÓN 4 / 7", desc: "Compuerta angosta de entrada al hangar", target: gGate.center, check: () => checkGatePass(gGate, 0.4), onComplete: () => gGate.setSuccess(), hint: "Alinea bien el morro y reduce la velocidad antes de cruzar la puerta." },
        { title: "CHECKPOINT", desc: "Punto de guardado dentro del hangar", target: cp.center, check: () => cp.check(), onComplete: () => cp.setActivated() },
        { title: "GRADUACIÓN 5 / 7", desc: "Viraje interior hacia el Aro 5", target: g4.center, check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
        { title: "GRADUACIÓN 6 / 7", desc: "Aro 6 de aproximación final", target: g5.center, check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: "GRADUACIÓN 7 / 7", desc: "¡Aterriza en el helipuerto dorado de graduación!", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
