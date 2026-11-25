// Simmer & Serve: the boot, the game loop and the input layer.
//
// The page is one canvas. The loop reads the keys (or a click target),
// steps the world, and draws it. A ?shot=start|mid|serve|end query stages
// one of the screenshot scenes instead of live play: the staged state is
// drawn every frame and never advances, so the shot is stable.

import { WORLD_WIDTH, WORLD_HEIGHT } from './kitchen.js';
import { createState, startShift, secondsLeft, isRush, showBanner } from './state.js';
import { updateOrders } from './orders.js';
import { moveChef, updateWalkTarget, setWalkTarget, stationNearChef as nearChef } from './chef.js';
import { interact, updateCooking, hintFor } from './cooking.js';
import { renderGame, updateEffects } from './render.js';
import { playEffect, unlockAudio } from './sound.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

canvas.width = WORLD_WIDTH;
canvas.height = WORLD_HEIGHT;

/** The sound hook the world systems call: a name, or nothing when muted. */
function sfx(name) {
  playEffect(name);
}

/** One fixed step of the live game. `input` carries the frame's controls. */
export function updateWorld(state, dt, input) {
  if (state.mode !== 'play') {
    updateEffects(state, dt);
    return;
  }
  state.time += dt;
  const left = secondsLeft(state);
  if (isRush(state) && !state.rushAnnounced) {
    state.rush = true;
    state.rushAnnounced = true;
    showBanner(state, 'RUSH HOUR!', 'Orders are coming in fast — keep cooking!');
    sfx('ding');
  }
  if (left <= 0) {
    state.mode = 'over';
    sfx('serve');
    updateEffects(state, dt);
    return;
  }

  updateOrders(state, dt, () => sfx('wrong'));
  updateCooking(state, dt, sfx);

  const chef = state.chef;
  if (input.dx !== 0 || input.dy !== 0) {
    chef.target = null;
    moveChef(state, input.dx, input.dy, dt);
  } else {
    updateWalkTarget(state, dt, (station) => {
      interact(state, station, false, sfx);
    });
  }

  const near = nearChef(state);
  state._nearStation = near || null;
  if (input.pressed && near) interact(state, near, false, sfx);
  if (input.held && near && near.kind === 'board') interact(state, near, true, sfx);
  if (!input.held || !near || near.kind !== 'board') state.board.chopping = false;

  updateEffects(state, dt);
}

/** The bottom hint line for the station under the chef. */
function currentHint(state) {
  if (state.mode !== 'play') return '';
  return hintFor(state, nearChef(state));
}

/** Fit the 1280x800 canvas into the window, keeping its aspect. */
function fitCanvas() {
  const scale = Math.min(window.innerWidth / WORLD_WIDTH, window.innerHeight / WORLD_HEIGHT);
  canvas.style.width = Math.floor(WORLD_WIDTH * scale) + 'px';
  canvas.style.height = Math.floor(WORLD_HEIGHT * scale) + 'px';
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

const keys = new Set();
let pressedE = false;
let staged = false;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed') || '20261125');

let state = createState(Date.now() % 2147483647);
if (shotName) {
  state = stageShot(shotName, Number.isFinite(seedParam) ? seedParam : 20261125);
  staged = true;
}

window.addEventListener('keydown', (event) => {
  unlockAudio();
  if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'ArrowDown') {
    event.preventDefault();
  }
  if (event.repeat) return;
  keys.add(event.code);
  if (event.code === 'KeyE' || event.code === 'Space') pressedE = true;
  if (event.code === 'Enter') {
    if (state.mode === 'title') {
      state = startShift(state);
      sfx('start');
    } else if (state.mode === 'over') {
      state = startShift(state);
      sfx('start');
    }
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

canvas.addEventListener('pointerdown', (event) => {
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH;
  const y = ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT;
  if (state.mode === 'title') {
    state = startShift(state);
    sfx('start');
    return;
  }
  if (state.mode === 'over') {
    state = startShift(state);
    sfx('start');
    return;
  }
  setWalkTarget(state, x, y);
});

window.addEventListener('error', (event) => {
  if (statusLine) statusLine.textContent = 'ERROR: ' + event.message;
});

/** Read the held keys into a movement vector. */
function readMove() {
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  return { dx, dy };
}

let last = performance.now();
let renderTime = 0;

/** The frame: step (unless staged), draw, and clear the edge trigger. */
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  renderTime = now / 1000;
  if (!staged) {
    const { dx, dy } = readMove();
    const held = keys.has('KeyE') || keys.has('Space');
    updateWorld(state, dt, { dx, dy, pressed: pressedE, held });
    pressedE = false;
  }
  renderGame(ctx, state, renderTime, currentHint(state));
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// A handle for automated play-testing: the state and the staging helper.
window.SIMMER = {
  get state() { return state; },
  startShift,
  stageShot,
  updateWorld,
};
