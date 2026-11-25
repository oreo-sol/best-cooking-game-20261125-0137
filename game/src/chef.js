// The chef: Mira, cook of the little bistro "Dapur Mira".
//
// She walks the kitchen with WASD or the arrow keys, or by clicking a
// station to walk over to it. She carries up to two things in her hands.
// Pressing E (or Space) uses whatever station she stands nearest: pick an
// ingredient from a crate, set it down to chop, grill or plate it, or hand
// a finished plate through the serving window. Holding E at the board
// chops; everything else answers on a single press.

import { nearestStation, slideMove } from './kitchen.js';
import { HANDS_CAPACITY } from './state.js';

export const CHEF_SPEED = 265;
export const CHEF_RADIUS = 17;

/** Move the chef by a normalised direction for dt seconds. */
export function moveChef(state, dx, dy, dt) {
  const chef = state.chef;
  if (dx === 0 && dy === 0) {
    chef.moving = false;
    return;
  }
  const len = Math.hypot(dx, dy);
  const step = CHEF_SPEED * dt;
  const moved = slideMove(chef.x, chef.y, CHEF_RADIUS, (dx / len) * step, (dy / len) * step);
  chef.x = moved.x;
  chef.y = moved.y;
  chef.moving = true;
  chef.walkPhase += dt * 11;
  if (dx !== 0) chef.facing = dx > 0 ? 1 : -1;
}

/** Point the chef at a click target and walk there; returns true if set. */
export function setWalkTarget(state, x, y) {
  const station = nearestStation(x, y);
  if (station) {
    state.chef.target = { x: station.x, y: station.y, station };
    return true;
  }
  state.chef.target = { x, y, station: null };
  return true;
}

/** Step an active walk target; calls onArrive(station) when it is reached. */
export function updateWalkTarget(state, dt, onArrive) {
  const chef = state.chef;
  const target = chef.target;
  if (!target) return;
  const dx = target.x - chef.x;
  const dy = target.y - chef.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 14) {
    chef.target = null;
    chef.moving = false;
    if (target.station && onArrive) onArrive(target.station);
    return;
  }
  moveChef(state, dx, dy, dt);
}

/** True when the chef's hands have room for one more item. */
export function handsHaveRoom(state) {
  return state.chef.carrying.length < HANDS_CAPACITY;
}

/** Put an item in the chef's hands; false when her hands are full. */
export function takeItem(state, item) {
  if (!handsHaveRoom(state)) return false;
  state.chef.carrying.push(item);
  return true;
}

/** Take the top carried item out of her hands (last in, first out). */
export function dropTopItem(state) {
  return state.chef.carrying.pop() || null;
}

/** The top carried item without removing it, or null. */
export function topItem(state) {
  const hands = state.chef.carrying;
  return hands.length ? hands[hands.length - 1] : null;
}

/** True when she carries a finished plate. */
export function carriesPlate(state) {
  return state.chef.carrying.some((item) => item.kind === 'plate');
}

/** The carried plate, or null. */
export function carriedPlate(state) {
  return state.chef.carrying.find((item) => item.kind === 'plate') || null;
}

/** The station she stands nearest right now, if any. */
export function stationNearChef(state) {
  return nearestStation(state.chef.x, state.chef.y);
}
