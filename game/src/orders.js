// The order board: tickets arrive, wait, and go stale.
//
// Orders spawn on a timer that quickens as the shift wears on, and much
// faster again in the dinner rush. Each ticket carries one recipe and a
// patience bar that drains; serve the matching plate before it empties
// or the customer walks out and the combo breaks.

import { RECIPES, recipeById, plateMatchesRecipe } from './recipes.js';
import { randomPick } from './rng.js';
import { MAX_ORDERS, isRush, addFloater, breakCombo } from './state.js';

const BASE_PATIENCE = 62;
const RUSH_PATIENCE = 44;
const SPAWN_EARLY = 17;
const SPAWN_LATE = 10;
const SPAWN_RUSH = 7;

/** Patience seconds for a new ticket. */
export function patienceFor(state) {
  return isRush(state) ? RUSH_PATIENCE : BASE_PATIENCE;
}

/** Seconds until the next ticket arrives. */
export function spawnDelayFor(state) {
  if (isRush(state)) return SPAWN_RUSH;
  const progress = state.time / 150;
  return SPAWN_EARLY + (SPAWN_LATE - SPAWN_EARLY) * progress;
}

/** Deal one new ticket onto the board, if there is room. */
export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const recipe = randomPick(state.rng, RECIPES);
  const patience = patienceFor(state);
  const order = {
    id: state.nextOrderId,
    recipeId: recipe.id,
    patience,
    maxPatience: patience,
    born: state.time,
  };
  state.nextOrderId += 1;
  state.orders.push(order);
  return order;
}

/** Advance the order board by dt seconds: spawn, drain patience, expire. */
export function updateOrders(state, dt, onExpired) {
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    const made = spawnOrder(state);
    if (made) state.spawnIn = spawnDelayFor(state);
    else state.spawnIn = 2;
  }
  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      state.lostOrders += 1;
      breakCombo(state);
      addFloater(state, 640, 150, 'ORDER LOST!', '#ff5a4e');
      if (onExpired) onExpired(order);
    }
  }
}

/** The recipe of the order a plate matches, or null when it matches none. */
export function matchingOrder(state, plateItems) {
  for (let i = 0; i < state.orders.length; i += 1) {
    const order = state.orders[i];
    const recipe = recipeById(order.recipeId);
    if (recipe && plateMatchesRecipe(plateItems, recipe)) return { order, recipe };
  }
  return null;
}

/** Remove an order from the board by id. */
export function removeOrder(state, id) {
  for (let i = 0; i < state.orders.length; i += 1) {
    if (state.orders[i].id === id) {
      state.orders.splice(i, 1);
      return;
    }
  }
}

/** Patience as a 0..1 fraction, for the ticket's bar. */
export function patienceFraction(order) {
  return Math.max(0, order.patience / order.maxPatience);
}

/** The ticket's urgency: "ok" | "soon" | "now" by patience left. */
export function urgencyOf(order) {
  const f = patienceFraction(order);
  if (f > 0.5) return 'ok';
  if (f > 0.22) return 'soon';
  return 'now';
}
