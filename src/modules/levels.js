/**
 * levels.js – Complete 28-Level Flight Academy and Challenge Curriculum.
 *
 * Structure:
 * - Levels 0..17  (1..18): ACADEMIA DE VUELO (Pedagogical progression in 4 tiers)
 *   Tier 1 (Niveles 1-5): Fundamentos y Aislamiento de Ejes (Throttle, Pitch, Roll, Yaw, Box)
 *   Tier 2 (Niveles 6-9): Maniobras Coordinadas (Coordinated Box, Slalom, Figure-8, Orbit POI)
 *   Tier 3 (Niveles 10-13): Espacios Confinados en Hangar (Doorway, Racks, Mezzanine, Maze)
 *   Tier 4 (Niveles 14-18): Entorno y Emergencias (Crosswind, VPS Failure, Battery, Moving Gate, Master Exam)
 * - Levels 18..27 (Desafíos 1..10): MODO DESAFÍOS (Advanced missions & procedural auto-generated worlds)
 */

import * as THREE from './three.js';
import { scene, setEnvironmentMode } from './scene.js';
import { disposeObject } from './assets.js';
import {
  drone, DIFFICULTY,
  levelObjects, setLevelObjects,
  obstacles,    setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates,   setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate,   setMovingGate,
  movingObstacles, setMovingObstacles,
  softCheckpoints, setSoftCheckpoints,
  setActiveSoftCheckpointIdx, setActiveRespawnCheckpoint,
  missions,     setMissions,
  currentMissionIdx, setCurrentMissionIdx,
  missionTimer, setMissionTimer,
  timerRunning, setTimerRunning,
  currentLevel, setCurrentLevel,
  windVector,   setWindVector,
  isFreestyleMode, setIsFreestyleMode,
  setGateScores, setLevelStars, setHintRetries,
  setReplayBuffer, setReplaySample,
  batteryTimeLeft, setBatteryTimeLeft,
  batteryDepleted, setBatteryDepleted
} from './state.js';
import { updateBatteryBar } from './hud.js';
import { createFlightGate, createSlickZone, createLandingPad, checkGatePass,
         createSoftCheckpoint,
         createWaypoint, createInspectionTower, createGhostDrone } from './gates.js';
import { setFlightState } from './flightState.js';
import { FlightState } from './state.js';

const missionTitleEl = document.getElementById('mission-title');
const missionDescEl  = document.getElementById('mission-desc');
const missionTimerEl = document.getElementById('mission-timer');

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL GENERATORS (Unpredictable Worlds)
// ─────────────────────────────────────────────────────────────────────────────

function setupProceduralOutdoorCourse() {
  const gates = [];
  const gateCount = 7;
  for (let i = 0; i < gateCount; i++) {
    const gz = -4.0 - i * 3.8;
    const gx = (Math.random() - 0.5) * 5.5;
    const gy = 1.0 + Math.random() * 1.3;
    const rotY = (Math.random() - 0.5) * 0.5;
    const size = 1.1 + Math.random() * 0.2;
    const g = createFlightGate(gx, gy, gz, rotY, size);
    gates.push(g);
  }
  setLevelGates(gates);

  const padZ = -4.0 - gateCount * 3.8 - 2.5;
  const pad = createLandingPad(0, padZ, 0x00e5ff);
  setLevelLandingPad(pad);

  const total = gates.length + 1;
  const newMissions = gates.map((g, i) => ({
    title: `PUERTA ${i + 1} / ${total}`,
    desc: `Atraviesa el aro procedural ${i + 1} (Alt: ${g.center.y.toFixed(1)}m)`,
    target: g.center,
    check: () => checkGatePass(g, 0.45),
    onComplete: () => g.setSuccess(),
    hint: "Mantén velocidad constante y alinea el rumbo con el compás."
  }));

  newMissions.push({
    title: `META / ${total}`,
    desc: "Aterriza en el helipuerto azul final",
    target: pad.center,
    check: () => false
  });

  setMissions(newMissions);
}

function setupProceduralIndoorWarehouse() {
  const gates = [];
  const gateCount = 6;
  const newObjects = [...levelObjects];
  const newObstacles = [...obstacles];

  // Procedural storage crates / shelves
  for (let i = 0; i < 4; i++) {
    const rx = (Math.random() - 0.5) * 7.5;
    const rz = -8.0 - i * 5.0;
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.2, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x455a64 })
    );
    rack.position.set(rx, 1.1, rz);
    scene.add(rack);
    newObjects.push(rack);
    rack.updateWorldMatrix(true, false);
    newObstacles.push({ box: new THREE.Box3().setFromObject(rack), mesh: rack });
  }
  setLevelObjects(newObjects);
  setObstacles(newObstacles);

  for (let i = 0; i < gateCount; i++) {
    const gz = -5.0 - i * 4.2;
    const gx = (Math.sin(i * 1.4) * 2.6) + (Math.random() - 0.5) * 1.0;
    const gy = 1.1 + (i % 2) * 0.8;
    const rotY = (Math.random() - 0.5) * 0.4;
    const g = createFlightGate(gx, gy, gz, rotY, 1.05);
    gates.push(g);
  }
  setLevelGates(gates);

  const pad = createLandingPad(0, -5.0 - gateCount * 4.2 - 2.5, 0xff7043);
  setLevelLandingPad(pad);

  const total = gates.length + 1;
  const newMissions = gates.map((g, i) => ({
    title: `ALMACÉN ${i + 1} / ${total}`,
    desc: `Cruza el aro ${i + 1} entre las estanterías (Alt: ${g.center.y.toFixed(1)}m)`,
    target: g.center,
    check: () => checkGatePass(g, 0.45),
    onComplete: () => g.setSuccess(),
    hint: "Ten cuidado con los racks industriales a los lados."
  }));

  newMissions.push({
    title: `FINAL / ${total}`,
    desc: "Aterriza en la zona naranja de descarga",
    target: pad.center,
    check: () => false
  });

  setMissions(newMissions);
}

