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
  createGhostDrone, checkGatePass
} from '../common.js';

export const level = {
  name: "NIVEL 22",
  subtitle: "Compuertas Inclinadas (Paso en Actitud Angular)",
  desc: "Domina el paso por compuertas con rotación oblicua (roll / pitch). Debes inclinar suavemente el dron sin rozar los postes.",
  objectives: [
    "Supera la Compuerta 1 inclinada a +25° de balanceo",
    "Alinea e inclina en sentido opuesto (-25°) para la Compuerta 2",
    "Cruza la Compuerta 3 en descenso inclinado y aterriza en el helipuerto"
  ],
  medalTimes: { gold: 20, silver: 30, bronze: 44 },
  windScale: 0.0,
  windDir: new THREE.Vector3(0, 0, 0),
  isIndoor: true,
  hazards: { vpsOn: true, windOn: false },
  setup() {
    // Gate 1: tilted +25 degrees (roll around z)
    const g1 = createFlightGate(0.0, 1.4, -5.0, 0, 1.3);
    g1.group.rotation.z = Math.PI / 7; // ~25 deg

    // Gate 2: tilted -25 degrees
    const g2 = createFlightGate(0.0, 1.6, -11.0, 0, 1.3);
    g2.group.rotation.z = -Math.PI / 7;

    // Gate 3: tilted +20 degrees at lower altitude
    const g3 = createFlightGate(0.0, 1.1, -17.0, 0, 1.3);
    g3.group.rotation.z = Math.PI / 9;

    setLevelGates([g1, g2, g3]);

    const pad = createLandingPad(0.0, -22.0, 0x00e676);
    setLevelLandingPad(pad);

    setMissions([
      { title: "COMPUERTA 1/4", desc: "Supera la Compuerta 1 inclinándote a estribor", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess(), hint: "Aplica un toque leve de Roll derecho para acomodar la envergadura del dron al ángulo." },
      { title: "COMPUERTA 2/4", desc: "Contrarresta e inclina a babor para la Compuerta 2", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Aplica Roll izquierdo antes de entrar. Mantén la velocidad suave." },
      { title: "COMPUERTA 3/4", desc: "Compuerta 3 baja con inclinación suave", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
      { title: "ESTABILIZAR 4/4", desc: "Nivela el dron por completo y aterriza seguro", target: pad.center, check: () => false, hint: "Asegúrate de regresar los mandos al centro para estabilizar el horizonte antes de tocar suelo." }
    ]);
  }
};

export default level;
