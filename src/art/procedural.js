import Phaser from 'phaser';
import { COLOR } from '../config.js';
import { makeRng } from '../utils/rng.js';


export function drawDitherGradient(scene, key, x, y, w, h, topColor, bottomColor, steps = 6) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const t = Phaser.Display.Color.IntegerToColor(topColor);
  const b = Phaser.Display.Color.IntegerToColor(bottomColor);
  const bandH = h / steps;
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(t, b, steps - 1, i);
    const col = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    g.fillStyle(col, 1);
    g.fillRect(x, Math.floor(y + i * bandH), w, Math.ceil(bandH));
    if (i < steps - 1) {
      const cn = Phaser.Display.Color.Interpolate.ColorWithColor(t, b, steps - 1, i + 1);
      g.fillStyle(Phaser.Display.Color.GetColor(cn.r, cn.g, cn.b), 1);
      for (let px = 0; px < w; px++) {
        if ((px + i) % 2 === 0) g.fillRect(x + px, Math.floor(y + (i + 1) * bandH), 1, 1);
      }
    }
  }
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

export function fillDisc(g, cx, cy, r, color) {
  g.fillStyle(color, 1);
  for (let dy = -r; dy <= r; dy++) {
    const span = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (span <= 0) continue;
    g.fillRect(cx - span, cy + dy, span * 2, 1);
  }
}

export function plotEllipse(g, cx, cy, rx, ry, color, step = 0.07) {
  g.fillStyle(color, 1);
  for (let a = 0; a < Math.PI * 2; a += step) {
    g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
}

export function drawStarfield(scene, key, w, h, seed, density = 14) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const rng = makeRng(seed);
  const count = Math.floor((w * h) / 10000 * density);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    const bright = rng();
    g.fillStyle(bright > 0.85 ? COLOR.ice : bright > 0.5 ? COLOR.white : COLOR.metal, 1);
    g.fillRect(x, y, 1, 1);
  }
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

export function drawWater(scene, key, w, h, seed = 7) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const rng = makeRng(seed);

  const bands = [COLOR.cyan, COLOR.blue, COLOR.blue, COLOR.navy, COLOR.navy, COLOR.spaceBlack];
  const bandH = h / bands.length;
  bands.forEach((color, i) => {
    g.fillStyle(color, 1);
    g.fillRect(0, Math.floor(i * bandH), w, Math.ceil(bandH) + 1);
  });

  g.fillStyle(COLOR.ice, 1);
  for (let x = 0; x < w; x += 3) if (rng() > 0.3) g.fillRect(x, 0, 2, 1);

  for (let y = 3; y < h; y += 3) {
    const depth = y / h;
    g.fillStyle(depth > 0.62 ? COLOR.blue : COLOR.cyan, 1);
    const dashes = Math.max(1, Math.round(7 - depth * 4));
    for (let d = 0; d < dashes; d++) {
      const x = Math.floor(rng() * (w - 14));
      const len = 3 + Math.floor(rng() * 9);
      g.fillRect(x, y, len, 1);
    }
  }
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}
