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
    name: "NIVEL 8",
    subtitle: "La Figura en 8 (El Infinito)",
    desc: "La prueba clásica de evaluación de pilotos: dos bucles de 360° en sentidos opuestos con virajes suaves continuos.",
    objectives: [
      "Pasa el aro central de intersección",
      "Completa el bucle derecho en sentido horario",
      "Cruza nuevamente el aro central",
      "Completa el bucle izquierdo en sentido antihorario y aterriza"
    ],
    medalTimes: { gold: 36, silver: 50, bronze: 70 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const gC1 = createFlightGate(0.0, 1.4, -6.0, 0, 1.3);
      const gR1 = createFlightGate(3.8, 1.4, -9.0, Math.PI / 4, 1.2);
      const gR2 = createFlightGate(3.8, 1.4, -14.0, -Math.PI / 4, 1.2);
      const gC2 = createFlightGate(0.0, 1.4, -17.0, 0, 1.3);
      const gL1 = createFlightGate(-3.8, 1.4, -14.0, Math.PI / 4, 1.2);
      const gL2 = createFlightGate(-3.8, 1.4, -9.0, -Math.PI / 4, 1.2);
      setLevelGates([gC1, gR1, gR2, gC2, gL1, gL2]);

      const pad = createLandingPad(0, -6.0, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "FIGURA 8 (1/7)", desc: "Entrada por el aro central 1", target: gC1.center, check: () => checkGatePass(gC1, 0.45), onComplete: () => gC1.setSuccess() },
        { title: "FIGURA 8 (2/7)", desc: "Inicia el bucle derecho por el Aro 2", target: gR1.center, check: () => checkGatePass(gR1, 0.45), onComplete: () => gR1.setSuccess(), hint: "Coordina Yaw y Roll hacia la derecha simultáneamente." },
        { title: "FIGURA 8 (3/7)", desc: "Cierra la curva derecha por el Aro 3", target: gR2.center, check: () => checkGatePass(gR2, 0.45), onComplete: () => gR2.setSuccess() },
        { title: "FIGURA 8 (4/7)", desc: "Cruce central por el Aro 4", target: gC2.center, check: () => checkGatePass(gC2, 0.45), onComplete: () => gC2.setSuccess() },
        { title: "FIGURA 8 (5/7)", desc: "Inicia el bucle izquierdo por el Aro 5", target: gL1.center, check: () => checkGatePass(gL1, 0.45), onComplete: () => gL1.setSuccess() },
        { title: "FIGURA 8 (6/7)", desc: "Cierra la curva izquierda por el Aro 6", target: gL2.center, check: () => checkGatePass(gL2, 0.45), onComplete: () => gL2.setSuccess() },
        { title: "FIGURA 8 (7/7)", desc: "Aterriza en el helipuerto verde central", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
