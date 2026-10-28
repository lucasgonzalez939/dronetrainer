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
  createRescueStation
} from '../common.js';

export const level = {
  name: "MISIÓN 2",
  subtitle: "Rescate Urbano Confinado",
  desc: "Operación de Búsqueda y Rescate (SAR): desciende por una grieta estrecha en un almacén colapsado, localiza a la víctima, entrega suministros en vuelo estacionario estricto y evacúa.",
  objectives: [
    "Entra al almacén derruido por la fisura superior de solo 80 cm de margen",
    "Navega entre vigas caídas y suelo inestable hacia la baliza estroboscópica",
    "Mantén vuelo estacionario perfecto durante 4 segundos para descargar el botiquín",
    "Evacúa por el tiro vertical secundario y aterriza en la zona médica"
  ],
  isOperation: true,
  isIndoor: true,
  medalTimes: { gold: 55, silver: 75, bronze: 105 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Collapsed walls and ceiling slabs
    const slabMat = new THREE.MeshLambertMaterial({ color: 0x455a64 });
    const beamMat = new THREE.MeshLambertMaterial({ color: 0xb71c1c });

    // Roof fissure with opening
    const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.3, 10.0), slabMat);
    roofLeft.position.set(-3.8, 2.5, -6.0);
    const roofRight = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.3, 10.0), slabMat);
    roofRight.position.set( 3.8, 2.5, -6.0);
    scene.add(roofLeft, roofRight);
    levelObjects.push(roofLeft, roofRight);
    obstacles.push({ box: new THREE.Box3().setFromObject(roofLeft), mesh: roofLeft });
    obstacles.push({ box: new THREE.Box3().setFromObject(roofRight), mesh: roofRight });

    // Fallen beams creating tight crossways
    const beam1 = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.3, 0.4), beamMat);
    beam1.position.set(0.0, 1.4, -10.0);
    beam1.rotation.z = Math.PI / 14;
    scene.add(beam1);
    levelObjects.push(beam1);
    obstacles.push({ box: new THREE.Box3().setFromObject(beam1), mesh: beam1 });

    const beam2 = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.3, 0.4), beamMat);
    beam2.position.set(0.0, 1.2, -16.0);
    beam2.rotation.z = -Math.PI / 14;
    scene.add(beam2);
    levelObjects.push(beam2);
    obstacles.push({ box: new THREE.Box3().setFromObject(beam2), mesh: beam2 });

    // Fissure entry waypoint
    const wpEntry = createWaypoint(0.0, 2.7, -4.0, 0xff9800, 0.5);

    // Tight gates
    const gShaft = createFlightGate(0.0, 1.6, -6.0, 0, 1.15);
    const gBeam1 = createFlightGate(-1.6, 0.9, -10.0, 0, 1.1);
    const gBeam2 = createFlightGate( 1.6, 1.1, -16.0, 0, 1.1);
    const gReturn = createFlightGate(0.0, 1.4, -13.0, 0, 1.2);
    const gExit = createFlightGate(0.0, 2.6, -6.0, 0, 1.3);

    setLevelGates([gShaft, gBeam1, gBeam2, gReturn, gExit]);

    // Rescue beacon station
    const station = createRescueStation(2.2, 0.7, -20.0);

    const pad = createLandingPad(0.0, 0.0, 0x00e676);
    setLevelLandingPad(pad);

    setMissions([
      { title: "INFILTRACIÓN 1/9", desc: "Asciende hacia la fisura superior del tejado", target: wpEntry.center, check: () => wpEntry.check(), onComplete: () => wpEntry.setSuccess() },
      { title: "DESCENSO 2/9", desc: "Desciende de forma vertical por la grieta estrecha", target: gShaft.center, check: () => checkGatePass(gShaft, 0.4), onComplete: () => gShaft.setSuccess(), hint: "Desciende con muy poco acelerador para no golpear los bordes de la fisura." },
      { title: "ESCOMBROS 3/9", desc: "Sortear la Viga Caída Alfa por la izquierda baja", target: gBeam1.center, check: () => checkGatePass(gBeam1, 0.45), onComplete: () => gBeam1.setSuccess() },
      { title: "ESCOMBROS 4/9", desc: "Cruza por el hueco derecho de la Viga Bravo", target: gBeam2.center, check: () => checkGatePass(gBeam2, 0.45), onComplete: () => gBeam2.setSuccess() },
      { title: "LOCALIZAR 5/9", desc: "Aproxima a la baliza de emergencia del superviviente", target: station.center, check: () => drone.pos.distanceTo(station.center) <= 1.4, hint: "Ubícate justo encima del haz estroboscópico azul." },
      {
        title: "DESCARGA 6/9",
        desc: "Mantén estacionario estricto (<0.4m/s) durante 4 segundos para entregar el botiquín",
        target: station.center,
        check: (dt = 0.02) => {
          const res = station.checkHover(drone, dt);
          return res.done;
        },
        hint: "No toques los sticks bruscamente. Estabiliza el dron en el centro del haz de luz."
      },
      { title: "REPLIEGUE 7/9", desc: "Gira 180° y supera la compuerta de retorno", target: gReturn.center, check: () => checkGatePass(gReturn, 0.45), onComplete: () => gReturn.setSuccess() },
      { title: "EVACUACIÓN 8/9", desc: "Asciende por la abertura de evacuación hacia el exterior", target: gExit.center, check: () => checkGatePass(gExit, 0.45), onComplete: () => gExit.setSuccess() },
      { title: "ZONA MÉDICA 9/9", desc: "Aterriza en el helipuerto de la base de rescate", target: pad.center, check: () => false }
    ]);
  }
};

export default level;
