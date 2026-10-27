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
    name: "NIVEL 4",
    subtitle: "Control de Rumbo y Giro",
    desc: "Aprende a rotar sobre el propio eje (Yaw), alinear la brújula y mantener el control al cambiar de perspectiva.",
    objectives: [
      "Alinea rumbo Norte y toca el marcador 1",
      "Gira 90° a la derecha (Este) hacia el marcador 2",
      "Gira 180° hacia el Sur (mirando al piloto) hacia el marcador 3",
      "Aterriza en el helipuerto central"
    ],
    medalTimes: { gold: 28, silver: 40, bronze: 60 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const wN = createWaypoint( 0.0, 1.3, -4.5, 0x00e676, 0.5);
      const wE = createWaypoint( 4.5, 1.3, -4.5, 0x00e5ff, 0.5);
      const wS = createWaypoint( 4.5, 1.3,  0.0, 0xffca28, 0.5);

      const pad = createLandingPad(0, -2.0, 0xff7043);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 4",
          desc: "Avanza hacia el marcador verde al Norte",
          target: wN.center,
          check: () => wN.check(),
          onComplete: () => wN.setSuccess(),
          hint: "Observa la brújula del HUD en la esquina para guiarte."
        },
        {
          title: "MISIÓN 2 / 4",
          desc: "Gira 90° a la derecha (rumbo Este 90°) hacia el marcador azul",
          target: wE.center,
          check: () => wE.check(),
          onComplete: () => wE.setSuccess(),
          hint: "Usa la palanca izquierda (Yaw) para orientar el morro hacia el objetivo."
        },
        {
          title: "MISIÓN 3 / 4",
          desc: "Gira hacia el Sur (180°, mirando hacia ti) hacia el marcador amarillo",
          target: wS.center,
          check: () => wS.check(),
          onComplete: () => wS.setSuccess()
        },
        {
          title: "MISIÓN 4 / 4",
          desc: "Aterriza en la plataforma naranja",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  };

export default level;
