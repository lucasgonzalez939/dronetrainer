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
    name: "NIVEL 6",
    subtitle: "El Cuadrado Orientado",
    desc: "Recorre el cuadrado girando el morro del dron en cada esquina hacia la dirección del vuelo.",
    objectives: [
      "Aro 1: Avanza encarando al Norte",
      "Aro 2: Gira 90° derecha encarando al Este",
      "Aro 3: Gira 90° derecha encarando al Sur (¡mandos invertidos!)",
      "Aro 4: Gira 90° derecha encarando al Oeste y aterriza"
    ],
    medalTimes: { gold: 32, silver: 46, bronze: 68 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.4, -5.5, 0, 1.25);
      const g2 = createFlightGate( 4.5, 1.4, -5.5, Math.PI / 2, 1.25);
      const g3 = createFlightGate( 4.5, 1.4, -1.0, Math.PI, 1.25);
      const g4 = createFlightGate( 0.0, 1.4, -1.0, -Math.PI / 2, 1.25);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -3.2, 0xffca28);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "TRAMO 1 / 5",
          desc: "Avanza hacia el Aro 1 encarando al Norte",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "TRAMO 2 / 5",
          desc: "Gira a la derecha y encara el Aro 2 al Este",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess()
        },
        {
          title: "TRAMO 3 / 5",
          desc: "Gira al Sur hacia el Aro 3 (mirando hacia el piloto)",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess(),
          hint: "Cuando el dron viene hacia ti, tus mandos de izquierda/derecha se invierten."
        },
        {
          title: "TRAMO 4 / 5",
          desc: "Gira al Oeste y cruza el Aro 4",
          target: g4.center,
          check: () => checkGatePass(g4, 0.45),
          onComplete: () => g4.setSuccess()
        },
        {
          title: "TRAMO 5 / 5",
          desc: "Gira y aterriza en el helipuerto amarillo central",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  };

export default level;
