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
  createGhostDrone, checkGatePass
} from '../common.js';

export const level = {
  name: "NIVEL 20",
  subtitle: "La Espiral Helicoidal (Ascenso en Tornillo 3D)",
  desc: "Coordina elevación, traslación circular y giro de guiñada (Yaw) continuos para ascender en espiral alrededor de una torre central.",
  objectives: [
    "Aproxima a la torre central manteniendo una órbita circular",
    "Supera los 5 aros ascendentes coordinando acelerador y guiñada simultánea",
    "Asciende hasta la cima (4.5m) y desciende suavemente al helipuerto verde"
  ],
  medalTimes: { gold: 26, silver: 38, bronze: 55 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    const tower = createInspectionTower(0.0, -14.0);

    // 5 spiral gates around the tower at radius ~4.2m
    const centerX = 0.0, centerZ = -14.0, radius = 4.0;
    const angles = [
      Math.PI / 2,        // (4.0, -14.0)
      Math.PI / 6,        // ~30 deg
      -Math.PI / 4,       // ~-45 deg
      -3 * Math.PI / 4,   // ~-135 deg
      Math.PI             // (-4.0, -14.0)
    ];
    const heights = [1.2, 1.8, 2.6, 3.4, 4.2];

    const gates = [];
    angles.forEach((ang, i) => {
      const gx = centerX + Math.cos(ang) * radius;
      const gz = centerZ + Math.sin(ang) * radius;
      // Tangent rotation for gate facing
      const rotY = -(ang + Math.PI / 2);
      const gate = createFlightGate(gx, heights[i], gz, rotY, 1.3);
      gates.push(gate);
    });
    setLevelGates(gates);

    const pad = createLandingPad(0.0, -7.0, 0x00e676);
    setLevelLandingPad(pad);

    setMissions([
      { title: "ASCENSO 1/6", desc: "Aro 1: Inicia la órbita baja a 1.2m", target: gates[0].center, check: () => checkGatePass(gates[0], 0.45), onComplete: () => gates[0].setSuccess(), hint: "Combina suavemente el timón (Yaw) hacia el centro mientras avanzas y elevas throttle." },
      { title: "ASCENSO 2/6", desc: "Aro 2: Sube a 1.8m manteniendo la curva", target: gates[1].center, check: () => checkGatePass(gates[1], 0.45), onComplete: () => gates[1].setSuccess() },
      { title: "ASCENSO 3/6", desc: "Aro 3: Eleva a 2.6m coordinando giro constante", target: gates[2].center, check: () => checkGatePass(gates[2], 0.45), onComplete: () => gates[2].setSuccess() },
      { title: "ASCENSO 4/6", desc: "Aro 4: Nivel alto a 3.4m", target: gates[3].center, check: () => checkGatePass(gates[3], 0.45), onComplete: () => gates[3].setSuccess() },
      { title: "CÚSPIDE 5/6", desc: "Aro 5: Cima de la espiral a 4.2m", target: gates[4].center, check: () => checkGatePass(gates[4], 0.45), onComplete: () => gates[4].setSuccess() },
      { title: "DESCENSO 6/6", desc: "Desciende de forma controlada y aterriza en el helipuerto", target: pad.center, check: () => false, hint: "Reduce acelerador con suavidad para evitar vórtices de aire en descenso." }
    ]);
  }
};

export default level;
