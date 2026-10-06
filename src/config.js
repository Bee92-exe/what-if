export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const ART_SCALE = 2;

export const PALETTE = [
  '#0d0b1e',
  '#1b1f4a',
  '#2e3f8f',
  '#3fa7d6',
  '#9be3f0',
  '#f4f1de',
  '#2a9d8f',
  '#6ab04c',
  '#f2cc5c',
  '#f28f3b',
  '#e63946',
  '#8c4a2f',
  '#d9a679',
  '#8a5a3b',
  '#4a2b1a',
  '#8d99ae',
];

export const COLOR = {
  spaceBlack: 0x0d0b1e,
  navy: 0x1b1f4a,
  blue: 0x2e3f8f,
  cyan: 0x3fa7d6,
  ice: 0x9be3f0,
  white: 0xf4f1de,
  teal: 0x2a9d8f,
  green: 0x6ab04c,
  gold: 0xf2cc5c,
  orange: 0xf28f3b,
  red: 0xe63946,
  brown: 0x8c4a2f,
  skinLight: 0xd9a679,
  skinMid: 0x8a5a3b,
  hairDark: 0x4a2b1a,
  metal: 0x8d99ae,
};

export const CSS = {
  text: '#f4f1de',
  dim: '#8d99ae',
  accent: '#2a9d8f',
  gold: '#f2cc5c',
  danger: '#e63946',
  ink: '#0d0b1e',
};

export const FONT_MAIN = '"Press Start 2P", monospace';
export const FONT_SIZE = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const TEXT_SPEED_MS = { slow: 32, normal: 16, fast: 8 };

export function typeDelay(settings) {
  return TEXT_SPEED_MS[settings?.textSpeed] ?? TEXT_SPEED_MS.normal;
}

export const SPACE = { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 };

export function statusColor(fraction, { warnAt = 0.8, dangerAt = 0.95 } = {}) {
  if (fraction >= dangerAt) return COLOR.red;
  if (fraction >= warnAt) return COLOR.gold;
  return COLOR.teal;
}
