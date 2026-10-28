/**
 * levels.js – Facade re-exporting the modularized levels architecture.
 * Individual levels are organized in:
 * - ./levels/academy/ (Niveles 1 al 24)
 * - ./levels/challenges/ (Desafíos 1 al 15)
 * - ./levels/operations/ (Misiones 1 al 10)
 * - ./levels/common.js (Funciones compartidas y generadores procedurales)
 */

export {
  LEVEL_DEFS,
  clearLevel,
  loadLevel,
  regenerateCurrentLevel,
  updateMovingGate,
  updateOperationalEntities
} from './levels/index.js';
