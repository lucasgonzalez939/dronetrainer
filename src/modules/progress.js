/**
 * progress.js – localStorage persistence for level progress.
 */

const PROGRESS_KEY = 'dronetrainer_progress_v1';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { completed: [] };
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed?.completed)
      ? parsed.completed.filter((v) => Number.isInteger(v) && v >= 0)
      : [];
    return { completed };
  } catch (e) {
    return { completed: [] };
  }
}

export function saveProgress(prog) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(prog)); } catch (e) {}
}

export function resetProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
}

export function unlockNextLevel(completedIdx) {
  const prog = loadProgress();
  if (!prog.completed.includes(completedIdx)) prog.completed.push(completedIdx);
  saveProgress(prog);
}
