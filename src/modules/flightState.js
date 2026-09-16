/**
 * flightState.js – Flight state machine, speed presets, takeoff button icon updates.
 */

import {
  FlightState, CONFIG, SPEED_PRESETS, DIFFICULTY,
  drone, crashAngVel,
  batteryTimeLeft, setBatteryTimeLeft,
  batteryDepleted, setBatteryDepleted,
  timerRunning, setTimerRunning
} from './state.js';
import { updateBatteryBar } from './hud.js';

const btnTakeoff = document.getElementById('btn-takeoff');

const FLIGHT_ICON_PLAY  = '<polygon points="5 3 19 12 5 21 5 3" fill="#fff" stroke="none"/>';
const FLIGHT_ICON_LAND  = '<rect x="5" y="10" width="14" height="3" fill="#fff" rx="1"/><rect x="3" y="18" width="18" height="3" fill="#fff" rx="1"/>';
const FLIGHT_ICON_WAIT  = '<circle cx="12" cy="12" r="8" stroke="#fff" stroke-width="2" fill="none" stroke-dasharray="4 4"/>';
const FLIGHT_ICON_CRASH = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';

export function setFlightIconSVG(innerSVG, stateClass) {
  const iconEl = document.getElementById('btn-takeoff-icon');
  if (iconEl) iconEl.innerHTML = innerSVG;
  btnTakeoff.className = stateClass || '';
}

export function setFlightState(newState) {
  drone.state = newState;
  switch (newState) {
    case FlightState.LANDED:
      setFlightIconSVG(FLIGHT_ICON_PLAY, '');
      btnTakeoff.disabled = false;
      setBatteryDepleted(false);
      document.getElementById('battery-bar-wrap').style.display = 'none';
      break;
    case FlightState.TAKING_OFF:
      setFlightIconSVG(FLIGHT_ICON_WAIT, 'state-land');
      btnTakeoff.disabled = true;
      setTimerRunning(true);
      if (DIFFICULTY.batteryOn) {
        setBatteryTimeLeft(DIFFICULTY.batteryTime);
        setBatteryDepleted(false);
        document.getElementById('battery-bar-wrap').style.display = 'block';
        updateBatteryBar(DIFFICULTY.batteryTime, DIFFICULTY.batteryTime);
      }
      break;
    case FlightState.FLYING:
      setFlightIconSVG(FLIGHT_ICON_LAND, 'state-fly');
      btnTakeoff.disabled = false;
      break;
    case FlightState.LANDING:
      setFlightIconSVG(FLIGHT_ICON_WAIT, 'state-land');
      btnTakeoff.disabled = true;
      break;
    case FlightState.CRASHED:
      setFlightIconSVG(FLIGHT_ICON_CRASH, 'state-crash');
      btnTakeoff.disabled = false;
      setTimerRunning(false);
      crashAngVel.x = (Math.random() - 0.5) * 18;
      crashAngVel.y = (Math.random() - 0.5) * 10;
      crashAngVel.z = (Math.random() - 0.5) * 22;
      drone.vel.set((Math.random()-0.5)*2.0, 0.5, (Math.random()-0.5)*2.0);
      break;
  }
}

export function applySpeedPreset(name) {
  const p = SPEED_PRESETS[name];
  Object.assign(CONFIG, p);
  document.querySelectorAll('.cfg-speed-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.speed === name);
  });
}
