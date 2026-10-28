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
  name: "MISIÓN 8",
  subtitle: "Cable Cam Virtual (Travelling Lineal)",
  desc: "Simulación de cámara sobre cable (Cable Cam) en eventos deportivos: mantén una trayectoria milimétricamente recta a velocidad constante a través de un pasillo arbolado, seguida de una desaceleración cinemática y maniobra de retroceso.",
  objectives: [
    "Alinea el dron en la cabecera de la línea de cable imaginaria",
    "Mantén velocidad constante (3 m/s a 5 m/s) sin desviarte del eje longitudinal",
    "Supera las 4 compuertas de la tirolina aérea con precisión de raíles",
    "Ejecuta una frenada suave progresiva y un retroceso en contrapicado (Dolly Reveal)"
  ],
  isOperation: true,
  medalTimes: { gold: 48, silver: 68, bronze: 92 },
  windScale: 0.1,
  windDir: new THREE.Vector3(0, 0, 0),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Tree pylons / posts flanking the cable cam avenue
    const postMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });

    [-10.0, -18.0, -26.0, -34.0].forEach(pz => {
      // Left tree
      const trunkL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4.0, 8), postMat);
      trunkL.position.set(-2.8, 2.0, pz);
      const topL = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 8), foliageMat);
      topL.position.set(-2.8, 4.2, pz);

      // Right tree
      const trunkR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4.0, 8), postMat);
      trunkR.position.set( 2.8, 2.0, pz);
      const topR = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 8), foliageMat);
      topR.position.set( 2.8, 4.2, pz);

      scene.add(trunkL, topL, trunkR, topR);
      levelObjects.push(trunkL, topL, trunkR, topR);
      obstacles.push({ box: new THREE.Box3().setFromObject(trunkL), mesh: trunkL });
      obstacles.push({ box: new THREE.Box3().setFromObject(trunkR), mesh: trunkR });
    });

    const wpStart = createWaypoint(0.0, 2.4, -4.0, 0x00e5ff, 0.5);

    // 4 straight Cable Cam gates at constant height 2.4m
    const g1 = createFlightGate(0.0, 2.4, -10.0, 0, 1.4);
    const g2 = createFlightGate(0.0, 2.4, -18.0, 0, 1.35);
    const g3 = createFlightGate(0.0, 2.4, -26.0, 0, 1.35);
    const g4 = createFlightGate(0.0, 2.4, -34.0, 0, 1.4);
    setLevelGates([g1, g2, g3, g4]);

    const wpStop = createWaypoint(0.0, 2.4, -38.0, 0xffeb3b, 0.6);
    const wpReverse = createWaypoint(0.0, 3.8, -20.0, 0xff7043, 0.7);

    const pad = createLandingPad(0.0, -2.0, 0x00e676);
    setLevelLandingPad(pad);

    let smoothDecelTimer = 0;

    setMissions([
      {
        title: "CABECERA CABLE 1/10",
        desc: "Alinea en el punto de anclaje de la tirolina aérea a 2.4m",
        target: wpStart.center,
        check: () => wpStart.check(),
        onComplete: () => wpStart.setSuccess(),
        hint: "Centra el morro exactamente a lo largo de la avenida (Yaw 0)."
      },
      {
        title: "TRAMO CABLE 1 2/10",
        desc: "Cruza la Compuerta 1 manteniendo velocidad lineal",
        target: g1.center,
        check: () => checkGatePass(g1, 0.45),
        onComplete: () => g1.setSuccess()
      },
      {
        title: "TRAMO CABLE 2 3/10",
        desc: "Compuerta 2: Vuelo en raíl sin desviaciones laterales",
        target: g2.center,
        check: () => checkGatePass(g2, 0.45),
        onComplete: () => g2.setSuccess(),
        hint: "Mantén el stick de cabeceo (Pitch) continuo sin balanceo."
      },
      {
        title: "TRAMO CABLE 3 4/10",
        desc: "Compuerta 3: Mantén la altura constante a 2.4m",
        target: g3.center,
        check: () => checkGatePass(g3, 0.45),
        onComplete: () => g3.setSuccess()
      },
      {
        title: "TRAMO CABLE 4 5/10",
        desc: "Compuerta 4: Fin del tramo de avance del cable",
        target: g4.center,
        check: () => checkGatePass(g4, 0.45),
        onComplete: () => g4.setSuccess()
      },
      {
        title: "FRENADA SUAVE 6/10",
        desc: "Desaceleración cinemática progresiva en el Punto de Parada",
        target: wpStop.center,
        check: (dt = 0.02) => {
          const dist = drone.pos.distanceTo(wpStop.center);
          const speed = drone.vel.length();
          if (dist <= 1.5 && speed <= 0.6) {
            smoothDecelTimer += dt;
            return smoothDecelTimer >= 2.5;
          }
          smoothDecelTimer = Math.max(0, smoothDecelTimer - dt * 0.5);
          return false;
        },
        hint: "Reduce la velocidad gradualmente sin frenazos bruscos."
      },
      {
        title: "DOLLY REVEAL 7/10",
        desc: "Retrocede marcha atrás ascendiendo a 3.8m con morro al frente",
        target: wpReverse.center,
        check: () => wpReverse.check(),
        onComplete: () => wpReverse.setSuccess(),
        hint: "Aplica cabeceo hacia atrás (Stick derecho abajo) mientras subes gas a 3.8m."
      },
      {
        title: "RETORNO 8/10",
        desc: "Desciende de forma controlada hacia la vertical de pista",
        target: wpStart.center,
        check: () => drone.pos.z >= -6.0 && drone.pos.y <= 2.2
      },
      {
        title: "APROXIMACIÓN 9/10",
        desc: "Estabiliza el horizonte sobre el helipuerto",
        target: pad.center,
        check: () => Math.hypot(drone.pos.x - pad.center.x, drone.pos.z - pad.center.z) <= 1.2
      },
      {
        title: "TOMA DE TIERRA 10/10",
        desc: "Aterriza con suavidad en el helipuerto verde",
        target: pad.center,
        check: () => false
      }
    ]);
  }
};

export default level;
