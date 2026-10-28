import {
  THREE, scene, drone,
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
  createGroundVehicle
} from '../common.js';

export const level = {
  name: "MISIÓN 1",
  subtitle: "Persecución Vehicular FPV",
  desc: "Filmación dinámica a alta velocidad: sigue a un vehículo de pruebas en circuito exterior manteniendo el encuadre en FPV durante todo el trazado.",
  objectives: [
    "Despega y sitúate detrás del vehículo deportivo en movimiento",
    "Mantén seguimiento continuo en FPV dentro del rango óptimo (3m a 9m)",
    "Completa las 3 fases de persecución (recta, chicane y aceleración)",
    "Rompe formación y aterriza en el helipuerto de boxes"
  ],
  isOperation: true,
  medalTimes: { gold: 50, silver: 70, bronze: 95 },
  windScale: 0.5,
  windDir: new THREE.Vector3(0.5, 0, 0.2).normalize(),
  hazards: { vpsOn: true, windOn: true },
  setup() {
    // Closed-loop circuit for the car
    const carPath = [
      [ 0.0, -10.0],
      [ 8.0, -18.0],
      [12.0, -30.0],
      [ 6.0, -42.0],
      [-6.0, -42.0],
      [-12.0, -30.0],
      [-8.0, -18.0]
    ];

    const car = createGroundVehicle(carPath, 6.2, 0xffd600);

    // Track gates to guide the pilot along the pursuit route
    const gSprint = createFlightGate(4.0, 1.8, -14.0, -Math.PI / 8, 1.6);
    const gChicane1 = createFlightGate(10.0, 2.0, -25.0, 0, 1.6);
    const gChicane2 = createFlightGate( 0.0, 2.2, -42.0, Math.PI / 2, 1.6);
    const gFinal = createFlightGate(-10.0, 1.8, -25.0, 0, 1.6);
    const gExit = createFlightGate(0.0, 1.5, -6.0, 0, 1.5);

    setLevelGates([gSprint, gChicane1, gChicane2, gFinal, gExit]);

    const pad = createLandingPad(0.0, -2.0, 0x00e676);
    setLevelLandingPad(pad);

    let phase1Timer = 0;
    let phase2Timer = 0;
    let phase3Timer = 0;

    setMissions([
      {
        title: "PERSECUCIÓN 1/8",
        desc: "¡Despega e intercepta el coche amarillo!",
        target: car.center,
        check: () => {
          return drone.pos.distanceTo(car.center) <= 8.5;
        },
        hint: "Acelera hacia el vehículo deportivo. Mantente entre 3m y 8m detrás de él."
      },
      {
        title: "TOMA RECTA 2/8",
        desc: "Mantén seguimiento FPV continuo durante 6 segundos (Tramo Recta)",
        target: car.center,
        check: (dt = 0.02) => {
          if (car.checkTracking(drone, 2.2, 9.0)) {
            phase1Timer += dt;
            return phase1Timer >= 6.0;
          }
          phase1Timer = Math.max(0, phase1Timer - dt * 0.5);
          return false;
        },
        hint: "Ajusta la velocidad para no alejarte a más de 9 metros ni chocar contra el vehículo."
      },
      {
        title: "CURVA 1 3/8",
        desc: "Sigue la trayectoria del coche por la Compuerta 1",
        target: gChicane1.center,
        check: () => checkGatePass(gChicane1, 0.6),
        onComplete: () => gChicane1.setSuccess()
      },
      {
        title: "TOMA CHICANE 4/8",
        desc: "Seguimiento FPV en curva cerrada durante 6 segundos",
        target: car.center,
        check: (dt = 0.02) => {
          if (car.checkTracking(drone, 2.2, 9.5)) {
            phase2Timer += dt;
            return phase2Timer >= 6.0;
          }
          phase2Timer = Math.max(0, phase2Timer - dt * 0.5);
          return false;
        },
        hint: "Usa guiñada (Yaw) para mantener el morro siempre apuntando al coche."
      },
      {
        title: "HORQUILLA 5/8",
        desc: "Cruza la compuerta de la horquilla norte",
        target: gChicane2.center,
        check: () => checkGatePass(gChicane2, 0.6),
        onComplete: () => gChicane2.setSuccess()
      },
      {
        title: "SPRINT FINAL 6/8",
        desc: "Acelera tras el coche durante 7 segundos a fondo",
        target: car.center,
        check: (dt = 0.02) => {
          if (car.checkTracking(drone, 2.2, 9.5)) {
            phase3Timer += dt;
            return phase3Timer >= 7.0;
          }
          phase3Timer = Math.max(0, phase3Timer - dt * 0.5);
          return false;
        },
        hint: "¡A fondo! No dejes que el deportivo se escape en la recta de retorno."
      },
      {
        title: "RUPTURA 7/8",
        desc: "Rompe formación y cruza la compuerta de salida",
        target: gExit.center,
        check: () => checkGatePass(gExit, 0.5),
        onComplete: () => gExit.setSuccess()
      },
      {
        title: "TOMA DE TIERRA 8/8",
        desc: "Aterriza en el helipuerto de boxes",
        target: pad.center,
        check: () => false
      }
    ]);
  }
};

export default level;
