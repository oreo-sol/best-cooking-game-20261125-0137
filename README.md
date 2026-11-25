# Simmer & Serve — a kitchen rush

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/oreo-sol/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/oreo-sol/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A complete, original 2D cooking game for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). You are Mira, cook of the little bistro **Dapur Mira**, working a 150-second lunch shift: tickets land on the order board, and you run the kitchen — grab ingredients from the crates, chop them on the board, grill patties on the stove, simmer tomato soup in the pot, plate each dish, and ring the bell at the serving window before the ticket runs out.

## How it plays

- **Move** with WASD or the arrow keys; **click a station** to walk over to it.
- **E** (or Space) uses the station you stand by: take from a crate, put an item on the chopping board, grill a patty, add tomato and onion to the soup pot, build a plate, or serve it. **Hold E** at the board to chop.
- Four dishes on the menu: **Classic Burger** (bun + grilled patty + chopped lettuce + chopped tomato), **Garden Salad** (chopped lettuce, tomato, onion), **Cheesy Melt** (bun + grilled patty + cheese), and **Tomato Soup** (two tomatoes + an onion, simmered in the pot).
- A patty left on the grill too long burns — bin it and start again. Serving the right plate earns coins plus a tip for fast service; serving the wrong plate, or letting a ticket run out, breaks your combo. The last 45 seconds are **RUSH HOUR**: tickets arrive faster and patience runs shorter.

## Tech

- Plain static files under `game/` — one HTML page, ES modules, no libraries, no build step, no network requests. All art is drawn in canvas code; all sounds are synthesised with WebAudio.
- Source is split by job: `src/rng.js` (seeded random), `src/recipes.js` (ingredients and the menu), `src/kitchen.js` (the floor plan), `src/state.js` (the shift), `src/orders.js` (the ticket board), `src/chef.js` (movement and hands), `src/cooking.js` (chop, grill, pot, plate, serve), `src/render.js` (all drawing), `src/sound.js` (synth effects), `src/shots.js` (screenshot scenes), `src/main.js` (loop and input).
- `?shot=start|mid|serve|end` stages a screenshot scene from the real game state (with `&seed=` to fix the order deck).

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Hand it in (from this directory):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-game.ts` library.

## License

MIT — see [LICENSE](LICENSE).
