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
  name: "DESAFÍO 11",
  subtitle: "Callejón de Cizalladura (Wind Shear)",
  desc: "Cizalladura violenta: ráfagas cruzadas extremas (3.2x) con cambios repentinos de intensidad entre muros protectores.",
  objectives: [
    "Viento extremo lateral con turbulencia severa (3.2x)",
    "Contrarresta el empuje al salir del abrigo de los contenedores",
    "Supera las 5 compuertas y asegura la toma de tierra"
  ],
  isChallenge: true,
  medalTimes: { gold: 28, silver: 40, bronze: 58 },
  windScale: 3.2,
  windDir: new THREE.Vector3(1.0, 0, 0.2).normalize(),
  hazards: { vpsOn: true, windOn: true, windStrength: 3.2, turbOn: true, turbStrength: 2.0 },
  setup() {
    // Shielding containers on alternating sides
    const boxMat = new THREE.MeshLambertMaterial({ color: 0xc62828 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.0, 6.0), boxMat);
    c1.position.set(-3.5, 2.0, -8.0);
    scene.add(c1);
    levelObjects.push(c1);
    obstacles.push(c1);

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.0, 6.0), boxMat);
    c2.position.set(3.5, 2.0, -18.0);
    scene.add(c2);
    levelObjects.push(c2);
    obstacles.push(c2);

    const g1 = createFlightGate( 0.0, 1.4, -4.5, 0, 1.3);
    const g2 = createFlightGate(-1.5, 1.3, -9.0, Math.PI / 10, 1.25);
    const g3 = createFlightGate( 1.5, 1.5, -14.5, -Math.PI / 10, 1.25);
    const g4 = createFlightGate( 0.0, 1.4, -20.0, 0, 1.25);
    const g5 = createFlightGate( 0.0, 1.2, -25.5, 0, 1.3);
    setLevelGates([g1, g2, g3, g4, g5]);

    const pad = createLandingPad(0.0, -30.0, 0xff5722);
    setLevelLandingPad(pad);

    setMissions([
      { title: "CIZALLADURA 1/6", desc: "Aro 1 en zona de viento abierto", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
      { title: "CIZALLADURA 2/6", desc: "Aro 2: Entrada al abrigo del contenedor izquierdo", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Al entrar al abrigo el viento cesa súbitamente: reduce la corrección de Roll o chocarás con la pared." },
      { title: "CIZALLADURA 3/6", desc: "Aro 3: Salida violenta al viento cruzado", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess(), hint: "¡Prepárate para contrarrestar el empuje lateral instantáneamente al salir!" },
      { title: "CIZALLADURA 4/6", desc: "Aro 4 junto al segundo contenedor", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
      { title: "CIZALLADURA 5/6", desc: "Aro 5 de aproximación final", target: g5.center, check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
      { title: "TOMA DE TIERRA 6/6", desc: "Aterriza con firmeza antes de que el viento te desplace", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
