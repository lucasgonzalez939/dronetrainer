/**
 * overlays.js – Level intro overlay, level progress panel, overlay open/close.
 */

import { currentLevel, setCurrentLevel, levelBestTimes, levelStars } from './state.js';
import { LEVEL_DEFS, loadLevel } from './levels.js';
import { loadProgress, resetProgress } from './progress.js';
import { loadFreestyle } from './freestyle.js';

const levelOverlay  = document.getElementById('level-overlay');
const ovLevelTitle  = document.getElementById('ov-level-title');
const ovSubtitle    = document.getElementById('ov-subtitle');
const ovDesc        = document.getElementById('ov-desc');
const ovObjectives  = document.getElementById('ov-objectives');
const btnStartLevel = document.getElementById('btn-start-level');
const btnPrevLevel  = document.getElementById('btn-prev-level');
const btnFreestyle  = document.getElementById('btn-freestyle');
const levelFade     = document.getElementById('level-fade');

// Smooth black fade then call fn, then fade back in
function fadeAndRun(fn) {
  levelFade.classList.add('fade-out');
  setTimeout(() => {
    fn();
    levelFade.classList.remove('fade-out');
    levelFade.classList.add('fade-in');
    setTimeout(() => levelFade.classList.remove('fade-in'), 360);
  }, 360);
}

export function showLevelOverlay(idx, isTransition) {
  const def = LEVEL_DEFS[idx];
  ovLevelTitle.textContent = def.name;
  ovSubtitle.textContent   = def.subtitle;
  ovDesc.textContent       = def.desc;

  let objectivesHtml = def.objectives.map(o => `<li>${o}</li>`).join('');

  // Show medal times if defined
  if (def.medalTimes) {
    const { gold, silver, bronze } = def.medalTimes;
    objectivesHtml += `<li style="color:#ffd700">🥇 Oro: &lt;${gold}s &nbsp; 🥈 Plata: &lt;${silver}s &nbsp; 🥉 Bronce: &lt;${bronze}s</li>`;
  }

  // Show best time if recorded
  if (levelBestTimes[idx] !== undefined) {
    const best = levelBestTimes[idx].toFixed(1);
    const stars = '⭐'.repeat(levelStars) + '☆'.repeat(3 - levelStars);
    objectivesHtml += `<li style="color:#00e5ff">⏱ Mejor tiempo: ${best}s &nbsp; ${stars}</li>`;
  }

  ovObjectives.innerHTML   = objectivesHtml;
  btnStartLevel.textContent = isTransition ? '▶ EMPEZAR NIVEL' : 'COMENZAR';
  btnPrevLevel.style.display  = (idx > 0) ? 'inline-block' : 'none';
  btnFreestyle.style.display  = 'none';
  levelOverlay.classList.add('active');
}

export function buildLevelProgressPanel() {
  const prog = loadProgress();
  const list = document.getElementById('lp-levels-list');
  list.innerHTML = '';
  LEVEL_DEFS.forEach((def, idx) => {
    const unlocked  = idx <= prog.maxUnlocked;
    const completed = prog.completed.includes(idx);
    const isCurrent = idx === currentLevel;

    const row = document.createElement('div');
    row.className = 'lp-level-row' + (unlocked ? '' : ' lp-level-locked');

    const numEl = document.createElement('div');
    numEl.className = 'lp-level-num' + (completed ? ' completed' : (unlocked ? ' unlocked' : ''));
    numEl.textContent = idx + 1;

    const info = document.createElement('div');
    info.className = 'lp-level-info';
    info.innerHTML = `<div class="lp-level-name">${def.name}</div><div class="lp-level-sub">${def.subtitle}</div>`;

    const badge = document.createElement('div');
    badge.className = 'lp-level-badge' + (completed ? ' done' : (isCurrent ? ' active' : ''));
    badge.textContent = completed ? '✓ HECHO' : (isCurrent ? 'ACTIVO' : (unlocked ? 'DESBLOQUEADO' : '🔒'));

    row.appendChild(numEl);
    row.appendChild(info);
    row.appendChild(badge);

    if (unlocked) {
      row.addEventListener('click', () => {
        closeLevelProgressOverlay();
        setCurrentLevel(idx);
        showLevelOverlay(idx, true);
      });
    }
    list.appendChild(row);
  });
}

export function openLevelProgressOverlay() {
  buildLevelProgressPanel();
  document.getElementById('level-progress-overlay').classList.add('active');
}

export function closeLevelProgressOverlay() {
  document.getElementById('level-progress-overlay').classList.remove('active');
}

export function initOverlayEvents() {
  btnStartLevel.addEventListener('click', () => {
    levelOverlay.classList.remove('active');
    fadeAndRun(() => loadLevel(currentLevel));
  });

  btnPrevLevel.addEventListener('click', () => {
    if (currentLevel > 0) {
      setCurrentLevel(currentLevel - 1);
      showLevelOverlay(currentLevel, true);
    }
  });

  btnFreestyle.addEventListener('click', () => {
    levelOverlay.classList.remove('active');
    fadeAndRun(() => loadFreestyle());
  });

  document.getElementById('btn-levels').addEventListener('click', openLevelProgressOverlay);
  document.getElementById('lp-btn-close').addEventListener('click', closeLevelProgressOverlay);

  document.getElementById('lp-btn-freestyle').addEventListener('click', () => {
    closeLevelProgressOverlay();
    setCurrentLevel(0);
    ovLevelTitle.textContent  = "MODO LIBRE";
    ovSubtitle.textContent    = "Sin misiones — vuela libremente";
    ovDesc.textContent        = "Explora el mapa, pasa por los aros y mejora tu tiempo.";
    ovObjectives.innerHTML    = "<li>Aros, pilares y paredes aleatorias</li><li>Viento configurable desde el panel inferior</li>";
    btnStartLevel.textContent = '▶ EMPEZAR NIVEL';
    btnFreestyle.style.display = 'inline-block';
    levelOverlay.classList.add('active');
  });

  document.getElementById('lp-btn-reset').addEventListener('click', () => {
    if (confirm('¿Reiniciar todo el progreso? Esto borrará todos los niveles completados.')) {
      resetProgress();
      buildLevelProgressPanel();
    }
  });
}
