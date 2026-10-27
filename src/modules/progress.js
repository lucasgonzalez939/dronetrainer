/**
 * progress.js – localStorage persistence for level progress, stars, and best times.
 */

const PROGRESS_KEY = 'dronetrainer_progress_v2';
const PROGRESS_KEY_LEGACY = 'dronetrainer_progress_v1';

export function loadProgress() {
  try {
    let raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      // Migrate from v1 if present
      const legacyRaw = localStorage.getItem(PROGRESS_KEY_LEGACY);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        return {
          completed: Array.isArray(legacy?.completed) ? legacy.completed : [],
          bestTimes: {},
          stars: {}
        };
      }
      return { completed: [], bestTimes: {}, stars: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      completed: Array.isArray(parsed?.completed)
        ? parsed.completed.filter(v => Number.isInteger(v) && v >= 0)
        : [],
      bestTimes: (typeof parsed?.bestTimes === 'object' && parsed.bestTimes !== null) ? parsed.bestTimes : {},
      stars: (typeof parsed?.stars === 'object' && parsed.stars !== null) ? parsed.stars : {}
    };
  } catch (e) {
    return { completed: [], bestTimes: {}, stars: {} };
  }
}

export function saveProgress(prog) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(prog)); } catch (e) {}
}

export function resetProgress() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(PROGRESS_KEY_LEGACY);
  } catch (e) {}
}

export function unlockNextLevel(completedIdx) {
  const prog = loadProgress();
  if (!prog.completed.includes(completedIdx)) {
    prog.completed.push(completedIdx);
  }
  saveProgress(prog);
}

export function saveLevelResult(levelIdx, time, stars) {
  const prog = loadProgress();
  if (!prog.completed.includes(levelIdx)) {
    prog.completed.push(levelIdx);
  }
  const prevBest = prog.bestTimes[levelIdx];
  if (prevBest === undefined || time < prevBest) {
    prog.bestTimes[levelIdx] = +time.toFixed(1);
  }
  const prevStars = prog.stars[levelIdx] || 0;
  if (stars > prevStars) {
    prog.stars[levelIdx] = stars;
  }
  saveProgress(prog);
}
