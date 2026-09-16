/**
 * missions.js – Mission update logic, landing check, completion overlay,
 *               score/star system, hint display, and flight-path recording.
 */

import {
  drone, FlightState,
  missions, currentMissionIdx, setCurrentMissionIdx,
  missionTimer, setMissionTimer,
  timerRunning, setTimerRunning,
  levelLandingPad,
  currentLevel, setCurrentLevel,
  isFreestyleMode,
  gateScores, setGateScores,
  levelStars, setLevelStars,
  hintRetries, setHintRetries,
  replayBuffer, setReplayBuffer,
  replaySample, setReplaySample,
  setLevelBestTime, levelBestTimes
} from './state.js';
import { LEVEL_DEFS } from './levels.js';
import { unlockNextLevel } from './progress.js';
import { showLevelOverlay } from './overlays.js';

const missionTitleEl = document.getElementById('mission-title');
const missionDescEl  = document.getElementById('mission-desc');
const missionTimerEl = document.getElementById('mission-timer');
const missionHintEl  = document.getElementById('mission-hint');

const levelOverlay = document.getElementById('level-overlay');
const ovLevelTitle = document.getElementById('ov-level-title');
const ovSubtitle   = document.getElementById('ov-subtitle');
const ovDesc       = document.getElementById('ov-desc');
const ovObjectives = document.getElementById('ov-objectives');
const btnStartLevel= document.getElementById('btn-start-level');
const btnFreestyle = document.getElementById('btn-freestyle');
const btnPrevLevel = document.getElementById('btn-prev-level');

// ── Replay recording constants ────────────────────────────────────────────
const REPLAY_SAMPLE_INTERVAL = 0.05; // seconds between samples

export function updateMissionLogic(dt) {
  if (timerRunning) {
    const newTimer = missionTimer + dt;
    setMissionTimer(newTimer);
    const mins = Math.floor(newTimer / 60);
    const secs = (newTimer % 60).toFixed(1);
    if (missionTimerEl) missionTimerEl.textContent = `TIEMPO: ${mins.toString().padStart(2,'0')}:${secs.padStart(4,'0')}`;
  }

  // Record flight path for replay
  if (timerRunning && drone.state === FlightState.FLYING) {
    const newSample = replaySample + dt;
    setReplaySample(newSample);
    if (newSample >= REPLAY_SAMPLE_INTERVAL) {
      setReplaySample(0);
      setReplayBuffer([...replayBuffer, { x: drone.pos.x, y: drone.pos.y, z: drone.pos.z }]);
    }
  }

  if (currentMissionIdx < missions.length) {
    const m = missions[currentMissionIdx];
    if (m.check && m.check()) {
      // ── Score this gate pass ────────────────────────────────────────────
      const speedH = Math.hypot(drone.vel.x, drone.vel.z);
      const gateScore = {
        index:    currentMissionIdx,
        speed:    +speedH.toFixed(2),
        time:     +missionTimer.toFixed(2)
      };
      setGateScores([...gateScores, gateScore]);

      if (m.onComplete) m.onComplete();
      const nextIdx = currentMissionIdx + 1;
      setCurrentMissionIdx(nextIdx);
      if (nextIdx < missions.length) {
        if (missionTitleEl) missionTitleEl.textContent = missions[nextIdx].title;
        if (missionDescEl)  missionDescEl.textContent  = missions[nextIdx].desc;
        _showHint(nextIdx, false);
      } else {
        if (missionTitleEl) missionTitleEl.textContent = "¡CIRCUITO COMPLETADO!";
        if (missionTitleEl) missionTitleEl.style.color = "#00ffcc";
        if (missionDescEl)  missionDescEl.textContent  = "¡Todos los puntos de control aprobados!";
        if (missionHintEl)  missionHintEl.style.display = 'none';
        setTimerRunning(false);
      }
    }
  }
}

// ── Hint management ──────────────────────────────────────────────────────
// Called when a level is retried — increments retry counter for current step
export function recordMissionRetry() {
  const idx = currentMissionIdx;
  const current = hintRetries[idx] || 0;
  const updated = { ...hintRetries, [idx]: current + 1 };
  setHintRetries(updated);
  _showHint(idx, true);
}

