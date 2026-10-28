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
  name: "NIVEL 19",
  subtitle: "Orientación Inversa (Nose-In)",
  desc: "Aprende a volar con el dron orientado hacia ti (Yaw 180°). En esta posición, el stick derecho responde de forma invertida en tu campo visual.",
  objectives: [
    "Vuela hacia el pilón de retorno y realiza un viraje completo de 180°",
    "Alinea el dron mirando hacia el piloto y supera los 3 aros de regreso",
    "Aterriza de frente en el helipuerto verde con mandos invertidos"
  ],
  medalTimes: { gold: 22, silver: 32, bronze: 46 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    const gOut = createFlightGate(0.0, 1.3, -7.0, 0, 1.35);
    const pylon = createInspectionTower(0.0, -15.0);
    const wpTurn = createWaypoint(0.0, 1.5, -15.0, 0xff9800);

    const gBack1 = createFlightGate( 2.2, 1.3, -10.5, 0, 1.25);
    const gBack2 = createFlightGate(-2.2, 1.3, -5.5,  0, 1.25);
    const gBack3 = createFlightGate( 0.0, 1.2, -2.2,  0, 1.25);
    setLevelGates([gOut, gBack1, gBack2, gBack3]);

    const pad = createLandingPad(0.0, 0.5, 0x00e676);
    setLevelLandingPad(pad);

    setMissions([
      { title: "SALIDA 1/6", desc: "Avanza y supera el Aro de salida", target: gOut.center, check: () => checkGatePass(gOut, 0.45), onComplete: () => gOut.setSuccess() },
      { title: "RETORNO 2/6", desc: "Rodea el pilón y gira 180° mirando hacia el punto de despegue", target: wpTurn.center, check: () => wpTurn.check(), onComplete: () => wpTurn.setSuccess(), hint: "Gira la guiñada (Yaw) para orientar el morro hacia ti. Recuerda: stick derecho hacia la izquierda moverá el dron a tu derecha." },
      { title: "NOSE-IN 3/6", desc: "Aro de retorno 1: stick derecho corregido", target: gBack1.center, check: () => checkGatePass(gBack1, 0.45), onComplete: () => gBack1.setSuccess() },
      { title: "NOSE-IN 4/6", desc: "Aro de retorno 2: controla la inclinación invertida", target: gBack2.center, check: () => checkGatePass(gBack2, 0.45), onComplete: () => gBack2.setSuccess() },
      { title: "NOSE-IN 5/6", desc: "Aro final de aproximación", target: gBack3.center, check: () => checkGatePass(gBack3, 0.45), onComplete: () => gBack3.setSuccess() },
      { title: "ATERRIZAJE 6/6", desc: "Aterriza de frente en el helipuerto verde", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
