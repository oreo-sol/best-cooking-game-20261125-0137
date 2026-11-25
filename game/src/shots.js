// The screenshot scenes behind ?shot=start|mid|serve|end.
//
// Each scene starts a fresh shift from a fixed seed and stages it with
// the game's own state objects — the same fields live play builds — then
// steps the world a few frames so steam, flames and the chop bar settle.
// Every frame is what a short game really looks like, and the same seed
// always gives the same frame. The scenes are only for screenshots;
// live play never calls them.
//
//   start — early in the shift: kitchen, crates, two tickets, clock running
//   mid   — mid-shift: a burger half-built, tomato on the board mid-chop
//   serve — rush hour: a finished burger on a plate, ready at the window
//   end   — the shift-over summary after a busy service

import { createState } from './state.js';
import { spawnOrder } from './orders.js';
import { freshItem } from './recipes.js';
import { updateWorld } from './main.js';

const STEP = 1 / 60;

/** Step the world forward `seconds` with no input. */
function idle(state, seconds) {
  const limit = Math.floor(seconds / STEP);
  for (let i = 0; i < limit; i += 1) {
    updateWorld(state, STEP, { dx: 0, dy: 0, pressed: false, held: false });
  }
}

/** Hold E at the board for `seconds` of chopping. */
function holdChop(state, seconds) {
  const limit = Math.floor(seconds / STEP);
  for (let i = 0; i < limit; i += 1) {
    updateWorld(state, STEP, { dx: 0, dy: 0, pressed: false, held: true });
  }
}

/** Set `state` to the named scene and return it. */
export function stageShot(name, seed) {
  const state = createState(seed || 20261125);
  if (name === 'end') {
    state.mode = 'over';
    state.time = 150;
    state.served = 14;
    state.coins = 187;
    state.bestCombo = 3;
    state.lostOrders = 1;
    state.stats = { chopped: 18, grilled: 9, soups: 3, perfect: 6 };
    state.orders = [];
    return state;
  }

  state.mode = 'play';
  spawnOrder(state);
  spawnOrder(state);

  if (name === 'serve') {
    // Rush hour: the clock is nearly out, a finished burger rides on a
    // plate in the chef's hands, and the window is right beside her.
    state.time = 118;
    state.combo = 3;
    state.coins = 142;
    state.served = 11;
    state.rush = true;
    state.rushAnnounced = true;
    state.chef.x = 1060;
    state.chef.y = 350;
    state.chef.facing = 1;
    state.plate.onCounter = false;
    state.plate.items = [];
    const plate = { kind: 'plate', contents: [
      freshItem('bun'),
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ] };
    state.chef.carrying = [plate];
    state.stove.pot.items = [freshItem('tomato'), freshItem('tomato'), freshItem('onion')];
    state.stove.pot.state = 'done';
    state.stove.burners[0].item = { kind: 'patty', state: 'cooked' };
    state.stove.burners[0].state = 'done';
    state.orders[0].patience = 9;
    idle(state, 0.4);
    return state;
  }

  if (name === 'mid') {
    // Mid-shift: a burger is half-built on the plating counter (bun and a
    // grilled patty), the chef carries a bun and chopped lettuce, a tomato
    // is halfway through its chop, and a patty sizzles on the stove.
    state.time = 55;
    state.coins = 64;
    state.served = 5;
    state.combo = 2;
    state.chef.x = 410;
    state.chef.y = 480;
    state.chef.facing = -1;
    state.chef.carrying = [freshItem('bun'), { kind: 'lettuce', state: 'chopped' }];
    state.plate.items = [freshItem('bun'), { kind: 'patty', state: 'cooked' }];
    state.board.item = freshItem('tomato');
    state.board.progress = 0.45;
    state.stove.burners[0].item = freshItem('patty');
    state.stove.burners[0].state = 'cooking';
    state.stove.burners[0].progress = 0.55;
    state.stove.pot.items = [freshItem('tomato'), freshItem('onion')];
    state.stove.pot.state = 'cooking';
    state.stove.pot.progress = 0.4;
    spawnOrder(state);
    state.orders[1].patience = 16;
    holdChop(state, 0.25);
    return state;
  }

  // start: two seconds into the shift, the chef by the crates, the board
  // empty, the tickets fresh — kitchen, orders, ingredients, clock.
  state.time = 2;
  state.chef.x = 640;
  state.chef.y = 300;
  state.chef.facing = 1;
  idle(state, 0.4);
  return state;
}
