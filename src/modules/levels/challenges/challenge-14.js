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
  name: "DESAFÍO 14",
  subtitle: "Hangar Ciego Bajo Techo (No-VPS Micro-Maze)",
  desc: "Nave industrial sin soporte óptico (VPS ciego en todo el suelo) y vigas bajas. Maniobrabilidad milimétrica en techo bajo.",
  objectives: [
    "Suelo reflectante total: inercia permanente sin autofrenado",
    "Plafón de vigas a 2.1m que castiga subir en exceso",
    "Supera los 5 aros ratoneros en eslalon y toma tierra en el helipuerto naranja"
  ],
  isIndoor: true,
  isChallenge: true,
  medalTimes: { gold: 34, silver: 48, bronze: 68 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Floor-wide slick zone
    setLevelSlickZones([createSlickZone(0.0, -16.0, 16.0, 36.0)]);

    // Low crossbeams across the ceiling at y = 2.15m
    const beamMat = new THREE.MeshLambertMaterial({ color: 0x546e7a });
    const beamGeo = new THREE.BoxGeometry(14.0, 0.25, 0.35);
    [-6.0, -12.0, -18.0, -24.0].forEach(bz => {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0.0, 2.15, bz);
      scene.add(beam);
      levelObjects.push(beam);
      obstacles.push(beam);
    });

    const g1 = createFlightGate( 0.0, 1.25, -4.5, 0, 1.15);
    const g2 = createFlightGate(-2.2, 1.25, -9.5, Math.PI / 8, 1.15);
    const g3 = createFlightGate( 2.2, 1.30, -15.5, -Math.PI / 8, 1.15);
    const g4 = createFlightGate(-1.5, 1.25, -21.0, Math.PI / 10, 1.15);
    const g5 = createFlightGate( 0.0, 1.20, -26.5, 0, 1.2);
    setLevelGates([g1, g2, g3, g4, g5]);

    const pad = createLandingPad(0.0, -31.0, 0xff7043);
    setLevelLandingPad(pad);

    setMissions([
      { title: "MICRO-LABERINTO 1/6", desc: "Aro 1: Mantén altitud baja bajo las vigas", target: g1.center, check: () => checkGatePass(g1, 0.4), onComplete: () => g1.setSuccess(), hint: "No subas más de 1.6m o colisionarás con las vigas del techo." },
      { title: "MICRO-LABERINTO 2/6", desc: "Aro 2 a la izquierda — frena contra la inercia", target: g2.center, check: () => checkGatePass(g2, 0.4), onComplete: () => g2.setSuccess() },
      { title: "MICRO-LABERINTO 3/6", desc: "Aro 3 a la derecha — cambio de rumbo deslizante", target: g3.center, check: () => checkGatePass(g3, 0.4), onComplete: () => g3.setSuccess() },
      { title: "MICRO-LABERINTO 4/6", desc: "Aro 4 central estrecho", target: g4.center, check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
      { title: "MICRO-LABERINTO 5/6", desc: "Aro 5 de salida a zona de descarga", target: g5.center, check: () => checkGatePass(g5, 0.4), onComplete: () => g5.setSuccess() },
      { title: "TOMA DE TIERRA 6/6", desc: "Aterriza en la plataforma naranja sin derrapar", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
