/**
 * progress.js – localStorage persistence for level progress.
 */

const PROGRESS_KEY = 'dronetrainer_progress_v1';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : { maxUnlocked: 0, completed: [] };
  } catch (e) {
    return { maxUnlocked: 0, completed: [] };
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
  if (prog.maxUnlocked <= completedIdx) prog.maxUnlocked = completedIdx + 1;
  saveProgress(prog);
}