function setupProceduralStormCourse() {
  const gates = [];
  const gateCount = 6;

  // Randomized wind
  const wAngle = Math.random() * Math.PI * 2;
  const wForce = 2.5 + Math.random() * 1.5;
  const wVec = new THREE.Vector3(Math.cos(wAngle), 0, Math.sin(wAngle)).multiplyScalar(wForce);
  setWindVector(wVec);

  // Random slick zones
  const slickZones = [
    createSlickZone((Math.random() - 0.5) * 4, -10, 5, 6),
    createSlickZone((Math.random() - 0.5) * 4, -18, 5, 6)
  ];
  setLevelSlickZones(slickZones);

  for (let i = 0; i < gateCount; i++) {
    const gz = -4.5 - i * 4.0;
    const gx = (Math.random() - 0.5) * 5.0;
    const gy = 1.0 + Math.random() * 1.4;
    const rotY = (Math.random() - 0.5) * 0.5;
    const g = createFlightGate(gx, gy, gz, rotY, 1.15);
    gates.push(g);
  }
  setLevelGates(gates);

  const pad = createLandingPad(0, -4.5 - gateCount * 4.0 - 2.5, 0xef5350);
  setLevelLandingPad(pad);

  const total = gates.length + 1;
  const newMissions = gates.map((g, i) => ({
    title: `TORMENTA ${i + 1} / ${total}`,
    desc: `Compensa la deriva de viento y cruza el Aro ${i + 1}`,
    target: g.center,
    check: () => checkGatePass(g, 0.45),
    onComplete: () => g.setSuccess(),
    hint: "La ráfaga de viento cambia de ángulo; observa el indicador ámbar en el HUD."
  }));

  newMissions.push({
    title: `EMERGENCIA / ${total}`,
    desc: "¡Aterrizaje forzoso en la zona de evacuación!",
    target: pad.center,
    check: () => false
  });

  setMissions(newMissions);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const LEVEL_DEFS = [
  // ===========================================================================
  // FASE 1: FUNDAMENTOS Y CONTROL DE EJES (Niveles 1 al 5)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // NIVEL 1 – Altura y Toma de Contacto (Throttle)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 1",
    subtitle: "Altura y Toma de Contacto",
    desc: "Aprende a controlar la altitud vertical (Throttle) y realizar un aterrizaje suave y controlado.",
    objectives: [
      "Despega con suavidad y atraviesa el Aro 1 a 1.2 m de altura",
      "Asciende gradualmente y cruza el Aro 2 a 1.8 m",
      "Desciende despacio y aterriza en el helipuerto verde"
    ],
    medalTimes: { gold: 18, silver: 28, bronze: 42 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0, 1.2, -3.5, 0, 1.5);
      const g2 = createFlightGate(0, 1.8, -7.5, 0, 1.5);
      setLevelGates([g1, g2]);

      const pad = createLandingPad(0, -11.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 3",
          desc: "Despega y atraviesa lentamente el Aro 1 (1.2m)",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess(),
          hint: "Usa pulsaciones cortas de acelerador para estabilizar la altitud."
        },
        {
          title: "MISIÓN 2 / 3",
          desc: "Asciende y cruza el Aro 2 (1.8m)",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess(),
          hint: "Sube poco a poco; no des acelerador a fondo."
        },
        {
          title: "MISIÓN 3 / 3",
          desc: "Desciende con calma y aterriza en el helipuerto verde",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 2 – Avance y Retroceso Lineal (Pitch)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 2",
    subtitle: "Avance y Retroceso Lineal",
    desc: "Domina el eje longitudinal (Pitch). Aprende a acelerar hacia adelante, detenerte en estacionario y frenar marcha atrás.",
    objectives: [
      "Avanza en línea recta atravesando los Aros 1, 2 y 3 manteniendo 1.4m",
      "Detente en el punto de espera",
      "Regresa marcha atrás y aterriza en el helipuerto de origen"
    ],
    medalTimes: { gold: 24, silver: 35, bronze: 50 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0, 1.4, -4.0,  0, 1.3);
      const g2 = createFlightGate(0, 1.4, -9.0,  0, 1.3);
      const g3 = createFlightGate(0, 1.4, -14.0, 0, 1.3);
      setLevelGates([g1, g2, g3]);

      const wTurn = createWaypoint(0, 1.4, -17.5, 0x00e5ff, 0.5);
      const pad = createLandingPad(0, 0, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 5",
          desc: "Avanza hacia adelante a través del Aro 1",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "MISIÓN 2 / 5",
          desc: "Mantén velocidad constante y cruza el Aro 2",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess()
        },
        {
          title: "MISIÓN 3 / 5",
          desc: "Cruza el Aro 3 final",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess()
        },
        {
          title: "MISIÓN 4 / 5",
          desc: "Frena y toca el punto de espera para iniciar retorno",
          target: wTurn.center,
          check: () => wTurn.check(),
          onComplete: () => wTurn.setSuccess(),
          hint: "Tira suavemente de la palanca derecha hacia ti para frenar el avance."
        },
        {
          title: "MISIÓN 5 / 5",
          desc: "Regresa marcha atrás y aterriza en el helipuerto de salida",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 3 – Desplazamiento Lateral (Roll)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 3",
    subtitle: "Desplazamiento Lateral",
    desc: "Aprende el movimiento lateral puro (Roll) sin alterar el rumbo del dron.",
    objectives: [
      "Cruza el Aro central 1",
      "Desplázate a la derecha para cruzar el Aro 2 (sin girar el rumbo)",
      "Desplázate a la izquierda para cruzar el Aro 3",
      "Centra el dron y aterriza en la plataforma"
    ],
    medalTimes: { gold: 26, silver: 38, bronze: 55 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -3.5, 0, 1.3);
      const g2 = createFlightGate( 3.2, 1.3, -8.0, 0, 1.3);
      const g3 = createFlightGate(-3.2, 1.3, -12.5, 0, 1.3);
      setLevelGates([g1, g2, g3]);

      const pad = createLandingPad(0, -16.5, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 4",
          desc: "Avanza y cruza el Aro 1",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "MISIÓN 2 / 4",
          desc: "Desplázate a la derecha hacia el Aro 2 (mantén rumbo al norte)",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess(),
          hint: "No gires la palanca de dirección; empuja la palanca derecha lateralmente."
        },
        {
          title: "MISIÓN 3 / 4",
          desc: "Desplázate a la izquierda hacia el Aro 3",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess()
        },
        {
          title: "MISIÓN 4 / 4",
          desc: "Centra el vuelo y aterriza en el helipuerto azul",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 4 – Control de Rumbo y Giro (Yaw)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 4",
    subtitle: "Control de Rumbo y Giro",
    desc: "Aprende a rotar sobre el propio eje (Yaw), alinear la brújula y mantener el control al cambiar de perspectiva.",
    objectives: [
      "Alinea rumbo Norte y toca el marcador 1",
      "Gira 90° a la derecha (Este) hacia el marcador 2",
      "Gira 180° hacia el Sur (mirando al piloto) hacia el marcador 3",
      "Aterriza en el helipuerto central"
    ],
    medalTimes: { gold: 28, silver: 40, bronze: 60 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const wN = createWaypoint( 0.0, 1.3, -4.5, 0x00e676, 0.5);
      const wE = createWaypoint( 4.5, 1.3, -4.5, 0x00e5ff, 0.5);
      const wS = createWaypoint( 4.5, 1.3,  0.0, 0xffca28, 0.5);

      const pad = createLandingPad(0, -2.0, 0xff7043);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "MISIÓN 1 / 4",
          desc: "Avanza hacia el marcador verde al Norte",
          target: wN.center,
          check: () => wN.check(),
          onComplete: () => wN.setSuccess(),
          hint: "Observa la brújula del HUD en la esquina para guiarte."
        },
        {
          title: "MISIÓN 2 / 4",
          desc: "Gira 90° a la derecha (rumbo Este 90°) hacia el marcador azul",
          target: wE.center,
          check: () => wE.check(),
          onComplete: () => wE.setSuccess(),
          hint: "Usa la palanca izquierda (Yaw) para orientar el morro hacia el objetivo."
        },
        {
          title: "MISIÓN 3 / 4",
          desc: "Gira hacia el Sur (180°, mirando hacia ti) hacia el marcador amarillo",
          target: wS.center,
          check: () => wS.check(),
          onComplete: () => wS.setSuccess()
        },
        {
          title: "MISIÓN 4 / 4",
          desc: "Aterriza en la plataforma naranja",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 5 – La Caja Translacional (Pitch + Roll)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 5",
    subtitle: "La Caja Translacional",
    desc: "Vuela el perímetro de un cuadrado manteniendo siempre el morro mirando al frente (Norte).",
    objectives: [
      "Vértice 1: Avanza 5 metros al frente",
      "Vértice 2: Desplázate a la derecha 4 metros",
      "Vértice 3: Retrocede 5 metros",
      "Vértice 4: Desplázate a la izquierda y aterriza"
    ],
    medalTimes: { gold: 30, silver: 45, bronze: 65 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.4, -5.5, 0, 1.3);
      const g2 = createFlightGate(4.2, 1.4, -5.5, Math.PI / 2, 1.3);
      const g3 = createFlightGate(4.2, 1.4, -1.2, 0, 1.3);
      setLevelGates([g1, g2, g3]);

      const pad = createLandingPad(0, -1.2, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "ESQUINA 1 / 4",
          desc: "Avanza recto al frente a través del Aro 1",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "ESQUINA 2 / 4",
          desc: "Desplázate a la derecha a través del Aro 2 (sin girar Yaw)",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess(),
          hint: "Mantén el morro apuntando al Norte en todo momento."
        },
        {
          title: "ESQUINA 3 / 4",
          desc: "Retrocede hacia el Aro 3",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess()
        },
        {
          title: "ESQUINA 4 / 4",
          desc: "Desplázate a la izquierda y aterriza en el helipuerto",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  },

  // ===========================================================================
  // FASE 2: MANIOBRAS COORDINADAS Y PRECISIÓN (Niveles 6 al 9)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // NIVEL 6 – El Cuadrado Orientado (Pitch + Yaw)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 6",
    subtitle: "El Cuadrado Orientado",
    desc: "Recorre el cuadrado girando el morro del dron en cada esquina hacia la dirección del vuelo.",
    objectives: [
      "Aro 1: Avanza encarando al Norte",
      "Aro 2: Gira 90° derecha encarando al Este",
      "Aro 3: Gira 90° derecha encarando al Sur (¡mandos invertidos!)",
      "Aro 4: Gira 90° derecha encarando al Oeste y aterriza"
    ],
    medalTimes: { gold: 32, silver: 46, bronze: 68 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.4, -5.5, 0, 1.25);
      const g2 = createFlightGate( 4.5, 1.4, -5.5, Math.PI / 2, 1.25);
      const g3 = createFlightGate( 4.5, 1.4, -1.0, Math.PI, 1.25);
      const g4 = createFlightGate( 0.0, 1.4, -1.0, -Math.PI / 2, 1.25);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -3.2, 0xffca28);
      setLevelLandingPad(pad);

      setMissions([
        {
          title: "TRAMO 1 / 5",
          desc: "Avanza hacia el Aro 1 encarando al Norte",
          target: g1.center,
          check: () => checkGatePass(g1, 0.45),
          onComplete: () => g1.setSuccess()
        },
        {
          title: "TRAMO 2 / 5",
          desc: "Gira a la derecha y encara el Aro 2 al Este",
          target: g2.center,
          check: () => checkGatePass(g2, 0.45),
          onComplete: () => g2.setSuccess()
        },
        {
          title: "TRAMO 3 / 5",
          desc: "Gira al Sur hacia el Aro 3 (mirando hacia el piloto)",
          target: g3.center,
          check: () => checkGatePass(g3, 0.45),
          onComplete: () => g3.setSuccess(),
          hint: "Cuando el dron viene hacia ti, tus mandos de izquierda/derecha se invierten."
        },
        {
          title: "TRAMO 4 / 5",
          desc: "Gira al Oeste y cruza el Aro 4",
          target: g4.center,
          check: () => checkGatePass(g4, 0.45),
          onComplete: () => g4.setSuccess()
        },
        {
          title: "TRAMO 5 / 5",
          desc: "Gira y aterriza en el helipuerto amarillo central",
          target: pad.center,
          check: () => false
        }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 7 – Slalom Continuo
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 7",
    subtitle: "Slalom Continuo",
    desc: "Desarrolla anticipación y fluidez coordinando virajes continuos en 'S' entre 5 aros.",
    objectives: [
      "Cruza el Aro 1 central",
      "Vira a la izquierda al Aro 2",
      "Contravira a la derecha al Aro 3",
      "Curva a la izquierda al Aro 4 y cruza el Aro 5 final"
    ],
    medalTimes: { gold: 25, silver: 36, bronze: 52 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.0,  0,           1.2);
      const g2 = createFlightGate(-2.6, 1.4, -8.5,  Math.PI / 6, 1.2);
      const g3 = createFlightGate( 2.6, 1.4, -13.5, -Math.PI / 6, 1.2);
      const g4 = createFlightGate(-2.2, 1.4, -18.5, Math.PI / 7, 1.2);
      const g5 = createFlightGate( 0.0, 1.3, -23.0, 0,           1.2);
      setLevelGates([g1, g2, g3, g4, g5]);

      const pad = createLandingPad(0, -27.0, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "SLALOM 1 / 6", desc: "Aro 1 central — inicia con velocidad controlada", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "SLALOM 2 / 6", desc: "Aro 2 a la izquierda — coordina Yaw y Roll", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Inicia el viraje antes de rebasar el aro anterior." },
        { title: "SLALOM 3 / 6", desc: "Aro 3 a la derecha — cambio fluido de peso", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "SLALOM 4 / 6", desc: "Aro 4 a la izquierda — mantén altitud constante", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "SLALOM 5 / 6", desc: "Aro 5 final — estabiliza el rumbo", target: g5.center, check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: "SLALOM 6 / 6", desc: "Aterriza con precisión en el helipuerto azul", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 8 – La Figura en 8 (El Infinito)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 8",
    subtitle: "La Figura en 8 (El Infinito)",
    desc: "La prueba clásica de evaluación de pilotos: dos bucles de 360° en sentidos opuestos con virajes suaves continuos.",
    objectives: [
      "Pasa el aro central de intersección",
      "Completa el bucle derecho en sentido horario",
      "Cruza nuevamente el aro central",
      "Completa el bucle izquierdo en sentido antihorario y aterriza"
    ],
    medalTimes: { gold: 36, silver: 50, bronze: 70 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const gC1 = createFlightGate(0.0, 1.4, -6.0, 0, 1.3);
      const gR1 = createFlightGate(3.8, 1.4, -9.0, Math.PI / 4, 1.2);
      const gR2 = createFlightGate(3.8, 1.4, -14.0, -Math.PI / 4, 1.2);
      const gC2 = createFlightGate(0.0, 1.4, -17.0, 0, 1.3);
      const gL1 = createFlightGate(-3.8, 1.4, -14.0, Math.PI / 4, 1.2);
      const gL2 = createFlightGate(-3.8, 1.4, -9.0, -Math.PI / 4, 1.2);
      setLevelGates([gC1, gR1, gR2, gC2, gL1, gL2]);

      const pad = createLandingPad(0, -6.0, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "FIGURA 8 (1/7)", desc: "Entrada por el aro central 1", target: gC1.center, check: () => checkGatePass(gC1, 0.45), onComplete: () => gC1.setSuccess() },
        { title: "FIGURA 8 (2/7)", desc: "Inicia el bucle derecho por el Aro 2", target: gR1.center, check: () => checkGatePass(gR1, 0.45), onComplete: () => gR1.setSuccess(), hint: "Coordina Yaw y Roll hacia la derecha simultáneamente." },
        { title: "FIGURA 8 (3/7)", desc: "Cierra la curva derecha por el Aro 3", target: gR2.center, check: () => checkGatePass(gR2, 0.45), onComplete: () => gR2.setSuccess() },
        { title: "FIGURA 8 (4/7)", desc: "Cruce central por el Aro 4", target: gC2.center, check: () => checkGatePass(gC2, 0.45), onComplete: () => gC2.setSuccess() },
        { title: "FIGURA 8 (5/7)", desc: "Inicia el bucle izquierdo por el Aro 5", target: gL1.center, check: () => checkGatePass(gL1, 0.45), onComplete: () => gL1.setSuccess() },
        { title: "FIGURA 8 (6/7)", desc: "Cierra la curva izquierda por el Aro 6", target: gL2.center, check: () => checkGatePass(gL2, 0.45), onComplete: () => gL2.setSuccess() },
        { title: "FIGURA 8 (7/7)", desc: "Aterriza en el helipuerto verde central", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 9 – Órbita de Inspección 360° (POI)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 9",
    subtitle: "Órbita de Inspección 360°",
    desc: "Aprende a orbitar un Punto de Interés (POI) manteniendo siempre el morro y la cámara apuntando hacia la torre central.",
    objectives: [
      "Avanza al punto de inicio de la órbita",
      "Orbita los 4 cuadrantes manteniendo la torre centrada en cámara",
      "Sal de la órbita y aterriza con precisión"
    ],
    medalTimes: { gold: 34, silver: 48, bronze: 68 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      createInspectionTower(0, -11.0, 5.0);

      const r = 3.6;
      const cz = -11.0;
      const w1 = createWaypoint( 0.0, 1.4, cz + r, 0x00e5ff, 0.5); // South of tower
      const w2 = createWaypoint(   r, 1.4, cz,     0x00e5ff, 0.5); // East
      const w3 = createWaypoint( 0.0, 1.4, cz - r, 0x00e5ff, 0.5); // North
      const w4 = createWaypoint(  -r, 1.4, cz,     0x00e5ff, 0.5); // West

      const pad = createLandingPad(0, -18.5, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        { title: "ÓRBITA 1 / 5", desc: "Avanza al punto Sur de la torre", target: w1.center, check: () => w1.check(), onComplete: () => w1.setSuccess() },
        { title: "ÓRBITA 2 / 5", desc: "Orbita hacia el Este manteniendo la torre en el centro", target: w2.center, check: () => w2.check(), onComplete: () => w2.setSuccess(), hint: "Aplica Roll a la derecha y rota Yaw suavemente a la izquierda hacia la torre." },
        { title: "ÓRBITA 3 / 5", desc: "Continúa la órbita hacia el punto Norte", target: w3.center, check: () => w3.check(), onComplete: () => w3.setSuccess() },
        { title: "ÓRBITA 4 / 5", desc: "Completa el giro en el punto Oeste", target: w4.center, check: () => w4.check(), onComplete: () => w4.setSuccess() },
        { title: "ÓRBITA 5 / 5", desc: "Sal de la órbita y aterriza en el helipuerto amarillo", target: pad.center, check: () => false }
      ]);
    }
  },

  // ===========================================================================
  // FASE 3: ESPACIOS CONFINADOS EN HANGAR (Niveles 10 al 13)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // NIVEL 10 – Entrada al Hangar
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 10",
    subtitle: "Entrada al Hangar",
    desc: "Primer vuelo en espacio cerrado. Controla el efecto suelo cerca del piso y respeta la altura máxima del techo.",
    isIndoor: true,
    objectives: [
      "Cruza el Aro 1 de aproximación exterior",
      "Pasa la compuerta de acceso baja a 1.2 m sin tocar el marco",
      "Estabiliza dentro de la nave y aterriza en el helipuerto interior"
    ],
    medalTimes: { gold: 20, silver: 30, bronze: 44 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.3, -3.5, 0, 1.3);
      const gDoor = createFlightGate(0.0, 1.2, -8.0, 0, 1.1);
      const g2 = createFlightGate(0.0, 1.4, -13.0, 0, 1.3);
      setLevelGates([g1, gDoor, g2]);

      const pad = createLandingPad(0, -17.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "ENTRADA 1 / 4", desc: "Alinea la trayectoria con el Aro 1", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "ENTRADA 2 / 4", desc: "Cruza la compuerta estrecha (cuidado con el techo)", target: gDoor.center, check: () => checkGatePass(gDoor, 0.4), onComplete: () => gDoor.setSuccess(), hint: "Mantén el acelerador estable a media altura para no golpear el dintel." },
        { title: "ENTRADA 3 / 4", desc: "Avanza por el pasillo central del hangar", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "ENTRADA 4 / 4", desc: "Aterriza en el helipuerto interior verde", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 11 – Pasillos y Estanterías
  // ---------------------------------------------------------------------------
  {
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
  },

  // ---------------------------------------------------------------------------
  // NIVEL 12 – Atrio Vertical: Cambio de Planta
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 12",
    subtitle: "Atrio Vertical: Cambio de Planta",
    desc: "Asciende con precisión a un altillo superior a 2.8m, cruza la plataforma elevada y desciende sin generar turbulencia.",
    isIndoor: true,
    objectives: [
      "Cruza el Aro 1 inferior",
      "Asciende por el hueco del altillo y cruza el Aro 2 (2.8m)",
      "Avanza por la pasarela superior",
      "Desciende controladamente y aterriza en la planta baja"
    ],
    medalTimes: { gold: 28, silver: 40, bronze: 58 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.2, -4.5, 0, 1.2);
      const g2 = createFlightGate( 0.0, 2.7, -9.0, 0, 1.2);
      const g3 = createFlightGate( 2.2, 2.7, -13.5, -Math.PI / 8, 1.15);
      const g4 = createFlightGate( 0.0, 1.3, -18.0, 0, 1.2);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -22.5, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "ATRIO 1 / 5", desc: "Aro 1 a baja altura", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "ATRIO 2 / 5", desc: "Sube con acelerador firme al Aro 2 superior (2.7m)", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Asegúrate de no chocar con las cerchas del techo." },
        { title: "ATRIO 3 / 5", desc: "Aro 3 en el altillo superior", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "ATRIO 4 / 5", desc: "Desciende despacio hacia el Aro 4 inferior", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess(), hint: "Desciende suave; una caída rápida genera turbulencia de propelas (propwash)." },
        { title: "ATRIO 5 / 5", desc: "Aterriza en el helipuerto azul de la planta baja", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 13 – Laberinto de Precisión
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 13",
    subtitle: "Laberinto de Precisión",
    desc: "Vuelo en espacio confinado con aros estrechos. El punto de control intermedio guarda tu avance en caso de rozar una pared.",
    isIndoor: true,
    objectives: [
      "Cruza los Aros estrechos 1 y 2",
      "Activa el checkpoint de seguridad intermedio",
      "Cruza los Aros 3 y 4",
      "Aterriza en la zona verde de precisión"
    ],
    medalTimes: { gold: 34, silver: 48, bronze: 68 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.2, -4.5, 0, 1.05);
      const g2 = createFlightGate(-2.5, 1.3, -8.5, Math.PI / 7, 1.05);
      const cp = createSoftCheckpoint(0.0, 1.3, -12.5, 0, 1.1);
      const g3 = createFlightGate( 2.5, 1.3, -16.5, -Math.PI / 7, 1.05);
      const g4 = createFlightGate( 0.0, 1.2, -21.0, 0, 1.05);
      setLevelGates([g1, g2, g3, g4]);
      setSoftCheckpoints([cp]);

      const pad = createLandingPad(0, -25.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "LABERINTO 1 / 5", desc: "Aro estrecho 1 de entrada", target: g1.center, check: () => checkGatePass(g1, 0.4), onComplete: () => g1.setSuccess() },
        { title: "LABERINTO 2 / 5", desc: "Aro estrecho 2 en curva izquierda", target: g2.center, check: () => checkGatePass(g2, 0.4), onComplete: () => g2.setSuccess() },
        { title: "CHECKPOINT", desc: "Pasa por el anillo azul para guardar punto de reaparición", target: cp.center, check: () => cp.check(), onComplete: () => cp.setActivated(), hint: "Si colisionas más adelante, reaparecerás en este punto." },
        { title: "LABERINTO 3 / 5", desc: "Aro estrecho 3 en curva derecha", target: g3.center, check: () => checkGatePass(g3, 0.4), onComplete: () => g3.setSuccess() },
        { title: "LABERINTO 4 / 5", desc: "Aro 4 de salida y alineación", target: g4.center, check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
        { title: "LABERINTO 5 / 5", desc: "Aterriza en la plataforma verde", target: pad.center, check: () => false }
      ]);
    }
  },

  // ===========================================================================
  // FASE 4: FACTORES AMBIENTALES Y EMERGENCIAS (Niveles 14 al 18)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // NIVEL 14 – Viento Cruzado y Deriva
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 14",
    subtitle: "Viento Cruzado y Deriva",
    desc: "Viento lateral constante. Aprende a orientar la nariz contra el viento (ángulo de cangrejo) para mantener la trayectoria recta.",
    objectives: [
      "Navega en línea recta a pesar del empuje del viento lateral",
      "Cruza los Aros 1, 2 y 3 alineados",
      "Compensa la deriva durante la aproximación final y aterriza"
    ],
    medalTimes: { gold: 25, silver: 36, bronze: 52 },
    windScale: 2.2,
    windDir: new THREE.Vector3(0.85, 0, 0.15),
    hazards: { vpsOn: true, windOn: true, windStrength: 2.2 },
    setup() {
      const g1 = createFlightGate(0.0, 1.3, -4.5, 0, 1.25);
      const g2 = createFlightGate(0.0, 1.4, -9.5, 0, 1.2);
      const g3 = createFlightGate(0.0, 1.4, -14.5, 0, 1.2);
      const g4 = createFlightGate(0.0, 1.3, -19.5, 0, 1.2);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -24.0, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        { title: "DERIVA 1 / 5", desc: "Aro 1 — siente el empuje del viento lateral", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "DERIVA 2 / 5", desc: "Aro 2 — inclina el Roll ligeramente contra el viento", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Apunta la nariz levemente hacia el origen del viento para contrarrestar el arrastre." },
        { title: "DERIVA 3 / 5", desc: "Aro 3 — mantén la línea recta", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "DERIVA 4 / 5", desc: "Aro 4 — prepárate para aterrizar", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "DERIVA 5 / 5", desc: "Aterriza en el helipuerto amarillo compensando la deriva", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 15 – Falla de Sensores VPS (Suelo Reflectante)
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 15",
    subtitle: "Pérdida de VPS: Modo Manual Puro",
    desc: "En las zonas celestes los sensores de flujo óptico fallan. El dron no frena al soltar el stick; debes frenar activamente.",
    objectives: [
      "Cruza el Aro 1 con VPS activo",
      "Entra en la zona celeste (VPS ciego) y frena manualmente antes del Aro 2",
      "Cruza el Aro 3 bajo deriva inercial",
      "Aterriza en el helipuerto rojo con control manual estricto"
    ],
    medalTimes: { gold: 28, silver: 40, bronze: 60 },
    windScale: 1.2,
    windDir: new THREE.Vector3(0.4, 0, 0.2),
    hazards: { vpsOn: true, windOn: true, windStrength: 1.2 },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.0, 0, 1.25);
      const g2 = createFlightGate(-2.5, 1.3, -9.5, Math.PI / 8, 1.2);
      const g3 = createFlightGate( 2.5, 1.3, -15.5, -Math.PI / 8, 1.2);
      setLevelGates([g1, g2, g3]);

      // Extensive slick zone where optical flow is blind
      setLevelSlickZones([createSlickZone(0, -12.5, 8, 14)]);

      const pad = createLandingPad(0, -21.0, 0xff3d00);
      setLevelLandingPad(pad);

      setMissions([
        { title: "VPS 1 / 4", desc: "Aro 1 — vuelo normal con asistencia activa", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "VPS 2 / 4", desc: "Entra a la zona celeste: ¡El dron NO frena solo!", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess(), hint: "Tira la palanca en sentido contrario para frenar la inercia manualmente." },
        { title: "VPS 3 / 4", desc: "Cruza hacia el Aro 3 controlando la deriva", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "VPS 4 / 4", desc: "Aterriza con suavidad en el helipuerto rojo", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 16 – Gestión Crítica de Batería: Búsqueda y Rescate
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 16",
    subtitle: "Gestión Crítica de Batería",
    desc: "Misión de rescate con batería limitada (75 segundos). Localiza 4 puntos de víctimas optimizando la ruta sin perder tiempo.",
    objectives: [
      "Localiza a los 4 supervivientes en la zona de escombros",
      "Vuela de forma eficiente: frenar y acelerar bruscamente agota el tiempo",
      "Aterriza en la zona de evacuación antes de que se agote la batería"
    ],
    medalTimes: { gold: 38, silver: 52, bronze: 70 },
    windScale: 1.0,
    windDir: new THREE.Vector3(0.3, 0, 0.1),
    hazards: { batteryOn: true, batteryTime: 75, windOn: true, windStrength: 1.0, vpsOn: true },
    setup() {
      const w1 = createWaypoint(-2.5, 1.2, -5.0,  0x00e676);
      const w2 = createWaypoint( 3.2, 1.4, -10.0, 0x00e676);
      const w3 = createWaypoint(-3.0, 1.1, -15.5, 0x00e676);
      const w4 = createWaypoint( 1.5, 1.5, -21.0, 0x00e676);

      createGhostDrone(1.2, 1.4, -7.0);
      createGhostDrone(-2.8, 1.0, -13.0);

      const pad = createLandingPad(0, -26.0, 0xef5350);
      setLevelLandingPad(pad);

      setMissions([
        { title: "RESCATE 1 / 5", desc: "Sobrevuela el superviviente 1 a la izquierda", target: w1.center, check: () => w1.check(), onComplete: () => w1.setSuccess(), hint: "Pasa a menos de 0.4m del marcador verde." },
        { title: "RESCATE 2 / 5", desc: "Punto 2 a la derecha — traza una trayectoria directa", target: w2.center, check: () => w2.check(), onComplete: () => w2.setSuccess() },
        { title: "RESCATE 3 / 5", desc: "Punto 3 — vuela bajo entre los escombros", target: w3.center, check: () => w3.check(), onComplete: () => w3.setSuccess() },
        { title: "RESCATE 4 / 5", desc: "Último superviviente — ¡cuida el nivel de batería!", target: w4.center, check: () => w4.check(), onComplete: () => w4.setSuccess() },
        { title: "RESCATE 5 / 5", desc: "¡Aterriza en la zona de evacuación roja!", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 17 – Aro Móvil Dinámico
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 17",
    subtitle: "Aro Móvil Dinámico",
    desc: "Un aro se desplaza lateralmente a velocidad armónica continua. Aprende a calcular el punto de intercepción.",
    objectives: [
      "Cruza el Aro 1 de entrada",
      "Calcula la trayectoria del Aro 2 móvil e intercéptalo",
      "Cruza el Aro 3 final y aterriza"
    ],
    medalTimes: { gold: 26, silver: 38, bronze: 56 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.4, -5.0, 0, 1.3);
      const gMove = createFlightGate(0.0, 1.5, -11.0, 0, 1.4);
      gMove.speed = 0.8;
      gMove.amplitude = 3.2;
      setMovingGate(gMove);

      const g3 = createFlightGate(0.0, 1.4, -17.0, 0, 1.25);
      setLevelGates([g1, gMove, g3]);

      const pad = createLandingPad(0, -22.0, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "INTERCEPCIÓN 1 / 4", desc: "Aro 1 estático de aproximación", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "INTERCEPCIÓN 2 / 4", desc: "⚡ ¡El Aro 2 se mueve lateralmente! Intercepta su paso", target: gMove.center, check: () => checkGatePass(gMove, 0.55), onComplete: () => gMove.setSuccess(), hint: "No persigas el aro: apunta al punto donde va a estar en 1 segundo." },
        { title: "INTERCEPCIÓN 3 / 4", desc: "Cruza el Aro 3 de estabilización", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "INTERCEPCIÓN 4 / 4", desc: "Aterriza con suavidad en el helipuerto azul", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // NIVEL 18 – Examen de Graduación: Piloto de Élite
  // ---------------------------------------------------------------------------
  {
    name: "NIVEL 18",
    subtitle: "Examen de Graduación",
    desc: "El circuito maestro de certificación: despegue exterior con viento, slalom, compuerta estrecha de entrada al hangar, órbita interior y aterrizaje de precisión.",
    isIndoor: false,
    objectives: [
      "Supera el tramo exterior compensando el viento cruzado",
      "Pasa la compuerta baja de acceso al hangar",
      "Navega el circuito interior entre columnas",
      "Aterriza con precisión máxima para obtener tu licencia de piloto"
    ],
    medalTimes: { gold: 45, silver: 62, bronze: 85 },
    windScale: 1.6,
    windDir: new THREE.Vector3(0.5, 0, 0.2),
    hazards: { vpsOn: true, windOn: true, windStrength: 1.6 },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.5, 0, 1.2);
      const g2 = createFlightGate(-2.5, 1.4, -9.0, Math.PI / 8, 1.15);
      const g3 = createFlightGate( 2.5, 1.4, -14.0, -Math.PI / 8, 1.15);
      const gGate = createFlightGate(0.0, 1.2, -19.0, 0, 1.05); // Entry gate
      const cp = createSoftCheckpoint(0.0, 1.3, -22.5, 0, 1.1);
      const g4 = createFlightGate(-1.8, 1.3, -26.5, Math.PI / 8, 1.1);
      const g5 = createFlightGate( 0.0, 1.4, -31.0, 0, 1.1);
      setLevelGates([g1, g2, g3, gGate, g4, g5]);
      setSoftCheckpoints([cp]);

      const pad = createLandingPad(0, -35.5, 0xffd700);
      setLevelLandingPad(pad);

      setMissions([
        { title: "GRADUACIÓN 1 / 7", desc: "Aro 1 exterior con viento", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "GRADUACIÓN 2 / 7", desc: "Slalom hacia el Aro 2", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "GRADUACIÓN 3 / 7", desc: "Slalom hacia el Aro 3", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "GRADUACIÓN 4 / 7", desc: "Compuerta angosta de entrada al hangar", target: gGate.center, check: () => checkGatePass(gGate, 0.4), onComplete: () => gGate.setSuccess(), hint: "Alinea bien el morro y reduce la velocidad antes de cruzar la puerta." },
        { title: "CHECKPOINT", desc: "Punto de guardado dentro del hangar", target: cp.center, check: () => cp.check(), onComplete: () => cp.setActivated() },
        { title: "GRADUACIÓN 5 / 7", desc: "Viraje interior hacia el Aro 5", target: g4.center, check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
        { title: "GRADUACIÓN 6 / 7", desc: "Aro 6 de aproximación final", target: g5.center, check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: "GRADUACIÓN 7 / 7", desc: "¡Aterriza en el helipuerto dorado de graduación!", target: pad.center, check: () => false }
      ]);
    }
  },

  // ===========================================================================
  // MODO DESAFÍOS (Niveles 19 al 28 / Desafíos 1 al 10)
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // DESAFÍO 1 – Carrera Contrarreloj (Speed Attack)
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 1",
    subtitle: "Carrera Contrarreloj",
    desc: "Circuito de alta velocidad: 7 aros rápidos donde cada décima de segundo cuenta.",
    isChallenge: true,
    medalTimes: { gold: 20, silver: 27, bronze: 38 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.4, -4.5, 0, 1.35);
      const g2 = createFlightGate( 3.5, 1.4, -8.5, Math.PI / 4, 1.35);
      const g3 = createFlightGate( 3.5, 1.4, -14.5, Math.PI / 4, 1.35);
      const g4 = createFlightGate( 0.0, 1.4, -19.5, 0, 1.35);
      const g5 = createFlightGate(-3.5, 1.4, -14.5, -Math.PI / 4, 1.35);
      const g6 = createFlightGate(-3.5, 1.4, -8.5, -Math.PI / 4, 1.35);
      const g7 = createFlightGate( 0.0, 1.4, -3.5, 0, 1.35);
      setLevelGates([g1, g2, g3, g4, g5, g6, g7]);

      const pad = createLandingPad(0, 0.5, 0x00e676);
      setLevelLandingPad(pad);

      setMissions([
        { title: "SPEED 1/8", desc: "¡Acelera a fondo hacia el Aro 1!", target: g1.center, check: () => checkGatePass(g1, 0.5), onComplete: () => g1.setSuccess() },
        { title: "SPEED 2/8", desc: "Curva derecha rápida: Aro 2", target: g2.center, check: () => checkGatePass(g2, 0.5), onComplete: () => g2.setSuccess() },
        { title: "SPEED 3/8", desc: "Recta lateral: Aro 3", target: g3.center, check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess() },
        { title: "SPEED 4/8", desc: "Fondo del óvalo: Aro 4", target: g4.center, check: () => checkGatePass(g4, 0.5), onComplete: () => g4.setSuccess() },
        { title: "SPEED 5/8", desc: "Curva izquierda: Aro 5", target: g5.center, check: () => checkGatePass(g5, 0.5), onComplete: () => g5.setSuccess() },
        { title: "SPEED 6/8", desc: "Recta de regreso: Aro 6", target: g6.center, check: () => checkGatePass(g6, 0.5), onComplete: () => g6.setSuccess() },
        { title: "SPEED 7/8", desc: "Último aro antes de meta: Aro 7", target: g7.center, check: () => checkGatePass(g7, 0.5), onComplete: () => g7.setSuccess() },
        { title: "SPEED 8/8", desc: "¡Aterriza de inmediato para detener el cronómetro!", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 2 – Rescate en Tormenta (Storm Rescue)
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 2",
    subtitle: "Rescate en Tormenta",
    desc: "Viento violento y racheado con turbulencia severa. Encuentra y sobrevuela a los supervivientes.",
    isChallenge: true,
    medalTimes: { gold: 38, silver: 52, bronze: 75 },
    windScale: 3.5,
    windDir: new THREE.Vector3(0.9, 0, 0.3),
    hazards: { vpsOn: true, windOn: true, windStrength: 3.5, turbOn: true, turbStrength: 2.2 },
    setup() {
      const w1 = createWaypoint( 3.5, 1.3, -6.0,  0x00e676);
      const w2 = createWaypoint(-3.8, 1.5, -12.0, 0x00e676);
      const w3 = createWaypoint( 2.8, 1.2, -18.0, 0x00e676);
      const w4 = createWaypoint(-2.0, 1.4, -24.0, 0x00e676);

      const pad = createLandingPad(0, -29.0, 0xef5350);
      setLevelLandingPad(pad);

      setMissions([
        { title: "TORMENTA 1/5", desc: "Superviviente 1 a sotavento", target: w1.center, check: () => w1.check(), onComplete: () => w1.setSuccess() },
        { title: "TORMENTA 2/5", desc: "Superviviente 2 — contrarresta la turbulencia", target: w2.center, check: () => w2.check(), onComplete: () => w2.setSuccess(), hint: "La turbulencia sacude el dron: haz correcciones rápidas y constantes." },
        { title: "TORMENTA 3/5", desc: "Superviviente 3 en zona profunda", target: w3.center, check: () => w3.check(), onComplete: () => w3.setSuccess() },
        { title: "TORMENTA 4/5", desc: "Superviviente 4 — mantén el control", target: w4.center, check: () => w4.check(), onComplete: () => w4.setSuccess() },
        { title: "TORMENTA 5/5", desc: "Aterriza en la zona de rescate roja", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 3 – El Túnel a Ciegas (Manual No-VPS Indoor)
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 3",
    subtitle: "El Túnel a Ciegas",
    desc: "Vuelo interior con suelo completamente reflectante. Cero frenado automático: control manual absoluto.",
    isIndoor: true,
    isChallenge: true,
    medalTimes: { gold: 30, silver: 44, bronze: 62 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false }, // slick zone covers everything
    setup() {
      setLevelSlickZones([createSlickZone(0, -15, 12, 30)]);

      const g1 = createFlightGate( 0.0, 1.3, -4.5, 0, 1.2);
      const g2 = createFlightGate(-2.2, 1.3, -9.5, Math.PI / 8, 1.15);
      const g3 = createFlightGate( 2.2, 1.3, -15.5, -Math.PI / 8, 1.15);
      const g4 = createFlightGate( 0.0, 1.3, -21.0, 0, 1.2);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -26.0, 0xff7043);
      setLevelLandingPad(pad);

      setMissions([
        { title: "MANUAL 1/5", desc: "Cruza el Aro 1 — siente la inercia total", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "MANUAL 2/5", desc: "Aro 2 a la izquierda — frena activamente con stick opuesto", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "MANUAL 3/5", desc: "Aro 3 a la derecha — controla el deslizamiento", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "MANUAL 4/5", desc: "Aro 4 de salida", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "MANUAL 5/5", desc: "Aterriza en la plataforma naranja sin rebotar", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 4 – Batería Extrema (35s Sprint)
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 4",
    subtitle: "Batería Extrema (35s)",
    desc: "Solo 35 segundos de energía para completar un circuito de 5 aros a gran altitud. Cero vacilaciones.",
    isChallenge: true,
    medalTimes: { gold: 22, silver: 28, bronze: 34 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { batteryOn: true, batteryTime: 35, vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate( 0.0, 1.8, -4.5, 0, 1.3);
      const g2 = createFlightGate( 2.8, 2.3, -9.5, Math.PI / 8, 1.25);
      const g3 = createFlightGate(-2.8, 2.5, -15.0, -Math.PI / 8, 1.25);
      const g4 = createFlightGate( 2.0, 2.0, -20.5, Math.PI / 8, 1.25);
      const g5 = createFlightGate( 0.0, 1.4, -25.5, 0, 1.3);
      setLevelGates([g1, g2, g3, g4, g5]);

      const pad = createLandingPad(0, -29.5, 0xef5350);
      setLevelLandingPad(pad);

      setMissions([
        { title: "35s (1/6)", desc: "¡Despega rápido hacia el Aro 1!", target: g1.center, check: () => checkGatePass(g1, 0.5), onComplete: () => g1.setSuccess() },
        { title: "35s (2/6)", desc: "Aro 2 a 2.3m — mantén acelerador constante", target: g2.center, check: () => checkGatePass(g2, 0.5), onComplete: () => g2.setSuccess() },
        { title: "35s (3/6)", desc: "Aro 3 en altitud máxima", target: g3.center, check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess() },
        { title: "35s (4/6)", desc: "Aro 4 — inicia descenso suave", target: g4.center, check: () => checkGatePass(g4, 0.5), onComplete: () => g4.setSuccess() },
        { title: "35s (5/6)", desc: "Aro 5 de aproximación final", target: g5.center, check: () => checkGatePass(g5, 0.5), onComplete: () => g5.setSuccess() },
        { title: "35s (6/6)", desc: "¡Aterriza antes de que la batería llegue a cero!", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 5 – Doble Aro Móvil (Dual Dynamic Intercept)
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 5",
    subtitle: "Doble Aro Móvil",
    desc: "Dos aros en movimiento armónico continuo a diferentes velocidades y alturas. Prueba tu sincronización.",
    isChallenge: true,
    medalTimes: { gold: 30, silver: 44, bronze: 62 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      const g1 = createFlightGate(0.0, 1.3, -4.5, 0, 1.3);

      const gm1 = createFlightGate(0.0, 1.3, -10.5, 0, 1.35);
      gm1.speed = 1.1;
      gm1.amplitude = 3.0;
      gm1.phase = 0;

      const gm2 = createFlightGate(0.0, 2.2, -17.0, 0, 1.35);
      gm2.speed = 0.65;
      gm2.amplitude = 3.8;
      gm2.phase = Math.PI / 2;

      setMovingGate([gm1, gm2]);

      const g4 = createFlightGate(0.0, 1.4, -22.5, 0, 1.25);
      setLevelGates([g1, gm1, gm2, g4]);

      const pad = createLandingPad(0, -27.0, 0x00e5ff);
      setLevelLandingPad(pad);

      setMissions([
        { title: "MÓVIL 1/5", desc: "Aro 1 de alineación", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "MÓVIL 2/5", desc: "Aro Móvil Rápido (1.3m) — oscilación baja", target: gm1.center, check: () => checkGatePass(gm1, 0.55), onComplete: () => gm1.setSuccess() },
        { title: "MÓVIL 3/5", desc: "Aro Móvil Amplio (2.2m) — sube e intercepta", target: gm2.center, check: () => checkGatePass(gm2, 0.55), onComplete: () => gm2.setSuccess() },
        { title: "MÓVIL 4/5", desc: "Aro 4 estático de salida", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "MÓVIL 5/5", desc: "Aterriza en el helipuerto azul", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 6 – [AUTO-GENERADO] Circuito Exterior Aleatorio
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 6",
    subtitle: "Circuito Aleatorio Exterior",
    desc: "Mundo procedural: cada intento genera un circuito de aros completamente nuevo e impredecible.",
    isChallenge: true,
    isAutoGenerated: true,
    medalTimes: { gold: 32, silver: 45, bronze: 65 },
    windScale: 1.0,
    windDir: new THREE.Vector3(0.4, 0, 0.2),
    hazards: { vpsOn: true, windOn: true, windStrength: 1.0 },
    setup() {
      setupProceduralOutdoorCourse();
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 7 – [AUTO-GENERADO] Almacén Caótico Interior
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 7",
    subtitle: "Almacén Caótico Interior",
    desc: "Mundo procedural interior: nave industrial generada al azar con estanterías y aros en ubicaciones cambiantes.",
    isIndoor: true,
    isChallenge: true,
    isAutoGenerated: true,
    medalTimes: { gold: 35, silver: 50, bronze: 72 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      setupProceduralIndoorWarehouse();
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 8 – Vuelo Rasante (Bajo Techo de Radar)
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 8",
    subtitle: "Vuelo Rasante",
    desc: "Vuela bajo radar: todos los aros están por debajo de 1.1m. Vigas suspendidas castigan subir demasiado.",
    isChallenge: true,
    medalTimes: { gold: 26, silver: 38, bronze: 55 },
    windScale: 0.0,
    windDir: new THREE.Vector3(0, 0, 0),
    hazards: { vpsOn: true, windOn: false },
    setup() {
      // Overhead beam obstacles at 1.5m
      const beamMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
      [-8.0, -14.0, -20.0].forEach(bz => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.15, 0.15), beamMat);
        beam.position.set(0, 1.55, bz);
        scene.add(beam);
        beam.updateWorldMatrix(true, false);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(beam), mesh: beam }]);
        setLevelObjects([...levelObjects, beam]);
      });

      const g1 = createFlightGate( 0.0, 0.85, -5.0,  0, 1.05);
      const g2 = createFlightGate(-1.8, 0.90, -11.0, Math.PI / 8, 1.05);
      const g3 = createFlightGate( 1.8, 0.85, -17.0, -Math.PI / 8, 1.05);
      const g4 = createFlightGate( 0.0, 0.90, -23.0, 0, 1.05);
      setLevelGates([g1, g2, g3, g4]);

      const pad = createLandingPad(0, -27.5, 0xffeb3b);
      setLevelLandingPad(pad);

      setMissions([
        { title: "RASANTE 1/5", desc: "Aro bajo 1 (0.85m) — mantén altura sin subir", target: g1.center, check: () => checkGatePass(g1, 0.4), onComplete: () => g1.setSuccess() },
        { title: "RASANTE 2/5", desc: "Aro bajo 2 — ¡Cuidado con la viga roja superior!", target: g2.center, check: () => checkGatePass(g2, 0.4), onComplete: () => g2.setSuccess(), hint: "Ajusta toques suaves de acelerador para no elevarte hacia las vigas." },
        { title: "RASANTE 3/5", desc: "Aro bajo 3 a la derecha", target: g3.center, check: () => checkGatePass(g3, 0.4), onComplete: () => g3.setSuccess() },
        { title: "RASANTE 4/5", desc: "Aro bajo 4 final", target: g4.center, check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
        { title: "RASANTE 5/5", desc: "Aterriza en el helipuerto amarillo", target: pad.center, check: () => false }
      ]);
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 9 – [AUTO-GENERADO] Tormenta Impredecible
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 9",
    subtitle: "Tormenta Impredecible",
    desc: "Mundo procedural adverso: viento racheado de ángulo cambiante y zonas de suelo resbaladizo generadas al azar.",
    isChallenge: true,
    isAutoGenerated: true,
    medalTimes: { gold: 36, silver: 52, bronze: 75 },
    windScale: 2.8,
    windDir: new THREE.Vector3(0.7, 0, 0.3),
    hazards: { vpsOn: true, windOn: true, windStrength: 2.8, turbOn: true, turbStrength: 1.5 },
    setup() {
      setupProceduralStormCourse();
    }
  },

  // ---------------------------------------------------------------------------
  // DESAFÍO 10 – La Prueba Definitiva del Piloto (The Gauntlet Pro)
  // ---------------------------------------------------------------------------
  {
    name: "DESAFÍO 10",
    subtitle: "La Prueba Definitiva (Gauntlet)",
    desc: "El desafío supremo: batería de 80s, viento cruzado, aro móvil y puertas de alta precisión. La prueba de los campeones.",
    isChallenge: true,
    medalTimes: { gold: 48, silver: 65, bronze: 80 },
    windScale: 2.0,
    windDir: new THREE.Vector3(0.6, 0, 0.2),
    hazards: { batteryOn: true, batteryTime: 80, windOn: true, windStrength: 2.0, vpsOn: true },
    setup() {
      const g1 = createFlightGate( 0.0, 1.3, -4.5, 0, 1.2);
      const g2 = createFlightGate(-3.0, 1.4, -9.5, Math.PI / 7, 1.15);

      const gm = createFlightGate(0.0, 1.5, -15.0, 0, 1.3);
      gm.speed = 0.9;
      gm.amplitude = 3.2;
      setMovingGate(gm);

      const cp = createSoftCheckpoint(0.0, 1.3, -19.5, 0, 1.1);
      const g3 = createFlightGate( 3.0, 1.4, -24.0, -Math.PI / 7, 1.15);
      const g4 = createFlightGate( 0.0, 1.3, -29.0, 0, 1.15);
      setLevelGates([g1, g2, gm, g3, g4]);
      setSoftCheckpoints([cp]);

      setLevelSlickZones([createSlickZone(0, -24.0, 8, 8)]);

      const pad = createLandingPad(0, -34.0, 0xffd700);
      setLevelLandingPad(pad);

      setMissions([
        { title: "GAUNTLET 1/7", desc: "Aro 1 con viento cruzado", target: g1.center, check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: "GAUNTLET 2/7", desc: "Aro 2 a la izquierda — controla el tiempo de batería", target: g2.center, check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: "GAUNTLET 3/7", desc: "⚡ Intercepta el Aro Móvil 3 sin dudar", target: gm.center, check: () => checkGatePass(gm, 0.55), onComplete: () => gm.setSuccess() },
        { title: "CHECKPOINT", desc: "Punto de guardado de emergencia", target: cp.center, check: () => cp.check(), onComplete: () => cp.setActivated() },
        { title: "GAUNTLET 4/7", desc: "Aro 4 sobre zona VPS ciega", target: g3.center, check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: "GAUNTLET 5/7", desc: "Aro 5 de salida", target: g4.center, check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: "GAUNTLET 6/7", desc: "¡Aterriza en el helipuerto dorado antes de 0%!", target: pad.center, check: () => false }
      ]);
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL LIFECYCLE: clearLevel() and loadLevel()
// ─────────────────────────────────────────────────────────────────────────────

export function clearLevel() {
  levelObjects.forEach(obj => {
    scene.remove(obj);
    disposeObject(obj);
  });
  setLevelObjects([]);

  obstacles.forEach(obs => {
    if (obs && obs.mesh) {
      scene.remove(obs.mesh);
      disposeObject(obs.mesh);
    }
  });
  setObstacles([]);

  levelSlickZones.forEach(sz => {
    if (sz && sz.mesh) {
      scene.remove(sz.mesh);
      disposeObject(sz.mesh);
    }
  });
  setLevelSlickZones([]);

  setLevelGates([]);
  setSoftCheckpoints([]);
  setActiveSoftCheckpointIdx(-1);
  setActiveRespawnCheckpoint(null);
  setLevelLandingPad(null);
  setMovingGate(null);
  setMovingObstacles([]);
  setMissions([]);
}

export function loadLevel(idx) {
  clearLevel();
  setIsFreestyleMode(false);
  setCurrentLevel(idx);
  setCurrentMissionIdx(0);
  setMissionTimer(0);
  setTimerRunning(false);

  setGateScores([]);
  setLevelStars(0);
  setHintRetries({});
  setReplayBuffer([]);
  setReplaySample(0);

  // Baseline difficulty defaults
  DIFFICULTY.batteryOn = false;
  DIFFICULTY.batteryTime = 120;
  DIFFICULTY.windOn = false;
  DIFFICULTY.windStrength = 1.0;
  DIFFICULTY.turbOn = false;
  DIFFICULTY.turbStrength = 1.0;
  DIFFICULTY.vpsOn = false;

  const def = LEVEL_DEFS[idx];
  setEnvironmentMode(!!def.isIndoor);
  setWindVector(def.windDir.clone().multiplyScalar(def.windScale));

  if (def.hazards) {
    if (def.hazards.windOn !== undefined) DIFFICULTY.windOn = def.hazards.windOn;
    if (def.hazards.windStrength !== undefined) DIFFICULTY.windStrength = def.hazards.windStrength;
    if (def.hazards.vpsOn !== undefined) DIFFICULTY.vpsOn = def.hazards.vpsOn;
    if (def.hazards.turbOn !== undefined) DIFFICULTY.turbOn = def.hazards.turbOn;
    if (def.hazards.turbStrength !== undefined) DIFFICULTY.turbStrength = def.hazards.turbStrength;
    if (def.hazards.batteryOn !== undefined) DIFFICULTY.batteryOn = def.hazards.batteryOn;
    if (def.hazards.batteryTime !== undefined) DIFFICULTY.batteryTime = def.hazards.batteryTime;
  }

  def.setup();

  setBatteryTimeLeft(DIFFICULTY.batteryTime);
  setBatteryDepleted(false);
  const batteryWrap = document.getElementById('battery-bar-wrap');
  if (batteryWrap) {
    batteryWrap.style.display = DIFFICULTY.batteryOn ? 'block' : 'none';
  }
  if (DIFFICULTY.batteryOn) {
    updateBatteryBar(DIFFICULTY.batteryTime, DIFFICULTY.batteryTime);
  }

  document.getElementById('mission-hud').style.display    = 'block';
  document.getElementById('freestyle-hud').style.display  = 'none';
  document.getElementById('freestyle-panel').style.display = 'none';

  // Read missions after setup
  const currentMissions = missions;
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
  setActiveRespawnCheckpoint({ pos: drone.pos.clone(), yaw: drone.yaw });
  setFlightState(FlightState.LANDED);
}

export function regenerateCurrentLevel() {
  loadLevel(currentLevel);
}

export function updateMovingGate(elapsedTime) {
  if (!movingGate) return;
  const gates = Array.isArray(movingGate) ? movingGate : [movingGate];
  gates.forEach((mg) => {
    if (!mg || !mg.group) return;
    const speed = mg.speed || 0.7;
    const amp = mg.amplitude || 3.5;
    const phase = mg.phase || 0;
    const newX = Math.sin(elapsedTime * speed + phase) * amp;
    mg.group.position.x = newX;
    mg.center.x = newX;

    mg.group.children.forEach(part => {
      part.updateWorldMatrix(true, false);
    });
    for (let i = 0; i < obstacles.length; i++) {
      const colBox = obstacles[i];
      if (mg.group.children.includes(colBox.mesh)) {
        colBox.box.setFromObject(colBox.mesh);
      }
    }
  });
}
