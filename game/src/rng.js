// Seeded random numbers for Simmer & Serve.
//
// The kitchen uses one small deterministic generator (mulberry32) so a
// staged screenshot (?shot=mid, ?shot=serve) always deals the same orders
// and a replayed shift unfolds the same way. Live play seeds it from the
// clock; screenshot scenes seed it from a fixed number.

/** Make a mulberry32 generator from a 32-bit integer seed. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick an integer in [min, max] from the given generator. */
export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array from the given generator. */
export function randomPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** Shuffle a copy of an array in place order using the given generator. */
export function shuffleCopy(rng, items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const held = copy[i];
    copy[i] = copy[j];
    copy[j] = held;
  }
  return copy;
}
