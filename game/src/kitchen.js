// The kitchen floor of Simmer & Serve: where every counter, crate, stove
// and station sits, and how the chef bumps into them.
//
// The room is 1280 x 800. The top 112 pixels are the order board and the
// shift clock (the HUD); the kitchen floor runs from y = 112 to y = 800.
// Counters are solid rectangles the chef cannot walk through. Each
// station also has an interact point on its open side: stand close and
// press E (or click the station) to use it.

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 800;
export const HUD_HEIGHT = 112;
export const FLOOR_TOP = 116;

/** Every solid counter block: {x, y, w, h, label}. */
export const COUNTERS = [
  // Top wall: the ingredient crates, left to right.
  { x: 24, y: 128, w: 150, h: 64, label: 'TOMATO', kind: 'crate', ingredient: 'tomato' },
  { x: 182, y: 128, w: 150, h: 64, label: 'LETTUCE', kind: 'crate', ingredient: 'lettuce' },
  { x: 340, y: 128, w: 150, h: 64, label: 'ONION', kind: 'crate', ingredient: 'onion' },
  { x: 498, y: 128, w: 150, h: 64, label: 'CHEESE', kind: 'crate', ingredient: 'cheese' },
  { x: 656, y: 128, w: 150, h: 64, label: 'BUNS', kind: 'crate', ingredient: 'bun' },
  { x: 814, y: 128, w: 150, h: 64, label: 'PATTIES', kind: 'crate', ingredient: 'patty' },
  // Right wall: the serving window.
  { x: 1152, y: 240, w: 104, h: 220, label: 'SERVE', kind: 'serve' },
  // Middle row: chopping board (left) and stove (right).
  { x: 300, y: 330, w: 220, h: 96, label: 'CHOP', kind: 'board' },
  { x: 740, y: 330, w: 260, h: 96, label: 'STOVE', kind: 'stove' },
  // Bottom row: plating counter and trash.
  { x: 420, y: 640, w: 300, h: 92, label: 'PLATE', kind: 'plate' },
  { x: 24, y: 640, w: 110, h: 92, label: 'TRASH', kind: 'trash' },
];

/** Where the chef stands to use each station (the open side of its counter). */
export const STATIONS = [
  { id: 'crate-tomato', kind: 'crate', ingredient: 'tomato', x: 99, y: 212, reach: 62 },
  { id: 'crate-lettuce', kind: 'crate', ingredient: 'lettuce', x: 257, y: 212, reach: 62 },
  { id: 'crate-onion', kind: 'crate', ingredient: 'onion', x: 415, y: 212, reach: 62 },
  { id: 'crate-cheese', kind: 'crate', ingredient: 'cheese', x: 573, y: 212, reach: 62 },
  { id: 'crate-bun', kind: 'crate', ingredient: 'bun', x: 731, y: 212, reach: 62 },
  { id: 'crate-patty', kind: 'crate', ingredient: 'patty', x: 889, y: 212, reach: 62 },
  { id: 'board', kind: 'board', x: 410, y: 452, reach: 78 },
  { id: 'stove', kind: 'stove', x: 870, y: 452, reach: 92 },
  { id: 'plate', kind: 'plate', x: 570, y: 622, reach: 86 },
  { id: 'serve', kind: 'serve', x: 1130, y: 350, reach: 86 },
  { id: 'trash', kind: 'trash', x: 79, y: 622, reach: 70 },
];

/** The chef's spawn point, middle of the open floor. */
export const CHEF_SPAWN = { x: 640, y: 540 };

/** True when the point (x, y) with radius r hits a counter or the walls. */
export function hitsSolid(x, y, r) {
  if (x - r < 8 || x + r > WORLD_WIDTH - 8) return true;
  if (y - r < FLOOR_TOP || y + r > WORLD_HEIGHT - 8) return true;
  for (let i = 0; i < COUNTERS.length; i += 1) {
    const c = COUNTERS[i];
    if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
  }
  return false;
}

/** Move a circle by (dx, dy), sliding along counters instead of sticking. */
export function slideMove(x, y, r, dx, dy) {
  let nx = x;
  let ny = y;
  if (!hitsSolid(x + dx, y, r)) nx = x + dx;
  if (!hitsSolid(nx, y + dy, r)) ny = y + dy;
  return { x: nx, y: ny };
}

/** The station nearest to (x, y) within its reach, or null. */
export function nearestStation(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < STATIONS.length; i += 1) {
    const s = STATIONS[i];
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= s.reach && d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/** The counter block a station belongs to, for drawing its highlight. */
export function counterForStation(station) {
  if (!station) return null;
  for (let i = 0; i < COUNTERS.length; i += 1) {
    const c = COUNTERS[i];
    if (station.kind === 'crate' && c.kind === 'crate' && c.ingredient === station.ingredient) return c;
    if (station.kind !== 'crate' && c.kind === station.kind) return c;
  }
  return null;
}