function _showHint(missionIdx, forceIfThreshold) {
  if (!missionHintEl) return;
  const m = missions[missionIdx];
  if (!m || !m.hint) { missionHintEl.style.display = 'none'; return; }
  const retries = hintRetries[missionIdx] || 0;
  if (forceIfThreshold && retries < 3) { missionHintEl.style.display = 'none'; return; }
  if (!forceIfThreshold) { missionHintEl.style.display = 'none'; return; }
  missionHintEl.textContent = '💡 ' + m.hint;
  missionHintEl.style.display = 'block';
}

export function checkMissionLanding() {
  const lastMission = missions.length - 1;
  if (currentMissionIdx === lastMission && levelLandingPad) {
    const padPos = levelLandingPad.position;
    const landRadius = levelLandingPad._precisionRadius || 1.0;
    const dist = Math.hypot(drone.pos.x - padPos.x, drone.pos.z - padPos.z);
    if (dist <= landRadius) {
      setCurrentMissionIdx(currentMissionIdx + 1);
      setTimerRunning(false);

      // ── Compute star rating ─────────────────────────────────────────────
      _computeStars(currentLevel, missionTimer);

      unlockNextLevel(currentLevel);

      const isLastLevel = (currentLevel >= LEVEL_DEFS.length - 1);
      if (isLastLevel) {
        if (missionTitleEl) missionTitleEl.textContent = "🏆 ¡ACADEMIA COMPLETADA!";
        if (missionTitleEl) missionTitleEl.style.color = "#ffd700";
        if (missionDescEl)  missionDescEl.textContent  = "¡Has dominado todos los niveles! Eres un piloto élite.";
        setTimeout(() => showCompletionOverlay(), 1200);
      } else {
        if (missionTitleEl) missionTitleEl.textContent = "¡NIVEL SUPERADO!";
        if (missionTitleEl) missionTitleEl.style.color = "#00e676";
        if (missionDescEl)  missionDescEl.textContent  = `¡Prepárate para el ${LEVEL_DEFS[currentLevel + 1].name}!`;
        setTimeout(() => {
          setCurrentLevel(currentLevel + 1);
          showLevelOverlay(currentLevel, true);
        }, 1500);
      }
    }
  }
}

// ── Star computation ──────────────────────────────────────────────────────
function _computeStars(levelIdx, finalTime) {
  const def = LEVEL_DEFS[levelIdx];
  let stars = 1; // at least 1 for finishing

  if (def.medalTimes) {
    if (finalTime <= def.medalTimes.gold)   stars = 3;
    else if (finalTime <= def.medalTimes.silver) stars = 2;
  } else {
    // Default: based on per-gate speed scores
    const avgSpeed = gateScores.length > 0
      ? gateScores.reduce((s, g) => s + g.speed, 0) / gateScores.length
      : 0;
    if (avgSpeed > 2.0) stars = 3;
    else if (avgSpeed > 1.0) stars = 2;
  }
  setLevelStars(stars);

  // Update best time
  if (!levelBestTimes[levelIdx] || finalTime < levelBestTimes[levelIdx]) {
    setLevelBestTime(levelIdx, finalTime);
  }
}

export function getLevelStarsText() {
  return '⭐'.repeat(levelStars) + '☆'.repeat(3 - levelStars);
}

export function showCompletionOverlay() {
  ovLevelTitle.textContent  = "🏆 ACADEMIA COMPLETADA";
  ovSubtitle.textContent    = "¡Piloto de élite!";
  ovDesc.textContent        = "Has superado todos los niveles con éxito. ¡Felicidades!";
  ovObjectives.innerHTML    = "<li>Puedes seguir practicando en Modo Libre</li><li>Obstáculos aleatorios y viento configurable</li>";
  btnStartLevel.textContent = "↺ JUGAR DE NUEVO";
  btnFreestyle.style.display = 'inline-block';
  btnPrevLevel.style.display = 'none';
  levelOverlay.classList.add('active');
  setCurrentLevel(0);
}
