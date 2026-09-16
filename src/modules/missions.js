/**
 * missions.js – Mission update logic, landing check, completion overlay.
 */

import {
  drone, FlightState,
  missions, currentMissionIdx, setCurrentMissionIdx,
  missionTimer, setMissionTimer,
  timerRunning, setTimerRunning,
  levelLandingPad,
  currentLevel, setCurrentLevel,
  isFreestyleMode
} from './state.js';
import { LEVEL_DEFS } from './levels.js';
import { unlockNextLevel } from './progress.js';
import { showLevelOverlay } from './overlays.js';

const missionTitleEl = document.getElementById('mission-title');
const missionDescEl  = document.getElementById('mission-desc');
const missionTimerEl = document.getElementById('mission-timer');

const levelOverlay = document.getElementById('level-overlay');
const ovLevelTitle = document.getElementById('ov-level-title');
const ovSubtitle   = document.getElementById('ov-subtitle');
const ovDesc       = document.getElementById('ov-desc');
const ovObjectives = document.getElementById('ov-objectives');
const btnStartLevel= document.getElementById('btn-start-level');
const btnFreestyle = document.getElementById('btn-freestyle');
const btnPrevLevel = document.getElementById('btn-prev-level');

export function updateMissionLogic(dt) {
  if (timerRunning) {
    const newTimer = missionTimer + dt;
    setMissionTimer(newTimer);
    const mins = Math.floor(newTimer / 60);
    const secs = (newTimer % 60).toFixed(1);
    if (missionTimerEl) missionTimerEl.textContent = `TIEMPO: ${mins.toString().padStart(2,'0')}:${secs.padStart(4,'0')}`;
  }

  if (currentMissionIdx < missions.length) {
    const m = missions[currentMissionIdx];
    if (m.check && m.check()) {
      if (m.onComplete) m.onComplete();
      const nextIdx = currentMissionIdx + 1;
      setCurrentMissionIdx(nextIdx);
      if (nextIdx < missions.length) {
        if (missionTitleEl) missionTitleEl.textContent = missions[nextIdx].title;
        if (missionDescEl)  missionDescEl.textContent  = missions[nextIdx].desc;
      } else {
        if (missionTitleEl) missionTitleEl.textContent = "¡CIRCUITO COMPLETADO!";
        if (missionTitleEl) missionTitleEl.style.color = "#00ffcc";
        if (missionDescEl)  missionDescEl.textContent  = "¡Todos los puntos de control aprobados!";
        setTimerRunning(false);
      }
    }
  }
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
