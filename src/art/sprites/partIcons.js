import { PALETTE, ART_SCALE } from '../../config.js';


export const K = {
  black: 0,
  navy: 1,
  blue: 2,
  cyan: 3,
  ice: 4,
  white: 5,
  teal: 6,
  green: 7,
  gold: 8,
  orange: 9,
  red: 10,
  metal: 15,
};

export const ICON_SIZE = 24;

function box(x, y, w, h, fill, line = K.metal) {
  return [
    [x, y, w, h, line],
    [x + 1, y + 1, w - 2, h - 2, fill],
  ];
}

function disc(cx, cy, r, color) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) {
    const span = Math.floor(Math.sqrt(r * r - dy * dy));
    out.push([cx - span, cy + dy, span * 2 + 1, 1, color]);
  }
  return out;
}

function panel(x, y, w, h, lines = 2) {
  const out = [
    [x, y, w, h, K.metal],
    [x + 1, y + 1, w - 2, h - 2, K.blue],
  ];
  for (let i = 1; i <= lines; i++) {
    out.push([x + 1, y + Math.round((i * h) / (lines + 1)), w - 2, 1, K.cyan]);
  }
  return out;
}

function jar(x, y, w, h, bars) {
  const out = [[x + w / 2 - 2, y - 2, 4, 2, K.gold], ...box(x, y, w, h, K.ice)];
  const inner = h - 4;
  const step = Math.floor(inner / (bars + 1));
  for (let i = 1; i <= bars; i++) {
    out.push([x + 3, y + 2 + i * step, w - 6, 2, K.gold]);
  }
  return out;
}

function waves(x, y, count, long = false) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const len = (long ? 6 : 4) - i * 2;
    if (len < 1) break;
    const px = Math.min(x + i * 3, ICON_SIZE - len);
    out.push([px, y - len + 1 - i, len, 2, K.teal]);
  }
  return out;
}

function dish(cx, cy, r) {
  return [
    ...disc(cx, cy, r, K.white),
    ...disc(cx, cy + 1, r - 1, K.cyan),
    [cx - 1, cy - r - 2, 2, 3, K.gold],
  ];
}

function cloud(x, y) {
  return [...disc(x, y, 2, K.white), ...disc(x + 4, y - 1, 3, K.white), ...disc(x + 9, y, 2, K.white)];
}

export const PART_ICONS = {
  bus6u: {
    px: [
      ...box(7, 6, 10, 12, K.ice),
      [10, 10, 2, 3, K.cyan],
      [14, 10, 2, 3, K.cyan],
    ],
  },
  bus12u: {
    px: [
      ...box(5, 5, 14, 15, K.ice),
      [9, 10, 3, 3, K.cyan],
      [15, 10, 3, 3, K.cyan],
      [6, 17, 12, 1, K.gold],
    ],
  },
  bus27u: {
    px: [
      ...box(3, 4, 18, 17, K.ice),
      [7, 9, 3, 3, K.cyan],
      [13, 9, 3, 3, K.cyan],
      [10, 14, 3, 3, K.cyan],
      [4, 18, 16, 1, K.gold],
    ],
  },
  panels_body: {
    px: [
      ...panel(2, 8, 6, 9, 1),
      ...panel(16, 8, 6, 9, 1),
      ...box(8, 7, 8, 11, K.ice),
      [13, 12, 2, 2, K.cyan],
    ],
  },
  panels_deployable: {
    px: [
      ...panel(0, 7, 10, 11, 2),
      ...panel(14, 7, 10, 11, 2),
      [10, 6, 4, 13, K.metal],
      [11, 7, 2, 11, K.ice],
      [9, 11, 1, 3, K.gold],
      [14, 11, 1, 3, K.gold],
    ],
  },
  battery_40: {
    px: [...jar(7, 7, 10, 13, 1)],
  },
  battery_100: {
    px: [...jar(5, 5, 14, 17, 3)],
  },
  comms_uhf: {
    px: [
      [11, 4, 2, 14, K.metal],
      [9, 16, 6, 4, K.ice],
      [10, 17, 1, 2, K.cyan],
      ...waves(14, 11, 1),
    ],
  },
  comms_sband: {
    px: [
      [11, 16, 2, 6, K.metal],
      [9, 14, 6, 3, K.ice],
      ...dish(12, 8, 6),
      ...waves(19, 11, 2),
    ],
  },
  comms_xband: {
    px: [
      [12, 19, 3, 4, K.metal],
      [9, 17, 9, 3, K.ice],
      ...dish(11, 9, 6),
      ...waves(17, 14, 2, true),
    ],
  },
  camera_visible: {
    px: [
      ...box(4, 5, 16, 15, K.ice),
      ...disc(12, 12, 5, K.metal),
      ...disc(12, 12, 4, K.cyan),
      [10, 10, 2, 2, K.white],
      [5, 6, 3, 2, K.gold],
    ],
  },
  thermal_ir: {
    px: [
      ...box(4, 5, 16, 15, K.metal),
      ...disc(12, 12, 5, K.black),
      ...disc(12, 12, 4, K.red),
      ...disc(12, 11, 2, K.orange),
      [10, 10, 2, 2, K.gold],
    ],
  },
  sar_small: {
    px: [
      [10, 14, 4, 8, K.metal],
      [5, 12, 14, 4, K.ice],
      ...disc(12, 6, 6, K.white),
      ...disc(12, 7, 4, K.blue),
      ...waves(17, 10, 2),
      ...cloud(2, 12),
    ],
  },
  star_tracker: {
    px: [
      ...box(7, 10, 14, 8, K.ice),
      [19, 12, 3, 4, K.cyan],
      [8, 14, 2, 2, K.metal],
      [3, 3, 1, 1, K.gold],
      [2, 4, 3, 1, K.gold],
      [3, 5, 1, 1, K.gold],
      [4, 4, 1, 3, K.gold],
    ],
  },
  rad_shield: {
    px: [
      ...disc(12, 3, 3, K.gold),
      [10, 6, 1, 1, K.orange],
      [13, 6, 1, 1, K.orange],
      [5, 8, 14, 4, K.metal],
      [6, 9, 12, 3, K.teal],
      [7, 12, 10, 3, K.teal],
      [9, 15, 6, 3, K.teal],
      [11, 18, 2, 2, K.teal],
    ],
  },
  thruster: {
    px: [
      ...box(8, 4, 8, 8, K.ice),
      [6, 12, 12, 3, K.metal],
      [8, 15, 8, 3, K.metal],
      [9, 18, 6, 1, K.orange],
      [10, 19, 4, 1, K.gold],
      [11, 20, 2, 1, K.red],
    ],
  },
};

export function partIconKey(part) {
  return part?.icon ?? `part_${part?.id ?? 'unknown'}`;
}

function paletteColor(index) {
  const hex = PALETTE[index] ?? PALETTE[15];
  return parseInt(hex.slice(1), 16);
}

function makeIconTexture(scene, key, spec) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const [x, y, w, h, color] of spec.px) {
    g.fillStyle(paletteColor(color), 1);
    g.fillRect(x, y, w, h);
  }
  g.generateTexture(key, ICON_SIZE, ICON_SIZE);
  g.destroy();
  return key;
}

export function generatePartIcons(scene) {
  const keys = [];
  for (const [id, spec] of Object.entries(PART_ICONS)) {
    const key = `part_${id}`;
    makeIconTexture(scene, key, spec);
    keys.push(key);
  }
  makeIconTexture(scene, 'partBus', PART_ICONS.bus12u);
  return keys;
}

export const ICON_PX = ICON_SIZE * ART_SCALE;
