// The game state of Simmer & Serve: one object holds the whole shift.
//
// Modes: "title" (the bistro's front door), "play" (the shift is running),
// "over" (the shift is done and the till is counted). Everything the
// renderer draws and every system updates comes from this object, so a
// screenshot scene can stage it directly and the game still draws true.

import { CHEF_SPAWN } from './kitchen.js';
import { makeRng } from './rng.js';

export const SHIFT_SECONDS = 150;
export const RUSH_AT_SECONDS_LEFT = 45;
export const MAX_ORDERS = 4;
export const HANDS_CAPACITY = 2;

/** A fresh, empty shift. `seed` drives the order deck. */
export function createState(seed) {
  return {
    mode: 'title',
    seed,
    rng: makeRng(seed),
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    failedServes: 0,
    lostOrders: 0,
    orders: [],
    nextOrderId: 1,
    spawnIn: 2.5,
    chef: {
      x: CHEF_SPAWN.x,
      y: CHEF_SPAWN.y,
      facing: 1,
      moving: false,
      walkPhase: 0,
      carrying: [],
      target: null,
    },
    board: { item: null, progress: 0, chopping: false },
    stove: {
      burners: [
        { item: null, progress: 0, state: 'empty' },
        { item: null, progress: 0, state: 'empty' },
      ],
      pot: { items: [], progress: 0, state: 'empty' },
    },
    plate: { onCounter: true, items: [] },
    trash: { flashes: 0 },
    particles: [],
    floaters: [],
    banner: null,
    bannerTime: 0,
    rush: false,
    rushAnnounced: false,
    stats: { chopped: 0, grilled: 0, soups: 0, perfect: 0 },
  };
}

/** Start a fresh shift from the title screen. */
export function startShift(state) {
  const fresh = createState(state.seed);
  fresh.mode = 'play';
  return fresh;
}

/** Seconds left on the shift clock. */
export function secondsLeft(state) {
  return Math.max(0, SHIFT_SECONDS - state.time);
}

/** True once the last 45 seconds — the dinner rush — begin. */
export function isRush(state) {
  return secondsLeft(state) <= RUSH_AT_SECONDS_LEFT;
}

/** Add a floating score popup above a point in the kitchen. */
export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color || '#ffffff', life: 1.4, max: 1.4 });
}

/** Burst of little sparks/steam at a point. */
export function addParticles(state, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 30 + state.rng() * 70;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.5 + state.rng() * 0.5,
      max: 1,
      color,
      size: 2 + state.rng() * 3,
    });
  }
}

/** Show a big centre banner for a couple of seconds. */
export function showBanner(state, text, sub) {
  state.banner = { text, sub: sub || '' };
  state.bannerTime = 2.2;
}

/** Score a served dish: base coins plus a patience tip, times the combo. */
export function awardServe(state, recipe, patienceLeft, patienceMax) {
  const tip = Math.round((patienceLeft / patienceMax) * 8);
  const comboMult = 1 + Math.min(state.combo, 4) * 0.25;
  const earned = Math.round((recipe.coins + tip) * comboMult);
  state.coins += earned;
  state.score += earned;
  state.served += 1;
  state.combo += 1;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  if (patienceLeft / patienceMax > 0.6) state.stats.perfect += 1;
  return earned;
}

/** A failed serve or a lost order breaks the combo. */
export function breakCombo(state) {
  state.combo = 0;
}

/** Star rating for the end-of-shift summary (0-3). */
export function starRating(state) {
  if (state.served >= 14) return 3;
  if (state.served >= 10) return 2;
  if (state.served >= 6) return 1;
  return 0;
}
