/**
 * index.js – Central registry and loader for all Academy and Challenge levels.
 */

import { scene, setEnvironmentMode } from '../scene.js';
import { disposeObject } from '../assets.js';
import {
  drone, DIFFICULTY, FlightState,
  levelObjects, setLevelObjects,
  obstacles, setObstacles,
  levelSlickZones, setLevelSlickZones,
  levelGates, setLevelGates,
  levelLandingPad, setLevelLandingPad,
  movingGate, setMovingGate,
  movingObstacles, setMovingObstacles,
  softCheckpoints, setSoftCheckpoints,
  setActiveSoftCheckpointIdx, setActiveRespawnCheckpoint,
  missions, setMissions,
  setCurrentMissionIdx,
  setMissionTimer, setTimerRunning,
  currentLevel, setCurrentLevel,
  setWindVector, setIsFreestyleMode,
  setGateScores, setLevelStars, setHintRetries,
  setReplayBuffer, setReplaySample,
  setBatteryTimeLeft, setBatteryDepleted
} from '../state.js';
import { setFlightState } from '../flightState.js';
import { updateBatteryBar } from '../hud.js';

// Academy Levels (1 to 18)
import level01 from './academy/level-01.js';
import level02 from './academy/level-02.js';
import level03 from './academy/level-03.js';
import level04 from './academy/level-04.js';
import level05 from './academy/level-05.js';
import level06 from './academy/level-06.js';
import level07 from './academy/level-07.js';
import level08 from './academy/level-08.js';
import level09 from './academy/level-09.js';
import level10 from './academy/level-10.js';
import level11 from './academy/level-11.js';
import level12 from './academy/level-12.js';
import level13 from './academy/level-13.js';
import level14 from './academy/level-14.js';
import level15 from './academy/level-15.js';
import level16 from './academy/level-16.js';
import level17 from './academy/level-17.js';
import level18 from './academy/level-18.js';

// Challenge Levels (1 to 10)
import challenge01 from './challenges/challenge-01.js';
import challenge02 from './challenges/challenge-02.js';
import challenge03 from './challenges/challenge-03.js';
import challenge04 from './challenges/challenge-04.js';
import challenge05 from './challenges/challenge-05.js';
import challenge06 from './challenges/challenge-06.js';
import challenge07 from './challenges/challenge-07.js';
import challenge08 from './challenges/challenge-08.js';
import challenge09 from './challenges/challenge-09.js';
import challenge10 from './challenges/challenge-10.js';

export const LEVEL_DEFS = [
  level01, level02, level03, level04, level05, level06,
  level07, level08, level09, level10, level11, level12,
  level13, level14, level15, level16, level17, level18,
  challenge01, challenge02, challenge03, challenge04, challenge05,
  challenge06, challenge07, challenge08, challenge09, challenge10
];

const missionTitleEl = document.getElementById('mission-title');
const missionDescEl  = document.getElementById('mission-desc');
const missionTimerEl = document.getElementById('mission-timer');

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
  if (!def) return;

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
  if (missionTitleEl && currentMissions[0]) missionTitleEl.textContent = currentMissions[0].title;
  if (missionDescEl && currentMissions[0])  missionDescEl.textContent  = currentMissions[0].desc;
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
