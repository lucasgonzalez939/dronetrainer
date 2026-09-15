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
  TILT_FACTOR:    0.12
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
  targetHoverAlt: 1.0,
  vpsActive: true
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
