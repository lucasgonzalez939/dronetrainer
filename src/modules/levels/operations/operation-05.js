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
  createCrowdSafetyZone
} from '../common.js';

export const level = {
  name: "MISIÓN 5",
  subtitle: "Filmación de Evento Escolar",
  desc: "Operación de dron de cámara en un festival escolar: realiza tomas cinematográficas (plano general, dolly, órbita POI y dronie) respetando la cota de seguridad sobre la multitud (>3m) y cubriendo la secuencia en el orden del guion.",
  objectives: [
    "Mantén la cota de seguridad (>3.0m) sin sobrevolar a baja altura sobre el público",
    "Ejecuta una toma Dolly suave a lo largo del pasillo central del festival",
    "Realiza una órbita cinemática de 360° alrededor del escenario principal",
    "Captura las tomas en el orden del evento (Escenario -> Gradas -> Pista) y finaliza con un Dronie"
  ],
  isOperation: true,
  medalTimes: { gold: 65, silver: 88, bronze: 120 },
  windScale: 0.3,
  windDir: new THREE.Vector3(0.2, 0, 0.1).normalize(),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Stage structure
    const stageMat = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
    const stageMesh = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.8, 4.0), stageMat);
    stageMesh.position.set(0.0, 0.4, -28.0);
    scene.add(stageMesh);
    levelObjects.push(stageMesh);
    obstacles.push({ box: new THREE.Box3().setFromObject(stageMesh), mesh: stageMesh });

    // Stage arch
    const archMat = new THREE.MeshLambertMaterial({ color: 0xffd600 });
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.3, 0.3), archMat);
    archTop.position.set(0.0, 3.2, -28.0);
    scene.add(archTop);
    levelObjects.push(archTop);

    // Crowd Bleachers (Left and Right of aisle)
    const crowdLeft = createCrowdSafetyZone(-7.0, -16.0, 6.0, 16.0, 3.0);
    const crowdRight = createCrowdSafetyZone( 7.0, -16.0, 6.0, 16.0, 3.0);

    // Cinematography waypoints
    const wpGeneral = createWaypoint(0.0, 4.8, -6.0, 0x00e5ff, 0.6);
    const wpDolly1 = createWaypoint(0.0, 3.6, -12.0, 0x00e5ff, 0.5);
    const wpDolly2 = createWaypoint(0.0, 3.6, -20.0, 0x00e5ff, 0.5);

    // Orbit POI waypoints around stage (at radius ~4.5m and height 3.2m)
    const wpOrbit1 = createWaypoint( 3.8, 3.2, -28.0, 0xffeb3b, 0.5);
    const wpOrbit2 = createWaypoint( 0.0, 3.5, -33.0, 0xffeb3b, 0.5);
    const wpOrbit3 = createWaypoint(-3.8, 3.2, -28.0, 0xffeb3b, 0.5);

    // Ordered event shots
    const wpShotBleachers = createWaypoint(-7.0, 4.2, -16.0, 0xff7043, 0.6);
    const wpShotTrack = createWaypoint(7.0, 4.2, -16.0, 0xff7043, 0.6);
    const wpDronie = createWaypoint(0.0, 7.5, -2.0, 0x00e676, 0.7);

    const pad = createLandingPad(0.0, -1.0, 0x00e676);
    setLevelLandingPad(pad);

    setMissions([
      {
        title: "PLANO GENERAL 1/10",
        desc: "Eleva a 4.8m para la toma de establecimiento del campus",
        target: wpGeneral.center,
        check: () => wpGeneral.check(),
        onComplete: () => wpGeneral.setSuccess(),
        hint: "Respeta siempre la cota de seguridad de 3 metros sobre las gradas."
      },
      {
        title: "TOMA DOLLY 2/10",
        desc: "Avanza en línea recta suave por el pasillo central (Punto Alfa)",
        target: wpDolly1.center,
        check: () => {
          if (!crowdLeft.checkSafety(drone) || !crowdRight.checkSafety(drone)) return false;
          return wpDolly1.check();
        },
        onComplete: () => wpDolly1.setSuccess(),
        hint: "Movimiento continuo sin frenazos para una toma limpia."
      },
      {
        title: "TOMA DOLLY 3/10",
        desc: "Continúa el avance por el pasillo central hacia el escenario (Punto Bravo)",
        target: wpDolly2.center,
        check: () => wpDolly2.check(),
        onComplete: () => wpDolly2.setSuccess()
      },
      {
        title: "ÓRBITA POI 4/10",
        desc: "Inicia órbita circular alrededor del escenario: Flanco Este",
        target: wpOrbit1.center,
        check: () => wpOrbit1.check(),
        onComplete: () => wpOrbit1.setSuccess(),
        hint: "Combina guiñada hacia el escenario mientras te desplazas lateralmente."
      },
      {
        title: "ÓRBITA POI 5/10",
        desc: "Continúa la órbita por la parte posterior del escenario",
        target: wpOrbit2.center,
        check: () => wpOrbit2.check(),
        onComplete: () => wpOrbit2.setSuccess()
      },
      {
        title: "ÓRBITA POI 6/10",
        desc: "Completa el giro de 360° en el Flanco Oeste",
        target: wpOrbit3.center,
        check: () => wpOrbit3.check(),
        onComplete: () => wpOrbit3.setSuccess()
      },
      {
        title: "GUION 1: GRADAS 7/10",
        desc: "Toma ordenada 1: Plano aéreo de las gradas de alumnos (>3.5m)",
        target: wpShotBleachers.center,
        check: () => {
          if (!crowdLeft.checkSafety(drone)) return false;
          return wpShotBleachers.check();
        },
        onComplete: () => wpShotBleachers.setSuccess(),
        hint: "No bajes de 3 metros sobre la grada."
      },
      {
        title: "GUION 2: PISTA 8/10",
        desc: "Toma ordenada 2: Plano aéreo de la pista de deportes",
        target: wpShotTrack.center,
        check: () => wpShotTrack.check(),
        onComplete: () => wpShotTrack.setSuccess()
      },
      {
        title: "TOMA DRONIE 9/10",
        desc: "Ejecuta un Dronie: retrocede y asciende simultáneamente hasta 7.5m",
        target: wpDronie.center,
        check: () => wpDronie.check(),
        onComplete: () => wpDronie.setSuccess(),
        hint: "Tira suavemente del stick derecho hacia atrás mientras elevas acelerador a 45°."
      },
      {
        title: "ZONA TÉCNICA 10/10",
        desc: "Desciende de forma segura y aterriza en el helipuerto de producción",
        target: pad.center,
        check: () => false
      }
    ]);
  }
};

export default level;
