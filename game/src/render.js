// The renderer: everything Simmer & Serve shows is drawn here, in canvas
// code, with no image files at all.
//
// The room is 1280 x 800. The order board and the shift clock live in the
// top 112 pixels; the kitchen floor fills the rest. Food is drawn as
// little icons (tomato, lettuce, onion, cheese, bun, patty, soup) so the
// counter, the plate and the tickets all read at a glance, even shrunk
// onto the judge's contact sheet.

import { WORLD_WIDTH, WORLD_HEIGHT, HUD_HEIGHT, COUNTERS, counterForStation } from './kitchen.js';
import { INGREDIENTS, RECIPES, recipeById, itemKey } from './recipes.js';
import { secondsLeft, isRush, starRating } from './state.js';
import { patienceFraction, urgencyOf } from './orders.js';
import { plateIsReady } from './cooking.js';

/** Draw one ingredient icon centred at (x, y), fitting in `size` pixels. */
export function drawIngredient(ctx, kind, x, y, size, state) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'tomato') {
    ctx.fillStyle = state === 'chopped' ? '#ff8a7a' : '#e8443a';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#58b368';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.7, s * 0.35, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'chopped') {
      ctx.strokeStyle = '#a91f18';
      ctx.lineWidth = Math.max(1, s * 0.14);
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.4);
      ctx.moveTo(s * 0.5, -s * 0.4);
      ctx.lineTo(-s * 0.5, s * 0.4);
      ctx.stroke();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = state === 'chopped' ? '#8fd694' : '#58b368';
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.ellipse(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.45, s * 0.55, s * 0.4, a, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = '#2f7d3d';
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, 0);
    ctx.lineTo(s * 0.4, 0);
    ctx.stroke();
  } else if (kind === 'onion') {
    ctx.fillStyle = state === 'chopped' ? '#fff6e0' : '#f2e3c6';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'cheese') {
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, s * 0.5);
    ctx.lineTo(s * 0.85, s * 0.5);
    ctx.lineTo(s * 0.85, -s * 0.2);
    ctx.lineTo(-s * 0.85, -s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d99a12';
    ctx.beginPath();
    ctx.arc(-s * 0.3, s * 0.15, s * 0.14, 0, Math.PI * 2);
    ctx.arc(s * 0.3, s * 0.05, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'bun') {
    ctx.fillStyle = '#e8a95c';
    ctx.beginPath();
    ctx.arc(0, s * 0.15, s * 0.85, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c98a3e';
    ctx.fillRect(-s * 0.85, s * 0.1, s * 1.7, s * 0.28);
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.35, s * 0.09, 0, Math.PI * 2);
    ctx.arc(s * 0.2, -s * 0.5, s * 0.09, 0, Math.PI * 2);
    ctx.arc(s * 0.45, -s * 0.2, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#2b1a10' : state === 'cooked' ? '#7a4a26' : '#b07a4a';
    roundRect(ctx, -s * 0.9, -s * 0.45, s * 1.8, s * 0.9, s * 0.4);
    ctx.fill();
    if (state !== 'burnt') {
      ctx.strokeStyle = state === 'cooked' ? '#5d3a1e' : '#8a5a33';
      ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, 0);
      ctx.lineTo(s * 0.6, 0);
      ctx.stroke();
    }
  } else if (kind === 'soup') {
    ctx.fillStyle = '#f4ede0';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.85, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8443a';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.7, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#58b368';
    ctx.beginPath();
    ctx.arc(-s * 0.25, -s * 0.05, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.3, -s * 0.02, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A rounded rectangle path, filled by the caller. */
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** The tiled kitchen floor, walls and the bistro's name on the wall. */
function drawFloor(ctx, time) {
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const tile = 64;
  for (let ty = 0; ty < 11; ty += 1) {
    for (let tx = 0; tx < 20; tx += 1) {
      const even = (tx + ty) % 2 === 0;
      ctx.fillStyle = even ? '#caa87e' : '#bd9a6e';
      ctx.fillRect(tx * tile, HUD_HEIGHT + ty * tile, tile, tile);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let ty = 0; ty < 11; ty += 1) {
    ctx.fillRect(0, HUD_HEIGHT + ty * tile + tile - 3, WORLD_WIDTH, 3);
  }
  // The wall band above the floor; the HUD paints over it, so it is only
  // a warm edge behind the order board.
  ctx.fillStyle = '#7a4a26';
  ctx.fillRect(0, 0, WORLD_WIDTH, HUD_HEIGHT);
}

/** One counter block: wooden top, body, label and its contents. */
function drawCounter(ctx, counter, state, time, highlight) {
  const { x, y, w, h } = counter;
  ctx.fillStyle = '#5d3a1e';
  ctx.fillRect(x, y + 6, w, h);
  ctx.fillStyle = '#8a5a33';
  roundRect(ctx, x - 4, y - 4, w + 8, h * 0.42, 8);
  ctx.fill();
  ctx.fillStyle = '#a86a28';
  ctx.fillRect(x - 4, y + h * 0.42 - 8, w + 8, 5);
  ctx.fillStyle = '#f7e8c8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(counter.label, x + w / 2, y + h - 16);

  if (counter.kind === 'crate') {
    drawIngredient(ctx, counter.ingredient, x + w / 2 - 26, y + h / 2 - 6, 34, null);
    drawIngredient(ctx, counter.ingredient, x + w / 2 + 26, y + h / 2 - 6, 34, null);
  }
  if (counter.kind === 'board') {
    ctx.fillStyle = '#e8d5a8';
    roundRect(ctx, x + 24, y + 12, w - 48, h - 44, 10);
    ctx.fill();
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 2;
    ctx.stroke();
    const item = state.board.item;
    if (item) {
      drawIngredient(ctx, item.kind, x + w / 2, y + h / 2 - 8, 52, item.state);
      if (item.state !== 'chopped') {
        const p = state.board.progress;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        roundRect(ctx, x + 40, y + h - 34, w - 80, 10, 5);
        ctx.fill();
        ctx.fillStyle = p > 0 ? '#ffd94a' : '#8fd694';
        roundRect(ctx, x + 40, y + h - 34, (w - 80) * p, 10, 5);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#a86a28';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('chopping board', x + w / 2, y + h / 2 - 4);
    }
  }
  if (counter.kind === 'stove') {
    drawStove(ctx, counter, state, time);
  }
  if (counter.kind === 'plate') {
    drawPlateCounter(ctx, counter, state);
  }
  if (counter.kind === 'serve') {
    ctx.fillStyle = '#2b3a4a';
    roundRect(ctx, x + 10, y + 12, w - 20, 66, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('PICK UP', x + w / 2, y + 34);
    ctx.fillStyle = '#f7e8c8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('ring the bell!', x + w / 2, y + 58);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 108, 16, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + w / 2 - 20, y + 106, 40, 6);
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(x + w / 2 - 4, y + 88, 8, 18);
  }
  if (counter.kind === 'trash') {
    ctx.fillStyle = '#3a3f44';
    roundRect(ctx, x + 22, y + 10, w - 44, h - 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 22);
    ctx.lineTo(x + w - 22, y + 22);
    ctx.stroke();
    ctx.fillStyle = '#f7e8c8';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('BIN', x + w / 2, y + h / 2 + 8);
  }
  if (highlight) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 4;
    roundRect(ctx, x - 6, y - 6, w + 12, h + 12, 10);
    ctx.stroke();
  }
}

/** The stove: two burners with patties and flames, plus the soup pot. */
function drawStove(ctx, counter, state, time) {
  const { x, y, w } = counter;
  for (let i = 0; i < 2; i += 1) {
    const bx = x + 34 + i * 86;
    const by = y + 34;
    const burner = state.stove.burners[i];
    ctx.fillStyle = '#22262b';
    ctx.beginPath();
    ctx.arc(bx + 26, by + 16, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3f44';
    ctx.beginPath();
    ctx.arc(bx + 26, by + 16, 22, 0, Math.PI * 2);
    ctx.fill();
    if (burner.state === 'cooking' || burner.state === 'done') {
      const flicker = Math.sin(time * 14 + i * 2) * 3;
      ctx.fillStyle = burner.state === 'done' ? '#ffb347' : '#ff7a2f';
      ctx.beginPath();
      ctx.ellipse(bx + 26, by + 40, 20 + flicker, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (burner.item) {
      drawIngredient(ctx, 'patty', bx + 26, by + 14, 40, burner.item.state);
    }
    if (burner.state === 'cooking' || burner.state === 'done') {
      const p = burner.state === 'done' ? 1 : burner.progress;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, bx - 2, by + 48, 56, 7, 3);
      ctx.fill();
      ctx.fillStyle = burner.state === 'done' ? '#8fd694' : '#ff9a3c';
      roundRect(ctx, bx - 2, by + 48, 56 * p, 7, 3);
      ctx.fill();
    }
    if (burner.state === 'burnt') {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BURNT!', bx + 26, by + 62);
    }
  }
  // Soup pot on the right of the stove.
  const px = x + w - 62;
  const py = y + 40;
  ctx.fillStyle = '#4a4f55';
  ctx.beginPath();
  ctx.arc(px, py, 30, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(px - 30, py - 6, 60, 10);
  const pot = state.stove.pot;
  ctx.fillStyle = pot.state === 'done' ? '#ff6b5e' : pot.items.length ? '#e8443a' : '#2b2f33';
  ctx.beginPath();
  ctx.ellipse(px, py - 2, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pot.state === 'cooking') {
    for (let i = 0; i < 3; i += 1) {
      const bob = Math.sin(time * 6 + i * 2.1) * 3;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(px - 14 + i * 14, py - 18 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f7e8c8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil((1 - pot.progress) * 9) + 's', px, py + 34);
  }
  if (pot.items.length > 0 && pot.state !== 'cooking' && pot.state !== 'done') {
    ctx.fillStyle = '#f7e8c8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pot.items.length + '/3 in pot', px, py + 34);
  }
  if (pot.state === 'done') {
    ctx.fillStyle = '#8fd694';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOUP READY', px, py + 34);
  }
}

/** The plating counter: the plate and everything on it. */
function drawPlateCounter(ctx, counter, state) {
  const { x, y, w, h } = counter;
  const cx = x + w / 2;
  const cy = y + h / 2 - 6;
  const plate = state.plate;
  if (plate.onCounter) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 74, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9cdb4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 58, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    plate.items.forEach((item, i) => {
      const angle = (i / Math.max(1, plate.items.length)) * Math.PI * 2 - Math.PI / 2;
      drawIngredient(ctx, item.kind, cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 12 - 6, 30, item.state);
    });
    if (plateIsReady(state)) {
      const pulse = 0.6 + Math.sin(Date.now() / 180) * 0.4;
      ctx.strokeStyle = 'rgba(255,217,74,' + pulse + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 82, 36, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('READY TO SERVE!', cx, cy - 46);
    }
  } else {
    ctx.fillStyle = '#f7e8c8';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('plate is out — serving!', cx, cy);
  }
}

/** Mira the chef, with her toque, apron and whatever she carries. */
function drawChef(ctx, state, time) {
  const chef = state.chef;
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 2.5 : 0;
  const x = chef.x;
  const y = chef.y + bob * 0.3;
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body / apron.
  ctx.fillStyle = '#f4f1ea';
  roundRect(ctx, -14, -8, 28, 26, 9);
  ctx.fill();
  ctx.fillStyle = '#e8443a';
  ctx.fillRect(-14, 2, 28, 5);
  // Arms.
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.arc(-15, 2, 6, 0, Math.PI * 2);
  ctx.arc(15, 2, 6, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f7c98a';
  ctx.beginPath();
  ctx.arc(0, -18, 12, 0, Math.PI * 2);
  ctx.fill();
  // Toque.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-7, -28, 7, 0, Math.PI * 2);
  ctx.arc(0, -31, 8, 0, Math.PI * 2);
  ctx.arc(7, -28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-10, -30, 20, 6);
  // Face: eyes look the way she faces.
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(-4 + chef.facing * 2, -18, 1.8, 0, Math.PI * 2);
  ctx.arc(4 + chef.facing * 2, -18, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a86a28';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(chef.facing * 2, -14, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  // Carried items float above her head.
  chef.carrying.forEach((item, i) => {
    const ix = x - (chef.carrying.length - 1) * 18 + i * 36;
    const iy = y - 52;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(ix, iy, 17, 0, Math.PI * 2);
    ctx.fill();
    if (item.kind === 'plate') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ix, iy, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d9cdb4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(ix, iy, 15, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      item.contents.forEach((piece, j) => {
        drawIngredient(ctx, piece.kind, ix - 9 + j * 6, iy - 3, 11, piece.state);
      });
    } else {
      drawIngredient(ctx, item.kind, ix, iy, 24, item.state);
    }
  });
  // Walk target marker.
  if (chef.target) {
    ctx.strokeStyle = 'rgba(255,217,74,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(chef.target.x, chef.target.y, 10 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** One order ticket on the board. */
function drawTicket(ctx, order, index, x, time) {
  const recipe = recipeById(order.recipeId);
  if (!recipe) return;
  const w = 218;
  const h = 78;
  const y = 8;
  const frac = patienceFraction(order);
  const urgency = urgencyOf(order);
  const blink = urgency === 'now' && Math.sin(time * 10) > 0;
  ctx.fillStyle = blink ? '#ffd2cc' : '#fff8e6';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = urgency === 'now' ? '#e8443a' : urgency === 'soon' ? '#e8a13c' : '#c9a86a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#5d3a1e';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('#' + order.id + ' ' + recipe.name, x + 10, y + 16);
  ctx.fillStyle = '#e8a13c';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(recipe.coins + 'c', x + w - 10, y + 16);
  // The recipe's pieces, left to right.
  recipe.needs.forEach((need, i) => {
    const [kind, needState] = need.split(':');
    drawIngredient(ctx, kind, x + 24 + i * 34, y + 46, 26, needState || null);
  });
  // Patience bar.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundRect(ctx, x + 10, y + h - 12, w - 20, 7, 3);
  ctx.fill();
  ctx.fillStyle = urgency === 'now' ? '#e8443a' : urgency === 'soon' ? '#e8a13c' : '#58b368';
  roundRect(ctx, x + 10, y + h - 12, (w - 20) * frac, 7, 3);
  ctx.fill();
  void index;
}

/** The top bar: tickets, shift clock, coins, combo and rush state. */
function drawHud(ctx, state, time) {
  // Ticket area background.
  ctx.fillStyle = '#4a2f1a';
  ctx.fillRect(0, 0, WORLD_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('DAPUR', 18, 30);
  ctx.fillText('MIRA', 18, 52);
  ctx.fillStyle = '#f7e8c8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('ORDERS', 18, 100);
  state.orders.forEach((order, i) => {
    drawTicket(ctx, order, i, 96 + i * 228, time);
  });
  if (state.orders.length === 0) {
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText('No orders yet — the lunch crowd is coming…', 110, 46);
  }
  // Right cluster: timer, coins, combo.
  const left = secondsLeft(state);
  const mins = Math.floor(left / 60);
  const secs = Math.floor(left % 60);
  const clock = mins + ':' + String(secs).padStart(2, '0');
  const rush = isRush(state);
  ctx.textAlign = 'right';
  ctx.fillStyle = rush && Math.sin(time * 6) > 0 ? '#ff5a4e' : '#ffffff';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText((rush ? 'RUSH ' : '') + clock, WORLD_WIDTH - 18, 32);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('🪙 ' + state.coins + ' coins', WORLD_WIDTH - 18, 66);
  ctx.fillStyle = state.combo >= 2 ? '#ff9a3c' : '#f7e8c8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(state.combo >= 2 ? 'COMBO x' + state.combo : 'served: ' + state.served, WORLD_WIDTH - 18, 92);
  // Shift progress bar under the HUD.
  const progress = 1 - left / 150;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, HUD_HEIGHT - 5, WORLD_WIDTH, 5);
  ctx.fillStyle = rush ? '#ff5a4e' : '#ffd94a';
  ctx.fillRect(0, HUD_HEIGHT - 5, WORLD_WIDTH * progress, 5);
}

/** Floating score popups and little spark bursts. */
function drawEffects(ctx, state, dt) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

/** The title screen over the kitchen. */
function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(43,26,16,0.72)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('SIMMER & SERVE', WORLD_WIDTH / 2, 250);
  ctx.fillStyle = '#f7e8c8';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('A kitchen rush at Dapur Mira — the lunch crowd is hungry.', WORLD_WIDTH / 2, 305);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  const lines = [
    'WASD / arrows — run around the kitchen',
    'E — pick up, chop (hold), grill, plate, serve    ·    click a station to walk there',
    'Chop it, grill it, plate it, serve it before the ticket runs out.',
    'Burnt patties go in the bin. Combos pay extra. Last 45 seconds: RUSH HOUR.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, WORLD_WIDTH / 2, 380 + i * 32));
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  const pulse = 0.7 + Math.sin(Date.now() / 300) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER or click to start the shift', WORLD_WIDTH / 2, 560);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffd27a';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('150 seconds · 4 dishes on the menu · no network, no downloads — just cooking', WORLD_WIDTH / 2, 600);
}

/** The end-of-shift summary. */
function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(43,26,16,0.78)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('SHIFT OVER!', WORLD_WIDTH / 2, 210);
  ctx.fillStyle = '#f7e8c8';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('The kitchen closes. The till is counted.', WORLD_WIDTH / 2, 265);
  const stars = starRating(state);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.font = '56px system-ui, sans-serif';
    ctx.fillText('★', WORLD_WIDTH / 2 - 70 + i * 70, 330);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  const rows = [
    'Dishes served:  ' + state.served,
    'Coins earned:  ' + state.coins,
    'Best combo:  x' + state.bestCombo,
    'Orders lost:  ' + state.lostOrders,
    'Chopped: ' + state.stats.chopped + '   ·   Grilled: ' + state.stats.grilled + '   ·   Soups: ' + state.stats.soups,
  ];
  rows.forEach((row, i) => ctx.fillText(row, WORLD_WIDTH / 2, 400 + i * 34));
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press ENTER to cook another shift', WORLD_WIDTH / 2, 610);
}

/** The bottom hint line: what E does at the station under the chef. */
function drawHint(ctx, state, hint) {
  ctx.fillStyle = 'rgba(43,26,16,0.85)';
  roundRect(ctx, 220, WORLD_HEIGHT - 34, WORLD_WIDTH - 440, 26, 13);
  ctx.fill();
  ctx.fillStyle = '#f7e8c8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hint, WORLD_WIDTH / 2, WORLD_HEIGHT - 20);
}

/** Draw the whole game for this frame. `hint` is the bottom help line. */
export function renderGame(ctx, state, time, hint) {
  drawFloor(ctx, time);
  const near = state.mode === 'play' ? counterForStation(state._nearStation || null) : null;
  for (const counter of COUNTERS) {
    drawCounter(ctx, counter, state, time, near === counter);
  }
  drawChef(ctx, state, time);
  drawEffects(ctx, state, 0);
  drawHud(ctx, state, time);
  if (state.banner) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(43,26,16,0.55)';
    roundRect(ctx, WORLD_WIDTH / 2 - 260, 150, 520, 74, 14);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 38px Georgia, serif';
    ctx.fillText(state.banner.text, WORLD_WIDTH / 2, 178);
    if (state.banner.sub) {
      ctx.fillStyle = '#f7e8c8';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(state.banner.sub, WORLD_WIDTH / 2, 208);
    }
  }
  if (state.mode === 'play') drawHint(ctx, state, hint);
  if (state.mode === 'title') drawTitle(ctx, state);
  if (state.mode === 'over') drawGameOver(ctx, state);
}

/** Advance the purely visual effects (particles, popups, banners). */
export function updateEffects(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
  if (state.bannerTime > 0) {
    state.bannerTime -= dt;
    if (state.bannerTime <= 0) state.banner = null;
  }
  if (state.trash.flashes > 0) state.trash.flashes -= dt;
}
