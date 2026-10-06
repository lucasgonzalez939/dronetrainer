/**
 * levels.js – Level definitions, loadLevel(), clearLevel().
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { scene } from './scene.js';
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
  setReplayBuffer, setReplaySample
} from './state.js';
import { createFlightGate, createSlickZone, createLandingPad, checkGatePass,
         createSoftCheckpoint,
         createWaypoint, createInspectionTower, createGhostDrone } from './gates.js';
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
  },

  // ----------------------------------------------------------------
  // NIVEL 5 – Circuito de Velocidad
  // ----------------------------------------------------------------
  {
    name: "NIVEL 5",
    subtitle: "Circuito de Velocidad",
    desc: "Seis aros grandes en óvalo. Viento en calma. ¡Vuela tan rápido como puedas!",
    objectives: [
      "Completa el circuito de 6 aros a máxima velocidad",
      "🥇 Oro < 30s  🥈 Plata < 45s  🥉 Bronce < 60s",
      "Aterriza en el helipuerto verde al final"
    ],
    windScale: 0.2,
    windDir: new THREE.Vector3(0.1, 0, 0.05),
    medalTimes: { gold: 30, silver: 45, bronze: 60 },
    setup() {
      // 6 gates in an oval, large size
      const ovalGates = [
        createFlightGate( 0,   1.6, -5,   0,           1.6),
        createFlightGate( 4.5, 1.6, -9,   Math.PI/4,   1.6),
        createFlightGate( 4.5, 1.6, -16,  Math.PI/4,   1.6),
        createFlightGate( 0,   1.6, -22,  0,           1.6),
        createFlightGate(-4.5, 1.6, -16, -Math.PI/4,   1.6),
        createFlightGate(-4.5, 1.6, -9,  -Math.PI/4,   1.6),
      ];
      setLevelGates([...levelGates, ...ovalGates]);
      setLevelLandingPad(createLandingPad(0, -27, 0x00e676));

      const total = 7;
      setMissions([
        { title: `MISIÓN 1/${total}`, desc: "¡Arranca! Aro 1 recto al frente", check: () => checkGatePass(ovalGates[0], 0.6), onComplete: () => ovalGates[0].setSuccess(), hint: "Mantén el acelerador al máximo y nivelado." },
        { title: `MISIÓN 2/${total}`, desc: "Aro 2 — gira a la derecha", check: () => checkGatePass(ovalGates[1], 0.6), onComplete: () => ovalGates[1].setSuccess() },
        { title: `MISIÓN 3/${total}`, desc: "Aro 3 — sigue la curva derecha", check: () => checkGatePass(ovalGates[2], 0.6), onComplete: () => ovalGates[2].setSuccess() },
        { title: `MISIÓN 4/${total}`, desc: "Aro 4 — fondo del óvalo", check: () => checkGatePass(ovalGates[3], 0.6), onComplete: () => ovalGates[3].setSuccess() },
        { title: `MISIÓN 5/${total}`, desc: "Aro 5 — gira a la izquierda", check: () => checkGatePass(ovalGates[4], 0.6), onComplete: () => ovalGates[4].setSuccess() },
        { title: `MISIÓN 6/${total}`, desc: "Aro 6 — recta final", check: () => checkGatePass(ovalGates[5], 0.6), onComplete: () => ovalGates[5].setSuccess() },
        { title: `MISIÓN 7/${total}`, desc: "¡Aterriza! El cronómetro se detiene en tierra", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 6 – Búsqueda y Rescate
  // ----------------------------------------------------------------
  {
    name: "NIVEL 6",
    subtitle: "Búsqueda y Rescate",
    desc: "Batería limitada (90 s). Visita 5 puntos de víctimas en un entorno con obstáculos.",
    objectives: [
      "Localiza y sobrevuela los 5 puntos de rescate (esferas verdes)",
      "El entorno tiene pilares y paredes como escombros",
      "Gestiona la batería: ¡tienes sólo 90 segundos!",
      "Aterriza en la zona de evacuación al final"
    ],
    windScale: 1.2,
    windDir: new THREE.Vector3(0.4, 0, 0.2),
    setup() {
      // Force battery on for this level
      DIFFICULTY.batteryOn  = true;
      DIFFICULTY.batteryTime = 90;

      // Debris obstacles: pillars and walls
      const addPillar = (x, z, h) => {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.3, h, 10),
          new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.8 })
        );
        m.position.set(x, h / 2, z);
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };
      const addWall = (x, z, w, h, ry) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85 })
        );
        m.position.set(x, h / 2, z);
        m.rotation.y = ry;
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };

      addPillar(-3, -6,  3.5);
      addPillar( 3, -10, 2.5);
      addPillar(-2, -15, 4.0);
      addPillar( 4, -20, 3.0);
      addWall(  0, -8,  3.5, 2.0, 0);
      addWall( -4, -13, 4.0, 1.8, Math.PI / 5);
      addWall(  3, -18, 3.0, 2.2, -Math.PI / 6);

      // 5 rescue waypoints
      const w1 = createWaypoint(-2.5, 1.2, -5,   0x00e676);
      const w2 = createWaypoint( 3.5, 1.5, -11,  0x00e676);
      const w3 = createWaypoint(-3.0, 1.0, -16,  0x00e676);
      const w4 = createWaypoint( 2.0, 2.0, -21,  0x00e676);
      const w5 = createWaypoint(-1.0, 1.3, -27,  0x00e676);

      // Formation ghost drones (teammates already on site)
      createGhostDrone(1.5, 1.5, -8);
      createGhostDrone(-3.5, 1.0, -14);

      setLevelLandingPad(createLandingPad(0, -32, 0xef5350));

      const total = 6;
      setMissions([
        { title: `RESCATE 1/${total}`, desc: "Sobrevuela el punto de víctima 1 — izq. al frente", check: () => w1.check(), onComplete: () => w1.setSuccess(), hint: "Pasa a menos de 0.4 m del marcador verde." },
        { title: `RESCATE 2/${total}`, desc: "Punto 2 — atraviesa los escombros hacia la derecha", check: () => w2.check(), onComplete: () => w2.setSuccess() },
        { title: `RESCATE 3/${total}`, desc: "Punto 3 — zona densa, bajo vuelo entre pilares", check: () => w3.check(), onComplete: () => w3.setSuccess() },
        { title: `RESCATE 4/${total}`, desc: "Punto 4 — mantén altura, dos paredes cerca", check: () => w4.check(), onComplete: () => w4.setSuccess() },
        { title: `RESCATE 5/${total}`, desc: "Último superviviente — ¡batería baja!", check: () => w5.check(), onComplete: () => w5.setSuccess() },
        { title: `RESCATE 6/${total}`, desc: "¡Aterriza en la zona de evacuación ROJA!", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 7 – Inspección Nocturna (Órbita)
  // ----------------------------------------------------------------
  {
    name: "NIVEL 7",
    subtitle: "Inspección Nocturna",
    desc: "Orbita la torre iluminada 6 veces en modo FPV. Turbulencia fuerte. Luces LED son tu única guía.",
    objectives: [
      "Orbita la torre: pasa por los 6 objetivos suaves del circuito circular",
      "Turbulencia intensa — sin VPS en zona de órbita",
      "Usa el modo FPV para maximizar la inmersión",
      "Aterriza en la base de la torre"
    ],
    windScale: 1.8,
    windDir: new THREE.Vector3(0.5, 0, 0.3),
    setup() {
      DIFFICULTY.turbOn      = true;
      DIFFICULTY.turbStrength = 2.5;

      // Build inspection tower at centre
      createInspectionTower(0, -14, 7.0);

      // 6 soft orbit targets (transparent, no collision) at radius 3.5m
      const orbitSoftTargets = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const gx = Math.cos(angle) * 3.5;
        const gz = -14 + Math.sin(angle) * 3.5;
        const rotY = angle + Math.PI / 2;
        orbitSoftTargets.push(createSoftCheckpoint(gx, 1.6, gz, rotY, 1.15));
      }
      setSoftCheckpoints([...softCheckpoints, ...orbitSoftTargets]);

      // Full orbit zone is a VPS-loss zone
      setLevelSlickZones([...levelSlickZones, createSlickZone(0, -14, 9, 9)]);

      setLevelLandingPad(createLandingPad(0, -14, 0xffd54f));

      const total = 7;
      setMissions([
        { title: `ÓRBITA 1/${total}`, desc: "Objetivo suave 1 — inicia la órbita en sentido horario", check: () => orbitSoftTargets[0].check(0.55), onComplete: () => orbitSoftTargets[0].setActivated(), hint: "Vuela a ~1.6 m de altura y mantén la torre a tu derecha." },
        { title: `ÓRBITA 2/${total}`, desc: "Objetivo suave 2 — continúa la curva, VPS perdido", check: () => orbitSoftTargets[1].check(0.55), onComplete: () => orbitSoftTargets[1].setActivated() },
        { title: `ÓRBITA 3/${total}`, desc: "Objetivo suave 3 — mitad de la órbita", check: () => orbitSoftTargets[2].check(0.55), onComplete: () => orbitSoftTargets[2].setActivated() },
        { title: `ÓRBITA 4/${total}`, desc: "Objetivo suave 4 — lado opuesto de la torre", check: () => orbitSoftTargets[3].check(0.55), onComplete: () => orbitSoftTargets[3].setActivated() },
        { title: `ÓRBITA 5/${total}`, desc: "Objetivo suave 5 — recta final de la órbita", check: () => orbitSoftTargets[4].check(0.55), onComplete: () => orbitSoftTargets[4].setActivated() },
        { title: `ÓRBITA 6/${total}`, desc: "Objetivo suave 6 — cierre del circuito", check: () => orbitSoftTargets[5].check(0.55), onComplete: () => orbitSoftTargets[5].setActivated() },
        { title: `ÓRBITA 7/${total}`, desc: "Aterriza en la base de la torre (helipuerto amarillo)", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 8 – El Gauntlet
  // ----------------------------------------------------------------
  {
    name: "NIVEL 8",
    subtitle: "El Gauntlet",
    desc: "Aros estrechos (0.8 m), campo VPS completo, viento de tormenta y batería de 45 s.",
    objectives: [
      "7 aros estrechos (0.8 m) — precisión extrema",
      "Campo VPS total: ninguna corrección automática de posición",
      "Viento de tormenta (escala 4.0) + turbulencia",
      "Batería: sólo 45 segundos — ¡sé eficiente!"
    ],
    windScale: 4.0,
    windDir: new THREE.Vector3(0.9, 0, 0.6),
    setup() {
      DIFFICULTY.batteryOn   = true;
      DIFFICULTY.batteryTime  = 45;
      DIFFICULTY.turbOn       = true;
      DIFFICULTY.turbStrength = 2.0;

      const g1 = createFlightGate( 0,   1.5, -4,    0,            0.8);
      const g2 = createFlightGate( 2.0, 2.2, -8,    Math.PI/3,    0.8);
      const g3 = createFlightGate(-2.5, 1.0, -12,  -Math.PI/4,    0.8);
      const g4 = createFlightGate( 1.5, 2.8, -17,   Math.PI/5,    0.8);
      const g5 = createFlightGate(-1.5, 1.5, -22,   0,            0.8);
      const g6 = createFlightGate( 2.5, 2.0, -27,  -Math.PI/6,    0.8);
      const g7 = createFlightGate(-0.5, 1.8, -33,   0,            0.8);
      setLevelGates([...levelGates, g1, g2, g3, g4, g5, g6, g7]);
      setMovingGate(g3); // g3 moves laterally

      // Full-field VPS dropout
      setLevelSlickZones([
        ...levelSlickZones,
        createSlickZone(0, -18, 30, 36)
      ]);

      // Small precision pad
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.02, 32),
        new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.3 })
      );
      pad.position.set(0, 0.01, -38);
      scene.add(pad);
      setLevelObjects([...levelObjects, pad]);
      pad._precisionRadius = 0.6;
      setLevelLandingPad(pad);

      const total = 8;
      setMissions([
        { title: `GAUNTLET 1/${total}`, desc: "Aro 1 — arranque recto, viento cruzado",        check: () => checkGatePass(g1, 0.4), onComplete: () => g1.setSuccess(), hint: "Anticipa el viento inclinando hacia él antes de entrar." },
        { title: `GAUNTLET 2/${total}`, desc: "Aro 2 — alto y a la derecha",                   check: () => checkGatePass(g2, 0.4), onComplete: () => g2.setSuccess() },
        { title: `GAUNTLET 3/${total}`, desc: "⚡ Aro 3 MÓVIL — intercepta su trayectoria",    check: () => checkGatePass(g3, 0.5), onComplete: () => g3.setSuccess(), hint: "Espera a que el aro venga hacia ti antes de avanzar." },
        { title: `GAUNTLET 4/${total}`, desc: "Aro 4 — elevado, zona VPS total",               check: () => checkGatePass(g4, 0.4), onComplete: () => g4.setSuccess() },
        { title: `GAUNTLET 5/${total}`, desc: "Aro 5 — viento máximo, sin VPS",                check: () => checkGatePass(g5, 0.4), onComplete: () => g5.setSuccess() },
        { title: `GAUNTLET 6/${total}`, desc: "Aro 6 — casi sin batería, ¡no te detengas!",    check: () => checkGatePass(g6, 0.4), onComplete: () => g6.setSuccess() },
        { title: `GAUNTLET 7/${total}`, desc: "Aro 7 final — la meta está cerca",              check: () => checkGatePass(g7, 0.4), onComplete: () => g7.setSuccess() },
        { title: `GAUNTLET 8/${total}`, desc: "Aterriza en el helipuerto ROJO (precisión máx.)", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 9 – Laberinto Interior
  // ----------------------------------------------------------------
  {
    name: "NIVEL 9",
    subtitle: "Laberinto Interior",
    desc: "Navega por pasillos estrechos, huecos entre estructuras y cambios de altura en entorno cerrado.",
    objectives: [
      "Cruza 4 aros dentro del circuito interior",
      "Evita paredes y columnas en pasillos estrechos",
      "Mantén control en una zona VPS parcial",
      "Aterriza en el helipuerto de salida segura"
    ],
    windScale: 1.1,
    windDir: new THREE.Vector3(0.25, 0, 0.35),
    setup() {
      const addWall = (x, y, z, w, h, d, ry = 0, color = 0x616161) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
        );
        m.position.set(x, y, z);
        m.rotation.y = ry;
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };

      const addPillar = (x, z, h) => {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, h, 12),
          new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.8 })
        );
        m.position.set(x, h / 2, z);
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };

      addWall(-4.5, 1.2, -7, 0.45, 2.4, 7.5);
      addWall( 4.5, 1.2, -7, 0.45, 2.4, 7.5);
      addWall( 0.0, 1.2, -10.6, 5.8, 2.4, 0.45);
      addWall(-2.4, 1.2, -14.5, 0.45, 2.4, 7.2, Math.PI / 10);
      addWall( 2.7, 1.2, -17.2, 0.45, 2.4, 6.0, -Math.PI / 9);
      addWall( 0.0, 1.0, -21.0, 3.8, 2.0, 0.45);
      addPillar(-1.6, -12.5, 2.4);
      addPillar( 1.8, -16.2, 2.9);
      addPillar(-0.9, -19.2, 2.1);

      const g1 = createFlightGate(0.0, 1.1, -4.2,  0,            1.0);
      const g2 = createFlightGate(-1.8, 1.6, -9.0, Math.PI / 8,  1.0);
      const g3 = createFlightGate( 2.2, 1.0, -14.6, -Math.PI / 6, 0.95);
      const g4 = createFlightGate( 0.4, 2.2, -20.3, Math.PI / 14, 0.9);
      setLevelGates([...levelGates, g1, g2, g3, g4]);

      const cp1 = createSoftCheckpoint(-1.2, 1.25, -7.1, 0, 1.0);
      const cp2 = createSoftCheckpoint( 1.2, 1.2, -17.3, 0, 1.0);
      setSoftCheckpoints([...softCheckpoints, cp1, cp2]);

      setLevelSlickZones([
        ...levelSlickZones,
        createSlickZone(0.4, -15.5, 5.0, 6.5)
      ]);

      setLevelLandingPad(createLandingPad(0, -25.5, 0x26c6da));

      const total = 5;
      setMissions([
        { title: `INTERIOR 1/${total}`, desc: "Aro 1 — entra al corredor principal", check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: `INTERIOR 2/${total}`, desc: "Aro 2 — sube y gira entre paredes", check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: `INTERIOR 3/${total}`, desc: "Aro 3 — pasillo estrecho con columna", check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: `INTERIOR 4/${total}`, desc: "Aro 4 — ascenso final en zona VPS", check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: `INTERIOR 5/${total}`, desc: "Aterriza en el helipuerto azul de salida", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 10 – Eje Vertical 3D
  // ----------------------------------------------------------------
  {
    name: "NIVEL 10",
    subtitle: "Eje Vertical 3D",
    desc: "Entrena transiciones verticales agresivas con aros apilados y obstáculos suspendidos.",
    objectives: [
      "Encadena 5 aros con cambios de altura pronunciados",
      "Gestiona el control en ascenso y descenso rápido",
      "Evita un obstáculo móvil en el eje central",
      "Finaliza con aterrizaje de precisión"
    ],
    windScale: 1.6,
    windDir: new THREE.Vector3(0.45, 0, -0.25),
    setup() {
      const addFrame = (x, y, z, sx, sy, sz, color = 0x546e7a) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy, sz),
          new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.1 })
        );
        m.position.set(x, y, z);
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        const box = new THREE.Box3().setFromObject(m);
        setObstacles([...obstacles, { box, mesh: m }]);
        return { mesh: m, box };
      };

      addFrame(-2.2, 2.2, -8.0, 0.25, 4.4, 0.25);
      addFrame( 2.2, 2.2, -8.0, 0.25, 4.4, 0.25);
      addFrame( 0.0, 3.5, -11.5, 4.4, 0.22, 0.25);
      addFrame(-1.8, 2.0, -15.4, 0.22, 3.9, 0.22);
      addFrame( 1.8, 2.5, -15.4, 0.22, 4.6, 0.22);

      const movingBlock = addFrame(0.0, 1.2, -13.2, 0.9, 0.35, 0.9, 0xff7043);
      setMovingObstacles([
        ...movingObstacles,
        {
          mesh: movingBlock.mesh,
          box: movingBlock.box,
          originX: movingBlock.mesh.position.x,
          amplitude: 2.2,
          speed: 1.2,
          center: movingBlock.mesh.position
        }
      ]);

      const g1 = createFlightGate( 0.0, 1.0, -4.0,  0,            1.05);
      const g2 = createFlightGate(-0.8, 2.8, -8.4,  Math.PI / 10, 0.95);
      const g3 = createFlightGate( 0.9, 3.6, -12.0, -Math.PI / 8, 0.9);
      const g4 = createFlightGate(-0.7, 2.1, -16.0, Math.PI / 7,  0.95);
      const g5 = createFlightGate( 0.0, 1.15, -20.5, 0,           1.0);
      setLevelGates([...levelGates, g1, g2, g3, g4, g5]);

      const cp1 = createSoftCheckpoint(-0.1, 2.1, -9.9, 0, 0.95);
      const cp2 = createSoftCheckpoint(-0.2, 2.3, -16.8, 0, 0.95);
      setSoftCheckpoints([...softCheckpoints, cp1, cp2]);

      setLevelLandingPad(createLandingPad(0.0, -25.5, 0x66bb6a));

      const total = 6;
      setMissions([
        { title: `VERTICAL 1/${total}`, desc: "Aro 1 — entrada estable", check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: `VERTICAL 2/${total}`, desc: "Aro 2 — ascenso rápido", check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: `VERTICAL 3/${total}`, desc: "Aro 3 — techo del eje, máxima altura", check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: `VERTICAL 4/${total}`, desc: "Aro 4 — descenso controlado entre columnas", check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: `VERTICAL 5/${total}`, desc: "Aro 5 — evita el bloque móvil y estabiliza", check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: `VERTICAL 6/${total}`, desc: "Aterriza en el helipuerto verde", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 11 – Reflejos y Decisión
  // ----------------------------------------------------------------
  {
    name: "NIVEL 11",
    subtitle: "Reflejos y Decisión",
    desc: "Resuelve una ruta dinámica: gate móvil de reacción y bifurcación táctica izquierda/derecha.",
    objectives: [
      "Intercepta un aro móvil de reacción",
      "Elige una ruta (izquierda o derecha) en tiempo real",
      "Completa la secuencia de tu ruta elegida",
      "Converge al tramo final y aterriza"
    ],
    windScale: 2.0,
    windDir: new THREE.Vector3(0.7, 0, 0.35),
    setup() {
      DIFFICULTY.batteryOn = true;
      DIFFICULTY.batteryTime = 75;

      const addSplitterWall = (x, z, w, h, ry = 0) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 0.25),
          new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.82 })
        );
        m.position.set(x, h / 2, z);
        m.rotation.y = ry;
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };

      addSplitterWall(0.0, -8.5, 4.6, 2.2, 0);
      addSplitterWall(-2.8, -13.2, 4.0, 2.2, Math.PI / 7);
      addSplitterWall( 2.8, -13.2, 4.0, 2.2, -Math.PI / 7);
      addSplitterWall(0.0, -19.5, 3.8, 2.0, 0);

      const g1 = createFlightGate(0.0, 1.3, -5.2, 0, 1.0);
      const g2L = createFlightGate(-3.2, 1.3, -11.2, Math.PI / 5, 0.95);
      const g2R = createFlightGate( 3.2, 1.3, -11.2, -Math.PI / 5, 0.95);
      const g3L = createFlightGate(-2.1, 2.3, -16.2, -Math.PI / 8, 0.9);
      const g3R = createFlightGate( 2.1, 2.3, -16.2, Math.PI / 8, 0.9);
      const g4 = createFlightGate(0.0, 1.4, -22.5, 0, 1.0);
      setLevelGates([...levelGates, g1, g2L, g2R, g3L, g3R, g4]);
      setMovingGate(g1);

      const cp1 = createSoftCheckpoint(0.0, 1.4, -8.8, 0, 1.0);
      const cp2 = createSoftCheckpoint(0.0, 1.7, -18.4, 0, 1.0);
      setSoftCheckpoints([...softCheckpoints, cp1, cp2]);

      setLevelSlickZones([
        ...levelSlickZones,
        createSlickZone(0, -17.0, 5.8, 6.2)
      ]);

      setLevelLandingPad(createLandingPad(0.0, -27.0, 0xff7043));

      let chosenRoute = null;
      const total = 5;
      setMissions([
        {
          title: `REACCIÓN 1/${total}`,
          desc: "Aro móvil de reacción — sincroniza entrada y crúzalo",
          check: () => checkGatePass(g1, 0.5),
          onComplete: () => g1.setSuccess(),
          hint: "No persigas el aro: predice su trayectoria lateral."
        },
        {
          title: `REACCIÓN 2/${total}`,
          desc: "Decide ruta: cruza IZQ o DER según apertura",
          check: () => {
            const leftPass = checkGatePass(g2L, 0.45);
            const rightPass = checkGatePass(g2R, 0.45);
            if (leftPass) chosenRoute = 'L';
            if (rightPass) chosenRoute = 'R';
            return leftPass || rightPass;
          },
          onComplete: () => {
            if (chosenRoute === 'L') {
              g2L.setSuccess();
              g2R.ringMat.opacity = 0.35;
              g2R.gateLight.intensity = 0.2;
            } else {
              g2R.setSuccess();
              g2L.ringMat.opacity = 0.35;
              g2L.gateLight.intensity = 0.2;
            }
          }
        },
        {
          title: `REACCIÓN 3/${total}`,
          desc: "Completa la secuencia de tu ruta elegida",
          check: () => (chosenRoute === 'L'
            ? checkGatePass(g3L, 0.45)
            : checkGatePass(g3R, 0.45)),
          onComplete: () => {
            if (chosenRoute === 'L') {
              g3L.setSuccess();
            } else {
              g3R.setSuccess();
            }
          }
        },
        {
          title: `REACCIÓN 4/${total}`,
          desc: "Converge al aro final central",
          check: () => checkGatePass(g4, 0.45),
          onComplete: () => g4.setSuccess()
        },
        { title: `REACCIÓN 5/${total}`, desc: "Aterriza en el helipuerto naranja", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 12 – Nave Industrial
  // ----------------------------------------------------------------
  {
    name: "NIVEL 12",
    subtitle: "Nave Industrial",
    desc: "Circuito indoor por carriles y columnas en una nave cerrada.",
    objectives: [
      "Cruza 5 aros en pasillos de la nave",
      "Evita columnas y divisores de carril",
      "Gestiona una franja de VPS ciego central",
      "Aterriza en la plataforma de servicio"
    ],
    windScale: 1.2,
    windDir: new THREE.Vector3(0.3, 0, 0.22),
    setup() {
      const addBox = (x, y, z, sx, sy, sz, color = 0x616161) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy, sz),
          new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
        );
        m.position.set(x, y, z);
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };

      // Hall shell
      addBox(0, 1.35, -20, 28, 2.7, 0.5);
      addBox(0, 1.35, -4,  28, 2.7, 0.5);
      addBox(-14, 1.35, -12, 0.5, 2.7, 16.5);
      addBox( 14, 1.35, -12, 0.5, 2.7, 16.5);

      // Corridor dividers + columns
      addBox(-4.0, 1.0, -10.2, 0.35, 2.0, 5.0, 0x4e342e);
      addBox( 4.1, 1.0, -14.8, 0.35, 2.0, 5.0, 0x4e342e);
      addBox( 0.0, 1.0, -18.4, 6.0, 2.0, 0.35, 0x4e342e);

      const addPillar = (x, z, h) => addBox(x, h / 2, z, 0.55, h, 0.55, 0x455a64);
      addPillar(-7.5, -8.0, 2.4);
      addPillar( 7.0, -9.8, 2.3);
      addPillar(-6.0, -15.0, 2.6);
      addPillar( 6.2, -17.2, 2.5);

      const g1 = createFlightGate( 0.0, 1.1, -6.1,  0,            1.0);
      const g2 = createFlightGate(-6.8, 1.2, -9.4,  Math.PI / 10, 0.95);
      const g3 = createFlightGate( 6.6, 1.2, -12.9, -Math.PI / 8, 0.95);
      const g4 = createFlightGate(-5.4, 1.5, -16.8, Math.PI / 9,  0.95);
      const g5 = createFlightGate( 0.0, 1.3, -21.2, 0,            1.0);
      setLevelGates([...levelGates, g1, g2, g3, g4, g5]);

      const cp1 = createSoftCheckpoint(-0.2, 1.2, -11.4, 0, 1.0);
      const cp2 = createSoftCheckpoint(-0.2, 1.4, -18.3, 0, 1.0);
      setSoftCheckpoints([...softCheckpoints, cp1, cp2]);

      setLevelSlickZones([
        ...levelSlickZones,
        createSlickZone(0.0, -14.2, 8.0, 5.2)
      ]);

      setLevelLandingPad(createLandingPad(0, -24.8, 0x4dd0e1));

      const total = 6;
      setMissions([
        { title: `NAVE 1/${total}`, desc: "Aro 1 — entrada al hangar", check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: `NAVE 2/${total}`, desc: "Aro 2 — carril izquierdo", check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: `NAVE 3/${total}`, desc: "Aro 3 — cruce al carril derecho", check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: `NAVE 4/${total}`, desc: "Aro 4 — vuelve con ascenso corto", check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: `NAVE 5/${total}`, desc: "Aro 5 — salida recta", check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: `NAVE 6/${total}`, desc: "Aterriza en la plataforma cian", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 13 – Atrio Vertical
  // ----------------------------------------------------------------
  {
    name: "NIVEL 13",
    subtitle: "Atrio Vertical",
    desc: "Ascensos y descensos en espacio interior con pasarelas y vigas.",
    objectives: [
      "Completa 5 aros en eje vertical interior",
      "Esquiva vigas a media altura",
      "Controla el descenso en espacio estrecho",
      "Aterriza al pie del atrio"
    ],
    windScale: 1.4,
    windDir: new THREE.Vector3(0.35, 0, -0.2),
    setup() {
      const addBox = (x, y, z, sx, sy, sz, color = 0x546e7a) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy, sz),
          new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.1 })
        );
        m.position.set(x, y, z);
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };

      // Atrium limits
      addBox(0, 2.2, -14, 18, 0.4, 0.5);
      addBox(0, 2.2, -4,  18, 0.4, 0.5);
      addBox(-9, 2.2, -9, 0.5, 4.4, 10.5);
      addBox( 9, 2.2, -9, 0.5, 4.4, 10.5);

      // Vertical structure and beams
      addBox(0, 1.8, -9.0, 0.4, 3.6, 0.4, 0x37474f);
      addBox(-3.2, 2.5, -11.8, 4.2, 0.25, 0.25, 0x6d4c41);
      addBox( 3.0, 2.9, -8.5,  4.4, 0.25, 0.25, 0x6d4c41);
      addBox( 0.0, 3.2, -13.8, 5.0, 0.25, 0.25, 0x6d4c41);

      const g1 = createFlightGate( 0.0, 1.1, -5.8, 0,            1.0);
      const g2 = createFlightGate(-2.4, 2.5, -8.1, Math.PI / 8,  0.92);
      const g3 = createFlightGate( 2.3, 3.3, -10.8, -Math.PI/10, 0.9);
      const g4 = createFlightGate(-1.9, 2.2, -13.6, Math.PI / 9, 0.92);
      const g5 = createFlightGate( 0.0, 1.2, -16.8, 0,           0.98);
      setLevelGates([...levelGates, g1, g2, g3, g4, g5]);

      const cp1 = createSoftCheckpoint(0.0, 2.1, -9.8, 0, 0.95);
      const cp2 = createSoftCheckpoint(0.0, 2.0, -14.9, 0, 0.95);
      setSoftCheckpoints([...softCheckpoints, cp1, cp2]);

      setLevelLandingPad(createLandingPad(0, -19.8, 0x66bb6a));

      const total = 6;
      setMissions([
        { title: `ATRIO 1/${total}`, desc: "Aro 1 — base del atrio", check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: `ATRIO 2/${total}`, desc: "Aro 2 — asciende junto a la columna", check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: `ATRIO 3/${total}`, desc: "Aro 3 — nivel alto entre vigas", check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: `ATRIO 4/${total}`, desc: "Aro 4 — descenso controlado", check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: `ATRIO 5/${total}`, desc: "Aro 5 — estabiliza y prepara final", check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: `ATRIO 6/${total}`, desc: "Aterriza en el helipuerto verde", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 14 – Pasillos Cruzados
  // ----------------------------------------------------------------
  {
    name: "NIVEL 14",
    subtitle: "Pasillos Cruzados",
    desc: "Navegación indoor de reacción: cruces rápidos y barreras móviles.",
    objectives: [
      "Supera 5 aros en cruces de pasillo",
      "Sincroniza paso por un aro móvil",
      "Mantén control entre paredes cerradas",
      "Aterriza sin colisión final"
    ],
    windScale: 1.7,
    windDir: new THREE.Vector3(0.55, 0, 0.28),
    setup() {
      const addWall = (x, z, w, h, ry = 0) => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.86 })
        );
        m.position.set(x, h / 2, z);
        m.rotation.y = ry;
        m.castShadow = true;
        scene.add(m);
        m.updateWorldMatrix(true, false);
        setLevelObjects([...levelObjects, m]);
        setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
      };

      addWall(0, -7.0, 6.0, 2.1, 0);
      addWall(-4.0, -10.8, 5.8, 2.1, Math.PI / 9);
      addWall( 4.0, -10.9, 5.8, 2.1, -Math.PI / 9);
      addWall(0, -14.8, 6.6, 2.1, 0);
      addWall(-3.8, -18.7, 5.2, 2.1, Math.PI / 8);
      addWall( 3.7, -18.6, 5.2, 2.1, -Math.PI / 8);

      const g1 = createFlightGate( 0.0, 1.2, -5.5, 0,            1.0);
      const g2 = createFlightGate(-2.8, 1.4, -9.6, Math.PI / 6,  0.95);
      const g3 = createFlightGate( 2.9, 1.4, -13.0, -Math.PI / 6, 0.95);
      const g4 = createFlightGate( 0.0, 1.8, -17.1, 0,           0.92);
      const g5 = createFlightGate( 0.0, 1.2, -21.3, 0,           1.0);
      setLevelGates([...levelGates, g1, g2, g3, g4, g5]);
      setMovingGate(g4);

      const cp1 = createSoftCheckpoint(0.0, 1.4, -11.7, 0, 1.0);
      const cp2 = createSoftCheckpoint(0.0, 1.5, -19.7, 0, 1.0);
      setSoftCheckpoints([...softCheckpoints, cp1, cp2]);

      setLevelLandingPad(createLandingPad(0, -25.0, 0xffb74d));

      const total = 6;
      setMissions([
        { title: `PASILLOS 1/${total}`, desc: "Aro 1 — entrada al cruce", check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: `PASILLOS 2/${total}`, desc: "Aro 2 — giro izquierda", check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: `PASILLOS 3/${total}`, desc: "Aro 3 — cambio rápido a derecha", check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: `PASILLOS 4/${total}`, desc: "Aro 4 móvil — sincroniza tu pasada", check: () => checkGatePass(g4, 0.5), onComplete: () => g4.setSuccess() },
        { title: `PASILLOS 5/${total}`, desc: "Aro 5 — estabiliza para aterrizar", check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: `PASILLOS 6/${total}`, desc: "Aterriza en la plataforma ámbar", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 15 – Muelle de Carga
  // ----------------------------------------------------------------
  {
    name: "NIVEL 15",
    subtitle: "Muelle de Carga",
    desc: "Recorrido interior entre estanterías y huecos de carga con toma de decisiones rápidas.",
    objectives: [
      "Encadena 6 aros en el muelle",
      "Cruza huecos estrechos entre estanterías",
      "Mantén control con viento moderado",
      "Aterriza en zona de despacho"
    ],
    windScale: 1.5,
    windDir: new THREE.Vector3(0.45, 0, 0.3),
    setup() {
      const addRack = (x, z, h = 2.4) => {
        const postMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.82 });
        const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.75 });
        const parts = [];
        [[-0.7,-0.5],[0.7,-0.5],[-0.7,0.5],[0.7,0.5]].forEach(([px,pz]) => {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), postMat);
          p.position.set(x + px, h / 2, z + pz);
          p.castShadow = true;
          scene.add(p);
          p.updateWorldMatrix(true, false);
          parts.push(p);
        });
        [0.8, 1.6].forEach((yy) => {
          const s = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.1), shelfMat);
          s.position.set(x, yy, z);
          s.castShadow = true;
          scene.add(s);
          s.updateWorldMatrix(true, false);
          parts.push(s);
        });
        parts.forEach((m) => {
          setLevelObjects([...levelObjects, m]);
          setObstacles([...obstacles, { box: new THREE.Box3().setFromObject(m), mesh: m }]);
        });
      };

      addRack(-5.5, -8.5);
      addRack( 5.5, -8.8);
      addRack(-5.0, -14.8);
      addRack( 5.2, -15.2);
      addRack( 0.0, -19.2, 2.0);

      const g1 = createFlightGate( 0.0, 1.2, -5.2, 0,           1.0);
      const g2 = createFlightGate(-2.8, 1.3, -9.5, Math.PI / 7, 0.95);
      const g3 = createFlightGate( 2.9, 1.3, -11.9, -Math.PI/7, 0.95);
      const g4 = createFlightGate(-2.5, 1.6, -15.7, Math.PI / 8, 0.92);
      const g5 = createFlightGate( 2.6, 1.6, -18.1, -Math.PI/8, 0.92);
      const g6 = createFlightGate( 0.0, 1.2, -22.0, 0,          1.0);
      setLevelGates([...levelGates, g1, g2, g3, g4, g5, g6]);

      const cp1 = createSoftCheckpoint(0.0, 1.35, -12.9, 0, 1.0);
      const cp2 = createSoftCheckpoint(0.0, 1.45, -20.0, 0, 1.0);
      setSoftCheckpoints([...softCheckpoints, cp1, cp2]);

      setLevelSlickZones([
        ...levelSlickZones,
        createSlickZone(0, -16.4, 5.6, 4.4)
      ]);

      setLevelLandingPad(createLandingPad(0.0, -25.6, 0xff7043));

      const total = 7;
      setMissions([
        { title: `MUELLE 1/${total}`, desc: "Aro 1 — entrada al almacén", check: () => checkGatePass(g1, 0.45), onComplete: () => g1.setSuccess() },
        { title: `MUELLE 2/${total}`, desc: "Aro 2 — pasillo izquierdo", check: () => checkGatePass(g2, 0.45), onComplete: () => g2.setSuccess() },
        { title: `MUELLE 3/${total}`, desc: "Aro 3 — cambio de carril derecho", check: () => checkGatePass(g3, 0.45), onComplete: () => g3.setSuccess() },
        { title: `MUELLE 4/${total}`, desc: "Aro 4 — evita estantería central", check: () => checkGatePass(g4, 0.45), onComplete: () => g4.setSuccess() },
        { title: `MUELLE 5/${total}`, desc: "Aro 5 — transición corta", check: () => checkGatePass(g5, 0.45), onComplete: () => g5.setSuccess() },
        { title: `MUELLE 6/${total}`, desc: "Aro 6 — salida y estabilización", check: () => checkGatePass(g6, 0.45), onComplete: () => g6.setSuccess() },
        { title: `MUELLE 7/${total}`, desc: "Aterriza en la zona naranja", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 16 – Entrenamiento: Giro Suave
  // ----------------------------------------------------------------
  {
    name: "NIVEL 16",
    subtitle: "Entrenamiento de Giro",
    desc: "Nivel de práctica guiada con objetivos suaves para aprender giro coordinado sin castigo duro.",
    objectives: [
      "Completa 6 objetivos transparentes en curva progresiva",
      "Sin aros rígidos: entrenamiento tolerante para principiantes",
      "Practica yaw + inclinación para mantener trayectoria",
      "Aterriza en la plataforma final"
    ],
    windScale: 0.6,
    windDir: new THREE.Vector3(0.2, 0, 0.12),
    setup() {
      DIFFICULTY.batteryOn = false;
      DIFFICULTY.turbOn = false;

      const targets = [
        createSoftCheckpoint( 0.0, 1.2, -4.5,  0,            1.2),
        createSoftCheckpoint( 2.5, 1.2, -7.0,  Math.PI / 8,  1.2),
        createSoftCheckpoint( 4.0, 1.3, -10.2, Math.PI / 5,  1.2),
        createSoftCheckpoint( 3.0, 1.3, -13.8, Math.PI / 3,  1.2),
        createSoftCheckpoint( 0.8, 1.2, -16.8, Math.PI / 2,  1.2),
        createSoftCheckpoint(-1.8, 1.2, -19.5, Math.PI * 0.6, 1.2)
      ];
      setSoftCheckpoints([...softCheckpoints, ...targets]);

      setLevelLandingPad(createLandingPad(-3.8, -23.5, 0x4fc3f7));

      const total = 7;
      setMissions([
        { title: `GIRO 1/${total}`, desc: "Objetivo suave 1 — entrada estable", check: () => targets[0].check(0.62), onComplete: () => targets[0].setActivated(), hint: "Gira poco a poco con yaw, sin sobrecorregir." },
        { title: `GIRO 2/${total}`, desc: "Objetivo suave 2 — inicia el arco", check: () => targets[1].check(0.62), onComplete: () => targets[1].setActivated() },
        { title: `GIRO 3/${total}`, desc: "Objetivo suave 3 — mantén radio constante", check: () => targets[2].check(0.62), onComplete: () => targets[2].setActivated() },
        { title: `GIRO 4/${total}`, desc: "Objetivo suave 4 — sigue la curva", check: () => targets[3].check(0.62), onComplete: () => targets[3].setActivated() },
        { title: `GIRO 5/${total}`, desc: "Objetivo suave 5 — salida controlada", check: () => targets[4].check(0.62), onComplete: () => targets[4].setActivated() },
        { title: `GIRO 6/${total}`, desc: "Objetivo suave 6 — estabiliza rumbo", check: () => targets[5].check(0.62), onComplete: () => targets[5].setActivated() },
        { title: `GIRO 7/${total}`, desc: "Aterriza en la plataforma azul clara", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 17 – Entrenamiento: Altura 3D
  // ----------------------------------------------------------------
  {
    name: "NIVEL 17",
    subtitle: "Entrenamiento Vertical",
    desc: "Práctica de ascensos y descensos con objetivos transparentes y amplio margen.",
    objectives: [
      "Completa 6 objetivos suaves en eje vertical",
      "Aprende control de throttle en cambios de altura",
      "Ajusta yaw/pitch para alinearte en 3D",
      "Finaliza con aterrizaje preciso"
    ],
    windScale: 0.7,
    windDir: new THREE.Vector3(0.15, 0, -0.1),
    setup() {
      DIFFICULTY.batteryOn = false;
      DIFFICULTY.turbOn = false;

      const targets = [
        createSoftCheckpoint( 0.0, 1.0, -4.0, 0,             1.2),
        createSoftCheckpoint( 0.0, 1.8, -7.5, 0,             1.15),
        createSoftCheckpoint( 0.0, 2.7, -11.0, 0,            1.1),
        createSoftCheckpoint( 0.0, 3.4, -14.6, 0,            1.05),
        createSoftCheckpoint( 0.0, 2.3, -18.0, Math.PI / 10, 1.1),
        createSoftCheckpoint( 0.0, 1.3, -21.6, Math.PI / 8,  1.15)
      ];
      setSoftCheckpoints([...softCheckpoints, ...targets]);

      setLevelLandingPad(createLandingPad(0.0, -25.0, 0x81c784));

      const total = 7;
      setMissions([
        { title: `VERT 1/${total}`, desc: "Objetivo suave 1 — despegue y avance", check: () => targets[0].check(0.65), onComplete: () => targets[0].setActivated() },
        { title: `VERT 2/${total}`, desc: "Objetivo suave 2 — primer ascenso", check: () => targets[1].check(0.65), onComplete: () => targets[1].setActivated(), hint: "Sube suave: evita cambios bruscos de acelerador." },
        { title: `VERT 3/${total}`, desc: "Objetivo suave 3 — mantiene altura media", check: () => targets[2].check(0.65), onComplete: () => targets[2].setActivated() },
        { title: `VERT 4/${total}`, desc: "Objetivo suave 4 — techo del ejercicio", check: () => targets[3].check(0.65), onComplete: () => targets[3].setActivated() },
        { title: `VERT 5/${total}`, desc: "Objetivo suave 5 — descenso controlado", check: () => targets[4].check(0.65), onComplete: () => targets[4].setActivated() },
        { title: `VERT 6/${total}`, desc: "Objetivo suave 6 — estabiliza para final", check: () => targets[5].check(0.65), onComplete: () => targets[5].setActivated() },
        { title: `VERT 7/${total}`, desc: "Aterriza en la plataforma verde", check: () => false }
      ]);
    }
  },

  // ----------------------------------------------------------------
  // NIVEL 18 – Entrenamiento: Transiciones
  // ----------------------------------------------------------------
  {
    name: "NIVEL 18",
    subtitle: "Transiciones Combinadas",
    desc: "Ejercicio de coordinación total: yaw, roll, pitch y altura con objetivos suaves secuenciales.",
    objectives: [
      "Completa 7 objetivos transparentes en S dinámica",
      "Sin penalización rígida de colisión en objetivos",
      "Practica transiciones izquierda-derecha con cambios de altura",
      "Cierra con aterrizaje estable"
    ],
    windScale: 0.9,
    windDir: new THREE.Vector3(0.22, 0, 0.16),
    setup() {
      DIFFICULTY.batteryOn = false;
      DIFFICULTY.turbOn = false;

      const targets = [
        createSoftCheckpoint( 0.0, 1.1, -4.2,   0,            1.15),
        createSoftCheckpoint(-2.8, 1.4, -7.0,  -Math.PI / 7,  1.1),
        createSoftCheckpoint( 2.8, 1.7, -10.2,  Math.PI / 7,  1.1),
        createSoftCheckpoint(-3.4, 2.1, -13.8, -Math.PI / 6,  1.05),
        createSoftCheckpoint( 3.3, 2.0, -17.2,  Math.PI / 6,  1.05),
        createSoftCheckpoint(-1.2, 1.5, -20.8, -Math.PI / 9,  1.1),
        createSoftCheckpoint( 0.0, 1.2, -24.3,  0,            1.15)
      ];
      setSoftCheckpoints([...softCheckpoints, ...targets]);

      setLevelLandingPad(createLandingPad(0.0, -28.2, 0xffb74d));

      const total = 8;
      setMissions([
        { title: `TRANS 1/${total}`, desc: "Objetivo suave 1 — entra en línea", check: () => targets[0].check(0.66), onComplete: () => targets[0].setActivated() },
        { title: `TRANS 2/${total}`, desc: "Objetivo suave 2 — transición izquierda", check: () => targets[1].check(0.66), onComplete: () => targets[1].setActivated() },
        { title: `TRANS 3/${total}`, desc: "Objetivo suave 3 — revierte a derecha", check: () => targets[2].check(0.66), onComplete: () => targets[2].setActivated() },
        { title: `TRANS 4/${total}`, desc: "Objetivo suave 4 — izquierda con ascenso", check: () => targets[3].check(0.66), onComplete: () => targets[3].setActivated(), hint: "Coordina yaw+roll y agrega throttle sólo lo justo." },
        { title: `TRANS 5/${total}`, desc: "Objetivo suave 5 — derecha manteniendo altura", check: () => targets[4].check(0.66), onComplete: () => targets[4].setActivated() },
        { title: `TRANS 6/${total}`, desc: "Objetivo suave 6 — reduce amplitud y centra", check: () => targets[5].check(0.66), onComplete: () => targets[5].setActivated() },
        { title: `TRANS 7/${total}`, desc: "Objetivo suave 7 — salida estabilizada", check: () => targets[6].check(0.66), onComplete: () => targets[6].setActivated() },
        { title: `TRANS 8/${total}`, desc: "Aterriza en la plataforma ámbar", check: () => false }
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
  setActiveRespawnCheckpoint({ pos: drone.pos.clone(), yaw: drone.yaw });
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
