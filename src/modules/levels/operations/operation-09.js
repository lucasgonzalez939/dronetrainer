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
  name: "MISIÓN 9",
  subtitle: "Travelling Circular en Movimiento",
  desc: "Filmación dinámica avanzada: realiza una órbita cinemática de 360° alrededor de un sujeto en marcha continua (carrito de cámara), combinando vector de avance y rotación orbital sin perder la distancia de seguridad.",
  objectives: [
    "Aproxima al flanco izquierdo del vehículo móvil e inicia el arco orbital",
    "Cruza por la proa del vehículo en marcha sin permitir que se acerque a menos de 3 metros",
    "Completa el arco por el flanco derecho y estabilízate a cola en plano detalle",
    "Asciende en espiral para el plano general de clausura y aterriza en meta"
  ],
  isOperation: true,
  medalTimes: { gold: 58, silver: 80, bronze: 110 },
  windScale: 0.3,
  windDir: new THREE.Vector3(0.3, 0, 0.1).normalize(),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Wide oval track for the cinema chase car
    const trackPoints = [
      [ 0.0, -12.0],
      [ 7.0, -22.0],
      [ 7.0, -38.0],
      [ 0.0, -46.0],
      [-7.0, -38.0],
      [-7.0, -22.0]
    ];

    const actorCar = createGroundVehicle(trackPoints, 4.2, 0x00e5ff);

    const gExit = createFlightGate(0.0, 3.0, -14.0, 0, 1.6);
    const gDescent = createFlightGate(0.0, 1.6, -6.0, 0, 1.5);
    setLevelGates([gExit, gDescent]);

    const pad = createLandingPad(0.0, -1.0, 0x00e676);
    setLevelLandingPad(pad);

    let leftFlankTimer = 0;
    let rightFlankTimer = 0;
    let rearDetailTimer = 0;

    setMissions([
      {
        title: "INTERCEPCIÓN 1/10",
        desc: "Acelera e intercepta el vehículo de cámara móvil",
        target: actorCar.center,
        check: () => drone.pos.distanceTo(actorCar.center) <= 8.0,
        hint: "Acércate al vehículo azul en movimiento con velocidad suave."
      },
      {
        title: "FLANCO BABOR 2/10",
        desc: "Acompáñalo por su lado izquierdo (a 3m-6m) durante 4 segundos",
        target: actorCar.center,
        check: (dt = 0.02) => {
          const d = drone.pos.distanceTo(actorCar.center);
          const isLeft = (drone.pos.x < actorCar.center.x);
          if (d >= 2.5 && d <= 7.0 && isLeft) {
            leftFlankTimer += dt;
            return leftFlankTimer >= 4.0;
          }
          leftFlankTimer = Math.max(0, leftFlankTimer - dt * 0.5);
          return false;
        },
        hint: "Vuela en paralelo por el lado izquierdo manteniendo la misma velocidad."
      },
      {
        title: "CRUCE FRONTAL 3/10",
        desc: "Pasa por delante del vehículo en marcha sin frenar bruscamente",
        target: actorCar.center,
        check: () => {
          const d = drone.pos.distanceTo(actorCar.center);
          const isFront = (drone.pos.z < actorCar.center.z);
          return d >= 3.0 && d <= 7.5 && isFront;
        },
        hint: "Acelera levemente para rebasar la parte delantera sin chocar."
      },
      {
        title: "FLANCO ESTRIBOR 4/10",
        desc: "Acompáñalo por el lado derecho durante 4 segundos",
        target: actorCar.center,
        check: (dt = 0.02) => {
          const d = drone.pos.distanceTo(actorCar.center);
          const isRight = (drone.pos.x > actorCar.center.x);
          if (d >= 2.5 && d <= 7.0 && isRight) {
            rightFlankTimer += dt;
            return rightFlankTimer >= 4.0;
          }
          rightFlankTimer = Math.max(0, rightFlankTimer - dt * 0.5);
          return false;
        },
        hint: "Mantén el lateral derecho manteniendo la cota visual."
      },
      {
        title: "COLA Y DETALLE 5/10",
        desc: "Colócate detrás del vehículo a baja altura (1.5m)",
        target: actorCar.center,
        check: () => {
          const d = drone.pos.distanceTo(actorCar.center);
          const isBehind = (drone.pos.z > actorCar.center.z);
          return d >= 2.5 && d <= 6.5 && isBehind && drone.pos.y <= 2.2;
        }
      },
      {
        title: "TOMA DETALLE 6/10",
        desc: "Mantén encuadre de cola a baja cota durante 4 segundos",
        target: actorCar.center,
        check: (dt = 0.02) => {
          const d = drone.pos.distanceTo(actorCar.center);
          if (d >= 2.2 && d <= 7.0 && drone.pos.y <= 2.5) {
            rearDetailTimer += dt;
            return rearDetailTimer >= 4.0;
          }
          rearDetailTimer = Math.max(0, rearDetailTimer - dt * 0.5);
          return false;
        },
        hint: "Control fino del acelerador para no elevarte por encima de 2.5m."
      },
      {
        title: "ASCENSO CIMA 7/10",
        desc: "Asciende en espiral vertical hasta 6.0m para plano general",
        target: gExit.center,
        check: () => drone.pos.y >= 5.5
      },
      {
        title: "RUPTURA TOMA 8/10",
        desc: "Cruza la compuerta alta de finalización de rodaje",
        target: gExit.center,
        check: () => checkGatePass(gExit, 0.5),
        onComplete: () => gExit.setSuccess()
      },
      {
        title: "APROXIMACIÓN 9/10",
        desc: "Compuerta de descenso hacia el helipuerto de producción",
        target: gDescent.center,
        check: () => checkGatePass(gDescent, 0.5),
        onComplete: () => gDescent.setSuccess()
      },
      {
        title: "TOMA DE TIERRA 10/10",
        desc: "Aterriza en el helipuerto verde de meta",
        target: pad.center,
        check: () => false
      }
    ]);
  }
};

export default level;
