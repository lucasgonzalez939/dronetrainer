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
         createWaypoint, createOrbitGates, createInspectionTower, createGhostDrone } from './gates.js';
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
      "Orbita la torre: pasa por los 6 aros del circuito circular",
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

      // 6 orbit gates at radius 3.5m around the tower
      const orbitGates = createOrbitGates(0, 1.6, -14, 3.5, 6, 1.2);
      setLevelGates([...levelGates, ...orbitGates]);

      // Full orbit zone is a VPS-loss zone
      setLevelSlickZones([...levelSlickZones, createSlickZone(0, -14, 9, 9)]);

      setLevelLandingPad(createLandingPad(0, -14, 0xffd54f));

      const total = 7;
      setMissions([
        { title: `ÓRBITA 1/${total}`, desc: "Aro 1 — inicia la órbita en sentido horario", check: () => checkGatePass(orbitGates[0], 0.5), onComplete: () => orbitGates[0].setSuccess(), hint: "Vuela a ~1.6 m de altura y mantén la torre a tu derecha." },
        { title: `ÓRBITA 2/${total}`, desc: "Aro 2 — continúa la curva, VPS perdido", check: () => checkGatePass(orbitGates[1], 0.5), onComplete: () => orbitGates[1].setSuccess() },
        { title: `ÓRBITA 3/${total}`, desc: "Aro 3 — mitad de la órbita", check: () => checkGatePass(orbitGates[2], 0.5), onComplete: () => orbitGates[2].setSuccess() },
        { title: `ÓRBITA 4/${total}`, desc: "Aro 4 — lado opuesto de la torre", check: () => checkGatePass(orbitGates[3], 0.5), onComplete: () => orbitGates[3].setSuccess() },
        { title: `ÓRBITA 5/${total}`, desc: "Aro 5 — recta final de la órbita", check: () => checkGatePass(orbitGates[4], 0.5), onComplete: () => orbitGates[4].setSuccess() },
        { title: `ÓRBITA 6/${total}`, desc: "Aro 6 — cierre del circuito", check: () => checkGatePass(orbitGates[5], 0.5), onComplete: () => orbitGates[5].setSuccess() },
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
