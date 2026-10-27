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
    name: "NIVEL 11",
    subtitle: "Pasillos y Estanterías",
    desc: "Navega entre racks industriales en ángulo recto. Detén la inercia antes de girar en esquinas cerradas.",
    isIndoor: true,
    objectives: [
      "Avanza por el pasillo principal",
      "Gira 90° a la derecha entre las estanterías",
      "Gira 90° a la izquierda al siguiente pasillo y aterriza"
    ],
    medalTimes: { gold: 26, silver: 38, bronze: 56 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      // Storage rack obstacles
      const rackMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 0.8), rackMat);
      r1.position.set(-2.2, 1.2, -9.0);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 0.8), rackMat);
      r2.position.set(2.2, 1.2, -15.0);
      scene.add(r1, r2);
      r1.updateWorldMatrix(true, false);
      r2.updateWorldMatrix(true, false);
      setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(r1), mesh: r1 }, { box: new THREE.Box3().setFromObject(r2), mesh: r2 }]);
      setLevelObjects([...levelObjects, r1, r2]);

      const g1 = createFlightGate(0.0, 1.3, -4.5, 0, 1.2);
      const g2 = createFlightGate(2.4, 1.3, -9.0, Math.PI / 2, 1.15);
      const g3 = createFlightGate(2.4, 1.3, -13.5, 0, 1.15);
      const g4 = createFlightGate(-0.5, 1.3, -17.5, -Math.PI / 2, 1.15);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(-0.5, -21.5, 0xffca28);
      setLevelLandingPad(pad);

      setMissions([
        { title: "PASILLO 1 / 5", desc: "Aro 1 de entrada al pasillo", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "PASILLO 2 / 5", desc: "Frena y gira a la derecha: Aro 2 entre estanterías", target: g2.center, check: () => checkGatePass(g2, 0.4), onComplete: () => g2.setSuccess(), hint: "Frena totalmente la inercia frontal antes de virar a la derecha." },
        { title: "PASILLO 3 / 5", desc: "Aro 3 en el carril derecho", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "PASILLO 4 / 5", desc: "Giro a la izquierda: Aro 4 de salida", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "PASILLO 5 / 5", desc: "Aterriza en el helipuerto amarillo", target: pad.center, check: () => false }
      ]);
    }
  };

export default level;
