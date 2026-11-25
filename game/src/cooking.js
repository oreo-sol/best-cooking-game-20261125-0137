// The cooking itself: chopping, grilling, the soup pot, plating and serving.
//
// Every station answers through one function, `interact`, which the input
// layer calls when the chef presses E near a station (or arrives there by
// clicking it). Holding E at the board advances the chop; the stove and
// the pot cook on their own clocks once loaded, and a patty left too long
// burns and has to be binned.

import { CHOPPABLE, SOUP_RECIPE, freshItem, isFinishedPiece, itemLabel } from './recipes.js';
import { takeItem, dropTopItem, topItem, handsHaveRoom, carriedPlate } from './chef.js';
import { matchingOrder, removeOrder } from './orders.js';
import { awardServe, addFloater, addParticles, showBanner, breakCombo } from './state.js';

export const CHOP_SECONDS = 1.1;
export const GRILL_SECONDS = 6;
export const BURN_AFTER_SECONDS = 5;

/** What the station would do right now, for the hint line ("E: Chop tomato"). */
export function hintFor(state, station) {
  if (!station) return 'WASD / arrows to walk · click a station to go there';
  if (station.kind === 'crate') {
    return handsHaveRoom(state)
      ? 'E: Take ' + station.ingredient
      : 'Hands full — plate or bin something first';
  }
  if (station.kind === 'board') {
    if (!state.board.item) return 'E: Put a tomato, lettuce or onion here to chop';
    if (state.board.item.state === 'chopped') return 'E: Take the chopped ' + state.board.item.kind;
    return 'Hold E: Chop the ' + state.board.item.kind;
  }
  if (station.kind === 'stove') {
    const burner = state.stove.burners.find((b) => b.state === 'done');
    if (burner) return 'E: Take the grilled patty';
    const burnt = state.stove.burners.find((b) => b.state === 'burnt');
    if (burnt) return 'E: Bin the burnt patty';
    if (state.stove.pot.state === 'done') return 'E: Ladle the soup';
    return 'E: Grill a patty · add tomato + onion to the pot';
  }
  if (station.kind === 'plate') {
    if (carriedPlate(state)) return 'E: Set the plate down';
    if (state.plate.items.length > 0) return 'E: Pick up the plate · add an item to it';
    return 'E: Put a finished piece on the plate';
  }
  if (station.kind === 'serve') {
    return carriedPlate(state) ? 'E: Serve the plate!' : 'Bring a finished plate here';
  }
  if (station.kind === 'trash') return 'E: Bin what you are carrying';
  return '';
}

/**
 * Use a station. `holding` is true while E is held down (only the board
 * uses it). `sfx` is the sound module, called with short effect names.
 */
export function interact(state, station, holding, sfx) {
  if (!station) return;
  const kind = station.kind;
  if (kind === 'crate') return interactCrate(state, station, sfx);
  if (kind === 'board') return interactBoard(state, holding, sfx);
  if (kind === 'stove') return interactStove(state, sfx);
  if (kind === 'plate') return interactPlate(state, sfx);
  if (kind === 'serve') return interactServe(state, sfx);
  if (kind === 'trash') return interactTrash(state, sfx);
}

/** Take one ingredient from a crate into the chef's hands. */
function interactCrate(state, station, sfx) {
  if (!handsHaveRoom(state)) {
    sfx('deny');
    return;
  }
  takeItem(state, freshItem(station.ingredient));
  sfx('pickup');
  addParticles(state, state.chef.x, state.chef.y - 20, '#ffffff', 4);
}

/** Place, chop or collect at the chopping board. */
function interactBoard(state, holding, sfx) {
  const board = state.board;
  if (!board.item) {
    const top = topItem(state);
    if (top && CHOPPABLE.includes(top.kind) && !top.state) {
      dropTopItem(state);
      board.item = top;
      board.progress = 0;
      sfx('place');
    } else if (top) {
      sfx('deny');
    }
    return;
  }
  if (board.item.state === 'chopped') {
    if (!handsHaveRoom(state)) {
      sfx('deny');
      return;
    }
    takeItem(state, board.item);
    board.item = null;
    board.progress = 0;
    sfx('pickup');
    return;
  }
  if (!holding) return;
  board.chopping = true;
  board.progress += 1 / 60 / CHOP_SECONDS;
  if (Math.floor(board.progress * 8) !== Math.floor((board.progress - 1 / 60 / CHOP_SECONDS) * 8)) sfx('chop');
  if (board.progress >= 1) {
    board.item.state = 'chopped';
    board.progress = 0;
    board.chopping = false;
    state.stats.chopped += 1;
    sfx('chopped');
    addParticles(state, 410, 378, '#8fd694', 8);
  }
}

