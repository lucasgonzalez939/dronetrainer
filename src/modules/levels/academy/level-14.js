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
    name: "NIVEL 14",
    subtitle: "Viento Cruzado y Deriva",
    desc: "Viento lateral constante. Aprende a orientar la nariz contra el viento (ángulo de cangrejo) para mantener la trayectoria recta.",
    objectives: [
      "Navega en línea recta a pesar del empuje del viento lateral",
      "Cruza los Aros 1, 2 y 3 alineados",
      "Compensa la deriva durante la aproximación final y aterriza"
    ],
    medalTimes: { gold: 25, silver: 36, bronze: 52 },
    windScale: 2.2,
    windDir: new THREE.Vector3(0.85, 0, 0.15),
    hazards: { vpsOn: true, windOn: true, windStrength: 2.2 },
    setup() {
      const g1 = createFlightGate(0.0, 1.3, -4.5, 0, 1.25);
      const g2 = createFlightGate(0.0, 1.4, -9.5, 0, 1.2);
      const g3 = createFlightGate(0.0, 1.4, -14.5, 0, 1.2);
      const g4 = createFlightGate(0.0, 1.3, -19.5, 0, 1.2);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -24.0, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        { title: "DERIVA 1 / 5", desc: "Aro 1 — siente el empuje del viento lateral", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "DERIVA 2 / 5", desc: "Aro 2 — inclina el Roll ligeramente contra el viento", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Apunta la nariz levemente hacia el origen del viento para contrarrestar el arrastre." },
        { title: "DERIVA 3 / 5", desc: "Aro 3 — mantén la línea recta", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "DERIVA 4 / 5", desc: "Aro 4 — prepárate para aterrizar", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "DERIVA 5 / 5", desc: "Aterriza en el helipuerto amarillo compensando la deriva", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
