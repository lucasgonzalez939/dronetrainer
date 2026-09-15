/**
 * levels.js – Level definitions, loadLevel(), clearLevel().
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { scene } from './scene.js';
import {
  drone,
  levelObjects, setLevelObjects,
  obstacles,    setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates,   setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate,   setMovingGate,
  missions,     setMissions,
  currentMissionIdx, setCurrentMissionIdx,
  missionTimer, setMissionTimer,
  timerRunning, setTimerRunning,
  currentLevel, setCurrentLevel,
  windVector,   setWindVector,
  isFreestyleMode, setIsFreestyleMode
} from './state.js';
import { createFlightGate, createSlickZone, createLandingPad, checkGatePass } from './gates.js';
import { setFlightState } from './flightState.js';
import { FlightState } from './state.js';

const missionTitleEl = document.getElementById('mission-title');
const missionDescEl  = document.getElementById('mission-desc');
const missionTimerEl = document.getElementById('mission-timer');

export const LEVEL_DEFS = [
  // ----------------------------------------------------------------
  // NIVEL 1 – Iniciación
  // ----------------------------------------------------------------
  {
    name: "NIVEL 1",
    subtitle: "Vuelo de Iniciación",
    desc: "Aprende el despegue, los controles básicos y el aterrizaje de precisión.",
    objectives: [
      "Despega y atraviesa el Aro 1 a baja velocidad",
      "Cruza la zona celeste (VPS ciego) hacia el Aro 2",
      "Aterriza con suavidad en el helipuerto amarillo"
    ],
    windScale: 1.0,
    windDir: new THREE.Vector3(0.35, 0, 0.15),
    setup() {
      const g1 = createFlightGate(0, 1.2, -3.5, 0, 1.4);
      const g2 = createFlightGate(3.2, 1.4, -8.5, Math.PI/4, 1.4);
      setLevelGates([...levelGates, g1, g2]);

      setLevelSlickZones([...levelSlickZones, createSlickZone(0, -6, 5, 5)]);
      setLevelLandingPad(createLandingPad(0, -12));

      setMissions([
        {
          title: "MISIÓN 1 / 3",
          desc: "Despega y atraviesa lentamente el Aro 1",
          check: () => checkGatePass(g1, 0.4),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "MISIÓN 2 / 3",
          desc: "Cruza la zona celeste (¡El viento provocará deriva!) hacia el Aro 2",
          check: () => checkGatePass(g2, 0.4),
          onComplete: () => g2.setSuccess()
        },
        {
          title: "MISIÓN 3 / 3",
          desc: "Aterriza con suavidad en el helipuerto amarillo final",
          check: () => false
        }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 2 – Slalom Intermedio
  // ----------------------------------------------------------------
  {
    name: "NIVEL 2",
    subtitle: "Slalom Intermedio",
    desc: "Los aros están dispuestos en zigzag y el viento es más fuerte. Los aros son más pequeños.",
    objectives: [
      "Navega el slalom: Aro 1 → Aro 2 → Aro 3",
      "La zona VPS se extiende entre los aros 2 y 3",
      "Aterriza en el helipuerto rojo al fondo"
    ],
    windScale: 1.8,
    windDir: new THREE.Vector3(0.6, 0, 0.3),
    setup() {
      const g1 = createFlightGate( 0,   1.3, -4,    0,           1.2);
      const g2 = createFlightGate(-3.5, 1.5, -8,    Math.PI/6,   1.2);
      const g3 = createFlightGate( 3.0, 1.6, -13,  -Math.PI/6,   1.2);
      setLevelGates([...levelGates, g1, g2, g3]);

      setLevelSlickZones([...levelSlickZones, createSlickZone(-0.5, -10.5, 6, 5)]);
      setLevelLandingPad(createLandingPad(0, -18, 0xff3d00));

      const total = 4;
      setMissions([
        { title: `MISIÓN 1 / ${total}`, desc: "Atraviesa el Aro 1 (eje Z negativo)", check: () => checkGatePass(g1, 0.5), onComplete: () => g1.setSuccess() },
        { title: `MISIÓN 2 / ${total}`, desc: "Gira a la izquierda: Aro 2 al norte-oeste", check: () => checkGatePass(g2, 0.5), onComplete: () => g2.setSuccess() },
        { title: `MISIÓN 3 / ${total}`, desc: "Cruza la zona VPS y alcanza el Aro 3 (¡viento fuerte!)", check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess() },
        { title: `MISIÓN 4 / ${total}`, desc: "Aterriza en el helipuerto ROJO al fondo", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 3 – Altura Variable + Aro Móvil
  // ----------------------------------------------------------------
  {
    name: "NIVEL 3",
    subtitle: "Alturas Variables y Aro Móvil",
    desc: "Los aros están a diferentes alturas. El tercer aro se mueve lateralmente. El viento sopla con más intensidad.",
    objectives: [
      "Sube al Aro 1 (alto, 2.5 m)",
      "Baja al Aro 2 (bajo, 0.9 m) — cuidado con el suelo",
      "Intercepta el Aro 3 MÓVIL en movimiento",
      "Aterriza precisamente en el helipuerto azul"
    ],
    windScale: 2.2,
    windDir: new THREE.Vector3(0.5, 0, -0.2),
    setup() {
      const g1 = createFlightGate( 0,   2.5, -5,   0,         1.3);
      const g2 = createFlightGate(-2.5, 0.9, -10,  Math.PI/5, 1.3);
      const g3 = createFlightGate( 0,   1.8, -16,  0,         1.1);
      const g4 = createFlightGate( 2.0, 2.0, -22, -Math.PI/8, 1.2);
      setLevelGates([...levelGates, g1, g2, g3, g4]);
      setMovingGate(g3);

      setLevelSlickZones([
        ...levelSlickZones,
        createSlickZone(-1, -8,  5, 4),
        createSlickZone( 1, -19, 5, 4)
      ]);
      setLevelLandingPad(createLandingPad(0, -27, 0x1e88e5));

      const total = 5;
      setMissions([
        { title: `MISIÓN 1 / ${total}`, desc: "Sube y atraviesa el Aro 1 (2.5 m de altura)", check: () => checkGatePass(g1, 0.5), onComplete: () => g1.setSuccess() },
        { title: `MISIÓN 2 / ${total}`, desc: "Desciende rápido: Aro 2 está muy bajo (0.9 m)", check: () => checkGatePass(g2, 0.5), onComplete: () => g2.setSuccess() },
        { title: `MISIÓN 3 / ${total}`, desc: "⚡ El Aro 3 se mueve — ¡intercepta su trayectoria!", check: () => checkGatePass(g3, 0.6), onComplete: () => g3.setSuccess() },
        { title: `MISIÓN 4 / ${total}`, desc: "Atraviesa el Aro 4 final antes de aterrizar", check: () => checkGatePass(g4, 0.5), onComplete: () => g4.setSuccess() },
        { title: `MISIÓN 5 / ${total}`, desc: "Aterriza en el helipuerto AZUL con precisión", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 4 – Maestro del Viento
  // ----------------------------------------------------------------
  {
    name: "NIVEL 4",
    subtitle: "Maestro del Viento",
    desc: "Aros muy estrechos, viento huracanado, doble zona VPS y una ruta de precisión extrema.",
    objectives: [
      "5 aros estrechos (1.0 m) en formación tridimensional",
      "Doble zona VPS — el dron deriva sin corrección",
      "Viento fuerte cambiante: mantén el control",
      "Aterrizaje de precisión en helipuerto pequeño (0.5 m)"
    ],
    windScale: 3.0,
    windDir: new THREE.Vector3(0.9, 0, 0.5),
    setup() {
      const g1 = createFlightGate( 0,   1.5,  -4,   0,          1.0);
      const g2 = createFlightGate( 2.5, 2.2,  -8,   Math.PI/3,  1.0);
      const g3 = createFlightGate(-2.5, 1.0,  -13, -Math.PI/4,  1.0);
      const g4 = createFlightGate( 1.5, 2.8,  -18,  Math.PI/6,  1.0);
      const g5 = createFlightGate(-1.0, 1.5,  -23,  0,          1.0);
      setLevelGates([...levelGates, g1, g2, g3, g4, g5]);

      setLevelSlickZones([
        ...levelSlickZones,
        createSlickZone( 1.5, -6,  5, 4),
        createSlickZone(-1.0, -15, 5, 4)
      ]);

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.02, 32),
        new THREE.MeshStandardMaterial({ color: 0xab47bc, roughness: 0.3 })
      );
      pad.position.set(0, 0.01, -28);
      scene.add(pad);
      setLevelObjects([...levelObjects, pad]);
      pad._precisionRadius = 0.55;
      setLevelLandingPad(pad);

      const total = 6;
      setMissions([
        { title: `MISIÓN 1 / ${total}`, desc: "Aro estrecho 1 — control fino del yaw necesario", check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: `MISIÓN 2 / ${total}`, desc: "Aro 2 a la derecha — el viento empuja lateralmente", check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: `MISIÓN 3 / ${total}`, desc: "Aro 3 bajo y a la izquierda — zona VPS activa", check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: `MISIÓN 4 / ${total}`, desc: "Aro 4 elevado — segunda zona VPS a continuación", check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: `MISIÓN 5 / ${total}`, desc: "Aro 5 final — mantén la compostura", check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: `MISIÓN 6 / ${total}`, desc: "Aterriza en el helipuerto MORADO (pequeño — precisión máxima)", check: () => false }
      ]);
    }
  }
];

export function clearLevel() {
  levelObjects.forEach(obj => scene.remove(obj));
  setLevelObjects([]);
  setObstacles([]);
  setLevelSlickZones([]);
  setLevelGates([]);
  setLevelLandingPad(null);
  setMovingGate(null);
  setMissions([]);
}

export function loadLevel(idx) {
  clearLevel();
  setIsFreestyleMode(false);
  setCurrentLevel(idx);
  setCurrentMissionIdx(0);
  setMissionTimer(0);
  setTimerRunning(false);

  const def = LEVEL_DEFS[idx];
  setWindVector(def.windDir.clone().multiplyScalar(def.windScale));

  def.setup();

  document.getElementById('mission-hud').style.display    = 'block';
  document.getElementById('freestyle-hud').style.display  = 'none';
  document.getElementById('freestyle-panel').style.display = 'none';

  // missions is now set by def.setup() via setMissions
  const currentMissions = missions; // re-read after setup
  if (missionTitleEl) missionTitleEl.textContent = currentMissions[0].title;
  if (missionDescEl)  missionDescEl.textContent  = currentMissions[0].desc;
  if (missionTitleEl) missionTitleEl.style.color = '#ffca28';
  if (missionTimerEl) missionTimerEl.textContent = 'TIEMPO: 00:00.0';

  drone.pos.set(0, 0.02, 0);
  drone.vel.set(0, 0, 0);
  drone.yaw      = 0;
  drone.yawRate  = 0;
  drone.pitch    = 0;
  drone.roll     = 0;
  setFlightState(FlightState.LANDED);
}

export function updateMovingGate(elapsedTime) {
  if (!movingGate) return;
  const newX = Math.sin(elapsedTime * 0.7) * 3.5;
  movingGate.group.position.x = newX;
  movingGate.center.x = newX;

  movingGate.group.children.forEach(part => {
    part.updateWorldMatrix(true, false);
  });
  for (const colBox of obstacles) {
    if (movingGate.group.children.includes(colBox.mesh)) {
      colBox.box.setFromObject(colBox.mesh);
    }
  }
}
