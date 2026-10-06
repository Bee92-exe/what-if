import { PALETTE } from '../config.js';


export function charToColor(ch) {
  if (ch === '.' || ch === undefined) return null;
  const idx = parseInt(ch, 16);
  if (Number.isNaN(idx) || idx < 0 || idx >= PALETTE.length) return null;
  const hex = PALETTE[idx];
  return parseInt(hex.slice(1), 16);
}

export function validateSprite(rows, name = 'sprite') {
  const bad = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      if (charToColor(ch) === null) bad.push(`${name}[${y}][${x}]='${ch}'`);
    }
  });
  return bad;
}
