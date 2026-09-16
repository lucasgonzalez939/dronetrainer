/**
 * state.js – Shared singleton state for the entire application.
 * All modules import and mutate this object directly.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export const FlightState = {
  LANDED:    'EN TIERRA',
  TAKING_OFF:'DESPEGANDO...',
  FLYING:    'EN VUELO',
  LANDING:   'ATERRIZANDO...',
  CRASHED:   'COLISIÓN'
};

export const CONFIG = {
  MAX_SPEED:      2.6,
  MAX_VERT_SPEED: 1.0,
  TAKEOFF_SPEED:  0.6,
  LANDING_SPEED:  0.4,
  MAX_YAW_RATE:   1.8,
  INPUT_FILTER:   6.0,
  ACCEL_DAMP:     3.5,
  NORMAL_DRAG:    2.5,
  VPS_FAIL_DRAG:  0.25,
  TILT_FACTOR:    0.12,
  // Rate/Acro mode: 'attitude' (auto-level) | 'rate' (direct rate control)
  FLIGHT_MODE:    'attitude',
  MAX_RATE_SPEED: 4.0   // max angular rate deg/s in rate mode
};

export const SPEED_PRESETS = {
  slow:   { MAX_SPEED:1.2, MAX_VERT_SPEED:0.5, MAX_YAW_RATE:0.9, INPUT_FILTER:4.0, ACCEL_DAMP:2.0 },
  normal: { MAX_SPEED:2.6, MAX_VERT_SPEED:1.0, MAX_YAW_RATE:1.8, INPUT_FILTER:6.0, ACCEL_DAMP:3.5 },
  fast:   { MAX_SPEED:4.5, MAX_VERT_SPEED:1.8, MAX_YAW_RATE:3.0, INPUT_FILTER:9.0, ACCEL_DAMP:5.5 }
};

export const DIFFICULTY = {
  batteryOn:    false,
  batteryTime:  120,
  windOn:       true,
  windStrength: 1.0,
  turbOn:       false,
  turbStrength: 1.0,
  vpsOn:        true
};

export const JOY_CONFIG = {
  sensitivity: 1.0,
  exponent:    3.0,
  deadzone:    0.05
};

export const drone = {
  state: FlightState.LANDED,
  pos: new THREE.Vector3(0, 0.02, 0),
  vel: new THREE.Vector3(0, 0, 0),
  radius: 0.16,
  yaw: 0,
  yawRate: 0,
  pitch: 0,
  roll: 0,
  // Rate-mode angular rates (rad/s)
  pitchRate: 0,
  rollRate: 0,
  targetHoverAlt: 1.0,
  vpsActive: true,
  // Motor RPM model (second-order spool)
  motorRpm: [0, 0, 0, 0],       // normalised 0–1
  motorRpmVel: [0, 0, 0, 0]     // first derivative
};

export const rawInput      = { throttle:0, yaw:0, pitch:0, roll:0 };
export const filteredInput = { throttle:0, yaw:0, pitch:0, roll:0 };

export const crashAngVel = { x: 0, y: 0, z: 0 };

// Level runtime state
export let levelObjects    = [];
export let obstacles       = [];
export let levelSlickZones = [];
export let levelGates      = [];
export let levelLandingPad = null;
export let movingGate      = null;
export let windVector      = new THREE.Vector3(0.35, 0, 0.15);
export let missions        = [];
export let currentMissionIdx = 0;
export let missionTimer    = 0;
export let timerRunning    = false;
export let currentLevel    = 0;

// Battery
export let batteryTimeLeft = 0;
export let batteryDepleted = false;

// Freestyle
export let isFreestyleMode  = false;
export let fsGatesPassed    = 0;
export let fsSessionTime    = 0;
export let fsBestLapTime    = Infinity;
export let fsLastGateTime   = 0;
export let fsFreestyleGates = [];
export let fsWindPreset     = 'calm';

// Camera
export let isFPVMode = false;

// ── Wind gust burst (emergency scenario) ──────────────────────────────────
export let gustBurstActive    = false;
export let gustBurstTimer     = 0;
export let gustBurstDuration  = 3;
export let gustBurstMult      = 3.0;
export function setGustBurstActive(v)   { gustBurstActive   = v; }
export function setGustBurstTimer(v)    { gustBurstTimer    = v; }
export function setGustBurstDuration(v) { gustBurstDuration = v; }
export function setGustBurstMult(v)     { gustBurstMult     = v; }

// ── Moving obstacles list (beyond the single movingGate) ──────────────────
export let movingObstacles = [];
export function setMovingObstacles(v) { movingObstacles = v; }

// ── Level-best times (timed levels) ───────────────────────────────────────
export let levelBestTimes = {};
export function setLevelBestTime(idx, t) { levelBestTimes[idx] = t; }

// ── Score / star system ───────────────────────────────────────────────────
export let gateScores    = [];   // per-gate score objects { accuracy, speed, time }
export let levelStars    = 0;    // 0-3 stars for current attempt
export let hintRetries   = {};   // { missionIdx: retryCount }
export function setGateScores(v)  { gateScores = v; }
export function setLevelStars(v)  { levelStars = v; }
export function setHintRetries(v) { hintRetries = v; }

// ── Flight path replay ────────────────────────────────────────────────────
export let replayBuffer  = [];    // array of {x,y,z} sampled during flight
export let replaySample  = 0;     // sample interval accumulator
export function setReplayBuffer(v) { replayBuffer = v; }
export function setReplaySample(v) { replaySample = v; }

// ── Time-of-day ───────────────────────────────────────────────────────────
export let timeOfDay = 0.5;  // 0 = night, 0.5 = golden hour, 1 = day
export function setTimeOfDay(v) { timeOfDay = v; }

// ── Fog density ───────────────────────────────────────────────────────────
export let fogDensity = 0.008;
export function setFogDensity(v) { fogDensity = v; }

// Setters (needed because ES module bindings are live but not assignable from outside)
export function setLevelObjects(v)    { levelObjects    = v; }
export function setObstacles(v)       { obstacles       = v; }
export function setLevelSlickZones(v) { levelSlickZones = v; }
export function setLevelGates(v)      { levelGates      = v; }
export function setLevelLandingPad(v) { levelLandingPad = v; }
export function setMovingGate(v)      { movingGate      = v; }
export function setWindVector(v)      { windVector      = v; }
export function setMissions(v)        { missions        = v; }
export function setCurrentMissionIdx(v){ currentMissionIdx = v; }
export function setMissionTimer(v)    { missionTimer    = v; }
export function setTimerRunning(v)    { timerRunning    = v; }
export function setCurrentLevel(v)    { currentLevel    = v; }
export function setBatteryTimeLeft(v) { batteryTimeLeft = v; }
export function setBatteryDepleted(v) { batteryDepleted = v; }
export function setIsFreestyleMode(v) { isFreestyleMode = v; }
export function setFsGatesPassed(v)   { fsGatesPassed   = v; }
export function setFsSessionTime(v)   { fsSessionTime   = v; }
export function setFsBestLapTime(v)   { fsBestLapTime   = v; }
export function setFsLastGateTime(v)  { fsLastGateTime  = v; }
export function setFsFreestyleGates(v){ fsFreestyleGates= v; }
export function setFsWindPreset(v)    { fsWindPreset    = v; }
export function setIsFPVMode(v)       { isFPVMode       = v; }
