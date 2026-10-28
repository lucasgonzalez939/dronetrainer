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
  createGhostDrone, checkGatePass
} from '../common.js';

export const level = {
  name: "MISIÓN 10",
  subtitle: "El Plano Secuencia Maestro (One-Take)",
  desc: "La cumbre de la cinematografía aérea: rueda un plano secuencia ininterrumpido sin cortes. Despega en el exterior, sobrevuela la alfombra roja, entra por las puertas del auditorio, rueda en el interior y sal al atardecer para la toma final.",
  objectives: [
    "Mantén fluidez y suavidad absoluta de movimientos sin colisiones ni sacudidas",
    "Realiza la transición exterior-interior enhebrando el umbral de entrada de 1.4m",
    "Navega entre columnas interiores y ejecuta una órbita al atril principal",
    "Evacúa por el arco este hacia el jardín exterior y finaliza con un barrido panorámico"
  ],
  isOperation: true,
  isIndoor: false,
  medalTimes: { gold: 68, silver: 95, bronze: 130 },
  windScale: 0.2,
  windDir: new THREE.Vector3(0.2, 0, 0.1).normalize(),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Pavilion / Hall architectural structure
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0xdcedc8 });
    const redCarpetMat = new THREE.MeshBasicMaterial({ color: 0xb71c1c });

    // Red carpet runner on the ground outside
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 14.0), redCarpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0.0, 0.02, -10.0);
    scene.add(carpet);
    levelObjects.push(carpet);

    // Front facade wall with a central doorway
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(6.0, 4.0, 0.4), wallMat);
    wallLeft.position.set(-4.0, 2.0, -18.0);
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(6.0, 4.0, 0.4), wallMat);
    wallRight.position.set( 4.0, 2.0, -18.0);
    const wallLintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.4), wallMat);
    wallLintel.position.set(0.0, 3.1, -18.0);

    scene.add(wallLeft, wallRight, wallLintel);
    levelObjects.push(wallLeft, wallRight, wallLintel);
    obstacles.push({ box: new THREE.Box3().setFromObject(wallLeft), mesh: wallLeft });
    obstacles.push({ box: new THREE.Box3().setFromObject(wallRight), mesh: wallRight });
    obstacles.push({ box: new THREE.Box3().setFromObject(wallLintel), mesh: wallLintel });

    // Interior pavilion columns
    [-2.2, 2.2].forEach(colX => {
      [-23.0, -28.0].forEach(colZ => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.0, 12), pillarMat);
        pillar.position.set(colX, 2.0, colZ);
        scene.add(pillar);
        levelObjects.push(pillar);
        obstacles.push({ box: new THREE.Box3().setFromObject(pillar), mesh: pillar });
      });
    });

    // Interior stage / podium
    const podiumMat = new THREE.MeshLambertMaterial({ color: 0xffd54f });
    const podium = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 2.2), podiumMat);
    podium.position.set(0.0, 0.3, -31.0);
    scene.add(podium);
    levelObjects.push(podium);

    // Exit side doorway arch (East wall)
    const exitWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.0, 8.0), wallMat);
    exitWall.position.set(5.0, 2.0, -28.0);
    scene.add(exitWall);
    levelObjects.push(exitWall);

    // Sequence gates
    const gExt1 = createFlightGate(0.0, 3.5, -5.0, 0, 1.6);
    const gExt2 = createFlightGate(0.0, 1.6, -12.0, 0, 1.5);
    const gDoor = createFlightGate(0.0, 1.4, -18.0, 0, 1.35); // Doorway threshold
    const gInside = createFlightGate(0.0, 1.6, -24.0, 0, 1.35);
    const gExitArch = createFlightGate(4.0, 1.8, -28.0, Math.PI / 2, 1.4);
    const gOutsideReveal = createFlightGate(7.0, 3.2, -18.0, -Math.PI / 8, 1.5);
    const gFinalApp = createFlightGate(3.0, 1.6, -8.0, -Math.PI / 4, 1.5);

    setLevelGates([gExt1, gExt2, gDoor, gInside, gExitArch, gOutsideReveal, gFinalApp]);

    const wpPodiumOrbit = createWaypoint(0.0, 2.2, -31.0, 0xffeb3b, 0.6);
    const wpPanorama = createWaypoint(5.0, 4.0, -10.0, 0x00e5ff, 0.7);

    const pad = createLandingPad(0.0, -1.0, 0x00e676);
    setLevelLandingPad(pad);

    let panoramaTimer = 0;

    setMissions([
      {
        title: "TOMA 1/12",
        desc: "¡Acción! Despegue y plano general exterior a 3.5m",
        target: gExt1.center,
        check: () => checkGatePass(gExt1, 0.5),
        onComplete: () => gExt1.setSuccess(),
        hint: "Comienza con una elevación suave para abrir la escena."
      },
      {
        title: "TOMA 2/12",
        desc: "Descenso gradual a altura de ojos (1.6m) sobre la alfombra roja",
        target: gExt2.center,
        check: () => checkGatePass(gExt2, 0.5),
        onComplete: () => gExt2.setSuccess()
      },
      {
        title: "UMBRAL 3/12",
        desc: "Enhebra la puerta de entrada al auditorio (1.4m de margen)",
        target: gDoor.center,
        check: () => checkGatePass(gDoor, 0.45),
        onComplete: () => gDoor.setSuccess(),
        hint: "Ajusta la trayectoria central para no rozar el marco de la puerta."
      },
      {
        title: "INTERIOR 4/12",
        desc: "Navega por la nave central entre columnas decoradas",
        target: gInside.center,
        check: () => checkGatePass(gInside, 0.45),
        onComplete: () => gInside.setSuccess()
      },
      {
        title: "PODIO 5/12",
        desc: "Aproxima al podio del auditorio para plano cercano",
        target: wpPodiumOrbit.center,
        check: () => wpPodiumOrbit.check(),
        onComplete: () => wpPodiumOrbit.setSuccess()
      },
      {
        title: "ÓRBITA 6/12",
        desc: "Gira 90° hacia la salida este manteniendo la altitud",
        target: gExitArch.center,
        check: () => drone.pos.x >= 2.0 && drone.pos.z <= -26.0
      },
      {
        title: "SALIDA 7/12",
        desc: "Cruza el arco este de salida hacia el jardín exterior",
        target: gExitArch.center,
        check: () => checkGatePass(gExitArch, 0.5),
        onComplete: () => gExitArch.setSuccess()
      },
      {
        title: "REVELADO 8/12",
        desc: "Asciende a 3.2m por la compuerta de revelado exterior",
        target: gOutsideReveal.center,
        check: () => checkGatePass(gOutsideReveal, 0.5),
        onComplete: () => gOutsideReveal.setSuccess(),
        hint: "Abre el plano mostrando el campus iluminado."
      },
      {
        title: "BARRIDO 9/12",
        desc: "Posiciónate en el mirador panorámico a 4.0m",
        target: wpPanorama.center,
        check: () => wpPanorama.check(),
        onComplete: () => wpPanorama.setSuccess()
      },
      {
        title: "PANORAMA 10/12",
        desc: "Mantén encuadre panorámico estable durante 3 segundos",
        target: wpPanorama.center,
        check: (dt = 0.02) => {
          if (drone.pos.distanceTo(wpPanorama.center) <= 1.5) {
            panoramaTimer += dt;
            return panoramaTimer >= 3.0;
          }
          panoramaTimer = Math.max(0, panoramaTimer - dt * 0.5);
          return false;
        },
        hint: "Rotación suave de horizonte sin aceleraciones repentinas."
      },
      {
        title: "APROXIMACIÓN 11/12",
        desc: "Compuerta de descenso hacia el helipuerto principal",
        target: gFinalApp.center,
        check: () => checkGatePass(gFinalApp, 0.5),
        onComplete: () => gFinalApp.setSuccess()
      },
      {
        title: "CORTE Y TOMA 12/12",
        desc: "¡Corten! Aterrizaje con suavidad de producción cinematográfica",
        target: pad.center,
        check: () => false
      }
    ]);
  }
};

export default level;
