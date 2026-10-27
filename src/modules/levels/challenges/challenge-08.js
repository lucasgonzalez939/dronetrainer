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
    name: "DESAFÍO 8",
    subtitle: "Vuelo Rasante",
    desc: "Vuela bajo radar: todos los aros están por debajo de 1.1m. Vigas suspendidas castigan subir demasiado.",
    objectives: [
      "Vuela bajo radar: todos los aros están por debajo de 1.1m",
      "Evita las vigas rojas superiores que bloquean la subida",
      "Aterriza en el helipuerto amarillo"
    ],
    isChallenge: true,
    medalTimes: { gold: 26, silver: 38, bronze: 55 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      // Overhead beam obstacles at 1.5m
      const beamMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
      [-8.0, -14.0, -20.0].forEach(bz => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.15, 0.15), beamMat);
        beam.position.set(0, 1.55, bz);
        scene.add(beam);
        beam.updateWorldMatrix(true, false);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(beam), mesh: beam }]);
        setLevelObjects([...levelObjects, beam]);
      });

      const g1 = createFlightGate( 0.0, 0.85, -5.0,  0, 1.05);
      const g2 = createFlightGate(-1.8, 0.90, -11.0, Math.PI / 8, 1.05);
      const g3 = createFlightGate( 1.8, 0.85, -17.0, -Math.PI / 8, 1.05);
      const g4 = createFlightGate( 0.0, 0.90, -23.0, 0, 1.05);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -27.5, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        { title: "RASANTE 1/5", desc: "Aro bajo 1 (0.85m) — mantén altura sin subir", target: g1.center, check: () => checkGatePass(g1, 0.4), onComplete: () => g1.setSuccess() },
        { title: "RASANTE 2/5", desc: "Aro bajo 2 — ¡Cuidado con la viga roja superior!", target: g2.center, check: () => checkGatePass(g2, 0.4), onComplete: () => g2.setSuccess(), hint: "Ajusta toques suaves de acelerador para no elevarte hacia las vigas." },
        { title: "RASANTE 3/5", desc: "Aro bajo 3 a la derecha", target: g3.center, check: () => checkGatePass(g3, 0.4), onComplete: () => g3.setSuccess() },
        { title: "RASANTE 4/5", desc: "Aro bajo 4 final", target: g4.center, check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
        { title: "RASANTE 5/5", desc: "Aterriza en el helipuerto amarillo", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
