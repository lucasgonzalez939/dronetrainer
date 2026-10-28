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
  createMovingPlatform
} from '../common.js';

export const level = {
  name: "MISIÓN 3",
  subtitle: "Aterrizaje en Plataforma Móvil",
  desc: "Operación aeronaval de alta precisión: un convoy de transporte avanza continuamente por la pista. Debes interceptarlo, igualar su velocidad y posarte sobre el helipuerto en movimiento.",
  objectives: [
    "Despega y da caza al vehículo plataforma en movimiento",
    "Supera las 3 compuertas de aproximación sincronizada",
    "Vuela en formación sobre la plataforma igualando su velocidad de crucero",
    "Aterriza con suavidad sobre el helipuerto móvil sin derrapar"
  ],
  isOperation: true,
  medalTimes: { gold: 38, silver: 52, bronze: 75 },
  windScale: 0.8,
  windDir: new THREE.Vector3(0.5, 0, 0.1).normalize(),
  hazards: { vpsOn: true, windOn: true },
  setup() {
    // Linear runway trajectory with return loop
    const platformPath = [
      [ 0.0, -8.0],
      [ 0.0, -48.0],
      [-5.0, -48.0],
      [-5.0, -8.0]
    ];

    const carrier = createMovingPlatform(platformPath, 3.2, 0x00e676);

    const g1 = createFlightGate(0.0, 1.8, -12.0, 0, 1.6);
    const g2 = createFlightGate(0.0, 1.5, -24.0, 0, 1.5);
    const g3 = createFlightGate(0.0, 1.3, -36.0, 0, 1.5);
    setLevelGates([g1, g2, g3]);

    let formationTimer = 0;

    setMissions([
      {
        title: "INTERCEPCIÓN 1/7",
        desc: "Acelera y cruza la Compuerta 1 de aproximación",
        target: g1.center,
        check: () => checkGatePass(g1, 0.5),
        onComplete: () => g1.setSuccess()
      },
      {
        title: "SINCRONIZACIÓN 2/7",
        desc: "Compuerta 2: Iguala la altura a 1.5m con el convoy",
        target: g2.center,
        check: () => checkGatePass(g2, 0.5),
        onComplete: () => g2.setSuccess()
      },
      {
        title: "FORMACIÓN 3/7",
        desc: "Vuela exactamente sobre el camión en movimiento (mantén 3 segundos)",
        target: carrier.pad.position,
        check: (dt = 0.02) => {
          const d = Math.hypot(drone.pos.x - carrier.pad.position.x, drone.pos.z - carrier.pad.position.z);
          const altDiff = Math.abs(drone.pos.y - carrier.pad.position.y);
          if (d <= 1.8 && altDiff < 1.6) {
            formationTimer += dt;
            return formationTimer >= 3.0;
          }
          formationTimer = Math.max(0, formationTimer - dt * 0.5);
          return false;
        },
        hint: "Ajusta el stick de cabeceo (Pitch) para copiar la velocidad del camión."
      },
      {
        title: "ALINEACIÓN 4/7",
        desc: "Supera la Compuerta 3 manteniendo el rumbo del convoy",
        target: g3.center,
        check: () => checkGatePass(g3, 0.5),
        onComplete: () => g3.setSuccess()
      },
      {
        title: "APROXIMACIÓN 5/7",
        desc: "Desciende a menos de 0.8m sobre la plataforma móvil",
        target: carrier.pad.position,
        check: () => {
          const d = Math.hypot(drone.pos.x - carrier.pad.position.x, drone.pos.z - carrier.pad.position.z);
          return d <= 1.2 && drone.pos.y <= carrier.pad.position.y + 0.8;
        },
        hint: "Permanece centrado sobre el círculo verde mientras desciendes."
      },
      {
        title: "PRE-TOMA 6/7",
        desc: "Estabiliza el dron justo en la vertical del helipuerto móvil",
        target: carrier.pad.position,
        check: () => {
          const d = Math.hypot(drone.pos.x - carrier.pad.position.x, drone.pos.z - carrier.pad.position.z);
          return d <= 0.85;
        }
      },
      {
        title: "TOMA MÓVIL 7/7",
        desc: "¡Aterriza sobre la plataforma en marcha!",
        target: carrier.pad.position,
        check: () => false,
        hint: "Toca el botón ATERRIZAR manteniendo la velocidad hacia adelante."
      }
    ]);
  }
};

export default level;
