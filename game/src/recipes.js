// The recipe book of Simmer & Serve: every ingredient the crates hold and
// every dish the order board can ask for.
//
// An ingredient has a kind, a display name, the colour the renderer draws
// it with, and what the kitchen must do to it before it can be plated:
//   - "raw"    it is picked straight from its crate (bun, cheese)
//   - "chop"   it must be chopped on the board first (tomato, lettuce, onion)
//   - "cook"   it must be grilled on the stove first (patty)
//   - "pot"    it is cooked in the soup pot with friends (tomato, onion)
//
// A recipe lists the finished items a plate must hold, in any order, to
// match an order. Item keys look like "tomato:chopped" or "patty:cooked"
// so the matcher can compare a plate against a recipe exactly.

export const INGREDIENTS = {
  tomato: { kind: 'tomato', name: 'Tomato', prep: 'chop', color: '#e8443a', dark: '#a91f18', fresh: '#ff6b5e' },
  lettuce: { kind: 'lettuce', name: 'Lettuce', prep: 'chop', color: '#58b368', dark: '#2f7d3d', fresh: '#8fd694' },
  onion: { kind: 'onion', name: 'Onion', prep: 'chop', color: '#f2e3c6', dark: '#c9a86a', fresh: '#fff6e0' },
  cheese: { kind: 'cheese', name: 'Cheese', prep: 'raw', color: '#ffc93c', dark: '#d99a12', fresh: '#ffe27a' },
  bun: { kind: 'bun', name: 'Bun', prep: 'raw', color: '#e8a95c', dark: '#a86a28', fresh: '#f7c98a' },
  patty: { kind: 'patty', name: 'Patty', prep: 'cook', color: '#8a5a33', dark: '#5d3a1e', fresh: '#b07a4a' },
};

export const CHOPPABLE = ['tomato', 'lettuce', 'onion'];
export const COOKABLE = ['patty'];

/** The soup pot's recipe: what goes in and what comes out. */
export const SOUP_RECIPE = {
  needs: ['tomato', 'tomato', 'onion'],
  result: 'soup',
  cookSeconds: 9,
};

/** Every dish on the menu, with its plate contents and its base reward. */
export const RECIPES = [
  {
    id: 'burger',
    name: 'Classic Burger',
    short: 'Burger',
    needs: ['bun', 'patty:cooked', 'lettuce:chopped', 'tomato:chopped'],
    coins: 14,
    color: '#e8a95c',
  },
  {
    id: 'salad',
    name: 'Garden Salad',
    short: 'Salad',
    needs: ['lettuce:chopped', 'tomato:chopped', 'onion:chopped'],
    coins: 10,
    color: '#58b368',
  },
  {
    id: 'melt',
    name: 'Cheesy Melt',
    short: 'Melt',
    needs: ['bun', 'patty:cooked', 'cheese'],
    coins: 12,
    color: '#ffc93c',
  },
  {
    id: 'soup',
    name: 'Tomato Soup',
    short: 'Soup',
    needs: ['soup'],
    coins: 12,
    color: '#e8443a',
  },
];

/** Look a recipe up by id. */
export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) || null;
}

/** The canonical key of a carried item, e.g. "tomato:chopped" or "bun". */
export function itemKey(item) {
  if (item.kind === 'plate') return 'plate';
  if (item.state) return item.kind + ':' + item.state;
  return item.kind;
}

/** A fresh carried item of the given kind, in its raw state. */
export function freshItem(kind) {
  return { kind, state: null };
}

/** True when the item is a finished, plateable piece. */
export function isFinishedPiece(item) {
  if (item.kind === 'soup') return true;
  if (item.kind === 'patty') return item.state === 'cooked';
  if (CHOPPABLE.includes(item.kind)) return item.state === 'chopped';
  return item.kind === 'bun' || item.kind === 'cheese';
}

/** Compare a plate's contents against a recipe: same multiset of keys. */
export function plateMatchesRecipe(plateItems, recipe) {
  if (plateItems.length !== recipe.needs.length) return false;
  const held = plateItems.map(itemKey).sort();
  const wanted = recipe.needs.slice().sort();
  for (let i = 0; i < wanted.length; i += 1) {
    if (held[i] !== wanted[i]) return false;
  }
  return true;
}

/** Short label for a carried item, for the hands tray and tooltips. */
export function itemLabel(item) {
  if (item.kind === 'plate') return 'Plate (' + item.contents.length + ')';
  if (item.kind === 'soup') return 'Tomato Soup';
  const base = INGREDIENTS[item.kind] ? INGREDIENTS[item.kind].name : item.kind;
  if (item.state === 'chopped') return 'Chopped ' + base;
  if (item.state === 'cooked') return 'Grilled ' + base;
  if (item.state === 'burnt') return 'Burnt ' + base;
  return base;
}
