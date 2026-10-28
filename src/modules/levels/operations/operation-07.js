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
  name: "MISIÓN 7",
  subtitle: "Plano Grúa y Vuelo Cenital (Nadir 90°)",
  desc: "Técnicas de cámara para cine y televisión: ejecuta un ascenso vertical tipo grúa (Jib), sobrevuela en plano cenital ortogonal (Nadir 90°) sobre el monumento de la plaza y realiza una rotación de tirabuzón descendente.",
  objectives: [
    "Ascenso vertical estricto tipo grúa cinematográfica (Jib shot) sin deriva lateral",
    "Posiciónate en el eje cenital (Nadir) a 5.5 metros sobre el monumento central",
    "Realiza un barrido horizontal de pedestal y un giro cenital continuo de 360°",
    "Aproximación en semicírculo bajo y toma de tierra suave"
  ],
  isOperation: true,
  medalTimes: { gold: 56, silver: 78, bronze: 110 },
  windScale: 0.2,
  windDir: new THREE.Vector3(0.2, 0, 0.1).normalize(),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Plaza monument structure
    const monMat = new THREE.MeshLambertMaterial({ color: 0x546e7a });
    const monBase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 0.8, 16), monMat);
    monBase.position.set(0.0, 0.4, -18.0);

    const pillarMat = new THREE.MeshLambertMaterial({ color: 0xffd54f });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.8, 12), pillarMat);
    pillar.position.set(0.0, 2.2, -18.0);

    scene.add(monBase, pillar);
    levelObjects.push(monBase, pillar);
    obstacles.push({ box: new THREE.Box3().setFromObject(monBase), mesh: monBase });
    obstacles.push({ box: new THREE.Box3().setFromObject(pillar), mesh: pillar });

    // Decorative plaza concentric floor rings
    const ringMatA = new THREE.MeshBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 0.6 });
    const ringA = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.4, 32), ringMatA);
    ringA.rotation.x = -Math.PI / 2;
    ringA.position.set(0.0, 0.02, -18.0);
    const ringB = new THREE.Mesh(new THREE.RingGeometry(5.8, 6.0, 32), ringMatA);
    ringB.rotation.x = -Math.PI / 2;
    ringB.position.set(0.0, 0.02, -18.0);
    scene.add(ringA, ringB);
    levelObjects.push(ringA, ringB);

    // Cinematography waypoints
    const wpCraneTop = createWaypoint(0.0, 4.5, -4.0, 0x00e5ff, 0.5);
    const wpNadirCenter = createWaypoint(0.0, 5.5, -18.0, 0xffeb3b, 0.6);
    const wpPedestal = createWaypoint(4.5, 5.5, -18.0, 0x00e5ff, 0.5);
    const wpLowDetail = createWaypoint(0.0, 2.0, -13.0, 0xff7043, 0.5);

    // Semicircle and reveal gates
    const gSemi1 = createFlightGate( 3.5, 2.2, -18.0, -Math.PI / 2, 1.4);
    const gReveal = createFlightGate(0.0, 3.0, -26.0, 0, 1.5);
    const gReturn = createFlightGate(0.0, 1.8, -8.0, 0, 1.5);
    setLevelGates([gSemi1, gReveal, gReturn]);

    const pad = createLandingPad(0.0, -2.0, 0x00e676);
    setLevelLandingPad(pad);

    let craneTimer = 0;
    let corkscrewTimer = 0;

    setMissions([
      {
        title: "PLANO GRÚA 1/9",
        desc: "Ascenso vertical estricto de 0.5m a 4.5m sin desplazamiento lateral",
        target: wpCraneTop.center,
        check: () => {
          const latDist = Math.hypot(drone.pos.x, drone.pos.z - (-4.0));
          return drone.pos.y >= 4.3 && latDist <= 0.8;
        },
        hint: "Aplica acelerador constante manteniendo el stick derecho centrado."
      },
      {
        title: "PLANO CENITAL 2/9",
        desc: "Posiciónate directamente sobre el eje del monumento a 5.5m (Nadir)",
        target: wpNadirCenter.center,
        check: () => wpNadirCenter.check(),
        onComplete: () => wpNadirCenter.setSuccess(),
        hint: "Encuadra el centro geométrico de la plaza desde la cota alta."
      },
      {
        title: "PEDESTAL LATERAL 3/9",
        desc: "Desplazamiento horizontal lateral manteniendo altura constante (5.5m)",
        target: wpPedestal.center,
        check: () => wpPedestal.check(),
        onComplete: () => wpPedestal.setSuccess()
      },
      {
        title: "TIRABUZÓN 4/9",
        desc: "Gira la guiñada 360° mientras desciendes al centro del monumento",
        target: wpNadirCenter.center,
        check: (dt = 0.02) => {
          const dist = Math.hypot(drone.pos.x, drone.pos.z - (-18.0));
          if (dist <= 3.0 && drone.pos.y <= 3.8) {
            corkscrewTimer += dt;
            return corkscrewTimer >= 3.0;
          }
          corkscrewTimer = Math.max(0, corkscrewTimer - dt * 0.5);
          return false;
        },
        hint: "Aplica Yaw continuo y suave mientras reduces suavemente el gas."
      },
      {
        title: "PLANO DETALLE 5/9",
        desc: "Aproxima a cota de 2.0m frente a la fachada del monumento",
        target: wpLowDetail.center,
        check: () => wpLowDetail.check(),
        onComplete: () => wpLowDetail.setSuccess()
      },
      {
        title: "ÓRBITA FRONTAL 6/9",
        desc: "Supera la compuerta lateral en viraje circular",
        target: gSemi1.center,
        check: () => checkGatePass(gSemi1, 0.5),
        onComplete: () => gSemi1.setSuccess()
      },
      {
        title: "PLANO REVELADOR 7/9",
        desc: "Asciende a 3.0m por la compuerta de fondo para revelar el horizonte",
        target: gReveal.center,
        check: () => checkGatePass(gReveal, 0.5),
        onComplete: () => gReveal.setSuccess()
      },
      {
        title: "REGRESO 8/9",
        desc: "Compuerta de retorno en descenso suave hacia la base",
        target: gReturn.center,
        check: () => checkGatePass(gReturn, 0.5),
        onComplete: () => gReturn.setSuccess()
      },
      {
        title: "TOMA DE TIERRA 9/9",
        desc: "Aterriza con suavidad en el helipuerto de producción",
        target: pad.center,
        check: () => false
      }
    ]);
  }
};

export default level;
