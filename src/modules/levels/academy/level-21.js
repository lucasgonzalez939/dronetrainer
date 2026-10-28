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
  name: "NIVEL 21",
  subtitle: "Inspección de Fachada (Vuelo Lateral a Distancia Fija)",
  desc: "Aprende la técnica profesional de escaneo lateral (strafe). Mantén el rumbo hacia la fachada mientras te desplazas horizontalmente a 1.8m de altura.",
  objectives: [
    "Aproxima al sensor 1 manteniendo 2 metros de distancia con la pared",
    "Realiza un barrido lateral continuo por los 4 puntos de escaneo usando Roll",
    "Aterriza en el helipuerto de fin de inspección"
  ],
  medalTimes: { gold: 24, silver: 34, bronze: 48 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  isIndoor: true,
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Inspection wall constructed with stacked crates/panels
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const wallGeo = new THREE.BoxGeometry(16, 4, 0.4);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 2, -10);
    scene.add(wall);
    levelObjects.push(wall);
    obstacles.push(wall);

    // Hazard markers along wall
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffb300, wireframe: true });
    const lineGeo = new THREE.BoxGeometry(16.1, 0.2, 0.45);
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.position.set(0, 1.8, -10);
    scene.add(lineMesh);
    levelObjects.push(lineMesh);

    // 4 inspection waypoints along the wall at z = -8 (2m from wall) and y = 1.8m
    const wp1 = createWaypoint(-6.0, 1.8, -8.0, 0x00e5ff);
    const wp2 = createWaypoint(-2.0, 1.8, -8.0, 0x00e5ff);
    const wp3 = createWaypoint( 2.0, 1.8, -8.0, 0x00e5ff);
    const wp4 = createWaypoint( 6.0, 1.8, -8.0, 0x00e5ff);

    const pad = createLandingPad(6.0, -5.0, 0x00e676);
    setLevelLandingPad(pad);

    setMissions([
      { title: "BARRIDO 1/5", desc: "Aproxima al Sensor Alfa a 1.8m de altura", target: wp1.center, check: () => wp1.check(), onComplete: () => wp1.setSuccess(), hint: "Mantén el morro del dron apuntando a la pared (Yaw 0) y usa el stick de balanceo lateral (Roll)." },
      { title: "BARRIDO 2/5", desc: "Desplázate a la derecha hasta el Sensor Bravo", target: wp2.center, check: () => wp2.check(), onComplete: () => wp2.setSuccess(), hint: "Mantén la altura constante a 1.8m mientras avanzas lateralmente." },
      { title: "BARRIDO 3/5", desc: "Continúa el barrido hacia el Sensor Charlie", target: wp3.center, check: () => wp3.check(), onComplete: () => wp3.setSuccess() },
      { title: "BARRIDO 4/5", desc: "Completa el escaneo en el Sensor Delta", target: wp4.center, check: () => wp4.check(), onComplete: () => wp4.setSuccess() },
      { title: "RECOGIDA 5/5", desc: "Aterriza en el helipuerto de la estación", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
