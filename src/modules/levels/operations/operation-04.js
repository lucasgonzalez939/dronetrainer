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
  createWindTurbine
} from '../common.js';

export const level = {
  name: "MISIÓN 4",
  subtitle: "Inspección de Aerogenerador 3D",
  desc: "Mantenimiento industrial en altura: inspecciona un aerogenerador eólico de 15 metros. Escanea el buje central, el extremo superior de las aspas y la góndola de generación bajo ráfagas térmicas.",
  objectives: [
    "Asciende en altitud controlada hasta la góndola a 11 metros de altura",
    "Escanea el buje del rotor manteniendo distancia de seguridad (>1.2m)",
    "Sube a la cota máxima (15.5m) para verificar el extremo de la pala A",
    "Rodea la góndola en órbita técnica, escanea la pala B y desciende a tierra"
  ],
  isOperation: true,
  medalTimes: { gold: 52, silver: 72, bronze: 100 },
  windScale: 1.2,
  windDir: new THREE.Vector3(0.7, 0, 0.3).normalize(),
  hazards: { vpsOn: true, windOn: true, turbOn: true, turbStrength: 0.8 },
  setup() {
    const turbine = createWindTurbine(0.0, -18.0, 11.0, 0.3);

    const wpMidClimb = createWaypoint(0.0, 6.0, -12.0, 0x00e5ff, 0.6);
    const wpNacelleRear = createWaypoint(0.0, 11.8, -16.0, 0xff9800, 0.6);
    const wpBladeB = createWaypoint(-3.2, 8.5, -19.4, 0x00e5ff, 0.6);

    const gAscent = createFlightGate(0.0, 3.0, -8.0, 0, 1.6);
    const gDescent = createFlightGate(0.0, 2.5, -8.0, 0, 1.5);
    setLevelGates([gAscent, gDescent]);

    const pad = createLandingPad(0.0, -2.0, 0x00e676);
    setLevelLandingPad(pad);

    let hubScanTimer = 0;
    let tipScanTimer = 0;

    setMissions([
      {
        title: "ASCENSO 1/9",
        desc: "Supera la compuerta de despegue hacia la torre",
        target: gAscent.center,
        check: () => checkGatePass(gAscent, 0.5),
        onComplete: () => gAscent.setSuccess()
      },
      {
        title: "COTA MEDIA 2/9",
        desc: "Sube a cota de 6 metros manteniendo la vertical",
        target: wpMidClimb.center,
        check: () => wpMidClimb.check(),
        onComplete: () => wpMidClimb.setSuccess()
      },
      {
        title: "APROXIMACIÓN 3/9",
        desc: "Aproxima al buje del rotor a 11 metros de altura",
        target: turbine.hubPos,
        check: () => drone.pos.distanceTo(turbine.hubPos) <= 2.2,
        hint: "Atención al viento en altura. Mantén una distancia segura de 1.5m a 2m del cono rojo."
      },
      {
        title: "ESCÁNER BUJE 4/9",
        desc: "Mantén encuadre estacionario en el buje durante 4 segundos",
        target: turbine.hubPos,
        check: (dt = 0.02) => {
          if (drone.pos.distanceTo(turbine.hubPos) <= 2.5) {
            hubScanTimer += dt;
            return hubScanTimer >= 4.0;
          }
          hubScanTimer = Math.max(0, hubScanTimer - dt * 0.5);
          return false;
        },
        hint: "Contrarresta la brisa lateral con pequeños toques de Roll."
      },
      {
        title: "CIMA PALA A 5/9",
        desc: "Asciende al extremo superior de la pala (cota 15.5m)",
        target: turbine.topTipPos,
        check: (dt = 0.02) => {
          if (drone.pos.distanceTo(turbine.topTipPos) <= 2.4) {
            tipScanTimer += dt;
            return tipScanTimer >= 3.0;
          }
          tipScanTimer = Math.max(0, tipScanTimer - dt * 0.5);
          return false;
        },
        hint: "Cota máxima del ejercicio. Mantén acelerador firme pero suave."
      },
      {
        title: "GÓNDOLA 6/9",
        desc: "Rodea hacia la parte trasera de la góndola de generación",
        target: wpNacelleRear.center,
        check: () => wpNacelleRear.check(),
        onComplete: () => wpNacelleRear.setSuccess()
      },
      {
        title: "PALA INCLINADA 7/9",
        desc: "Inspecciona la pala lateral Bravo a 8.5m",
        target: wpBladeB.center,
        check: () => wpBladeB.check(),
        onComplete: () => wpBladeB.setSuccess()
      },
      {
        title: "DESCENSO 8/9",
        desc: "Desciende por la compuerta baja de aproximación",
        target: gDescent.center,
        check: () => checkGatePass(gDescent, 0.5),
        onComplete: () => gDescent.setSuccess()
      },
      {
        title: "TOMA DE TIERRA 9/9",
        desc: "Aterriza en el helipuerto de mantenimiento técnico",
        target: pad.center,
        check: () => false
      }
    ]);
  }
};

export default level;