/** Grill patties and cook the soup pot on the stove. */
function interactStove(state, sfx) {
  const stove = state.stove;
  const doneBurner = stove.burners.find((b) => b.state === 'done');
  if (doneBurner) {
    if (!handsHaveRoom(state)) {
      sfx('deny');
      return;
    }
    takeItem(state, doneBurner.item);
    doneBurner.item = null;
    doneBurner.progress = 0;
    doneBurner.state = 'empty';
    sfx('pickup');
    return;
  }
  const burntBurner = stove.burners.find((b) => b.state === 'burnt');
  if (burntBurner) {
    burntBurner.item = null;
    burntBurner.progress = 0;
    burntBurner.state = 'empty';
    sfx('trash');
    addFloater(state, 870, 320, 'Burnt patty binned', '#ffb199');
    return;
  }
  if (stove.pot.state === 'done') {
    if (!handsHaveRoom(state)) {
      sfx('deny');
      return;
    }
    takeItem(state, { kind: 'soup', state: null });
    stove.pot.items = [];
    stove.pot.progress = 0;
    stove.pot.state = 'empty';
    state.stats.soups += 1;
    sfx('ladle');
    return;
  }
  const top = topItem(state);
  if (!top) {
    sfx('deny');
    return;
  }
  if (top.kind === 'patty' && !top.state) {
    const free = stove.burners.find((b) => b.state === 'empty');
    if (!free) {
      sfx('deny');
      return;
    }
    dropTopItem(state);
    free.item = top;
    free.progress = 0;
    free.state = 'cooking';
    sfx('sizzle');
    return;
  }
  if (top.kind === 'tomato' || top.kind === 'onion') {
    if (stove.pot.state === 'cooking') {
      sfx('deny');
      return;
    }
    const need = SOUP_RECIPE.needs;
    const inPot = stove.pot.items.map((i) => i.kind);
    const remaining = need.slice();
    for (const kind of inPot) {
      const at = remaining.indexOf(kind);
      if (at !== -1) remaining.splice(at, 1);
    }
    if (!remaining.includes(top.kind)) {
      sfx('deny');
      return;
    }
    dropTopItem(state);
    stove.pot.items.push(top);
    sfx('place');
    if (stove.pot.items.length === need.length) {
      stove.pot.state = 'cooking';
      stove.pot.progress = 0;
      sfx('sizzle');
      addFloater(state, 870, 320, 'Soup is on!', '#ffd27a');
    }
    return;
  }
  sfx('deny');
}

/** Add a piece to the plate, pick the plate up, or set it back down. */
function interactPlate(state, sfx) {
  const plate = state.plate;
  const carried = carriedPlate(state);
  if (carried) {
    if (plate.onCounter && plate.items.length === 0) {
      state.chef.carrying = state.chef.carrying.filter((i) => i !== carried);
      plate.items = carried.contents;
      sfx('place');
    } else {
      sfx('deny');
    }
    return;
  }
  const top = topItem(state);
  if (top && isFinishedPiece(top)) {
    if (plate.items.length >= 5) {
      sfx('deny');
      return;
    }
    dropTopItem(state);
    plate.items.push(top);
    sfx('place');
    addParticles(state, 570, 686, '#ffe27a', 5);
    return;
  }
  if (!top && plate.items.length > 0) {
    plate.onCounter = false;
    takeItem(state, { kind: 'plate', contents: plate.items.slice() });
    plate.items = [];
    sfx('pickup');
    return;
  }
  sfx('deny');
}

/** Hand the carried plate through the serving window. */
function interactServe(state, sfx) {
  const plate = carriedPlate(state);
  if (!plate) {
    sfx('deny');
    return;
  }
  const match = matchingOrder(state, plate.contents);
  state.chef.carrying = state.chef.carrying.filter((i) => i !== plate);
  if (!match) {
    state.failedServes += 1;
    breakCombo(state);
    sfx('wrong');
    addFloater(state, 1130, 300, 'No order wants that!', '#ff5a4e');
    return;
  }
  removeOrder(state, match.order.id);
  const earned = awardServe(state, match.recipe, match.order.patience, match.order.maxPatience);
  sfx('serve');
  addFloater(state, 1130, 300, '+' + earned + ' coins', '#ffd94a');
  addParticles(state, 1150, 350, '#ffd94a', 14);
  if (state.combo >= 3) showBanner(state, 'COMBO x' + state.combo + '!', 'The regulars are cheering');
}

/** Bin whatever the chef carries (top item first). */
function interactTrash(state, sfx) {
  const top = dropTopItem(state);
  if (!top) {
    sfx('deny');
    return;
  }
  state.trash.flashes = 0.4;
  sfx('trash');
}

/** Advance the stove and pot clocks by dt seconds. */
export function updateCooking(state, dt, sfx) {
  for (const burner of state.stove.burners) {
    if (burner.state === 'cooking') {
      burner.progress += dt / GRILL_SECONDS;
      if (burner.progress >= 1) {
        burner.progress = 0;
        burner.state = 'done';
        burner.item.state = 'cooked';
        state.stats.grilled += 1;
        sfx('ding');
        addFloater(state, 870, 320, 'Patty ready!', '#8fd694');
      }
    } else if (burner.state === 'done') {
      burner.progress += dt / BURN_AFTER_SECONDS;
      if (burner.progress >= 1) {
        burner.state = 'burnt';
        burner.item.state = 'burnt';
        sfx('burnt');
        addFloater(state, 870, 320, 'Burnt!', '#ff5a4e');
      }
    }
  }
  const pot = state.stove.pot;
  if (pot.state === 'cooking') {
    pot.progress += dt / SOUP_RECIPE.cookSeconds;
    if (pot.progress >= 1) {
      pot.state = 'done';
      pot.progress = 0;
      sfx('ding');
      addFloater(state, 870, 320, 'Soup ready!', '#8fd694');
    }
  }
}

/** True when the plate on the counter matches any open order. */
export function plateIsReady(state) {
  if (state.plate.items.length === 0) return false;
  return matchingOrder(state, state.plate.items) !== null;
}
